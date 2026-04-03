import { createClient } from '@supabase/supabase-js'

export type SecurityEventType = 
    | 'LOGIN_FAIL' 
    | 'HIGH_VALUE_TX' 
    | 'RATE_LIMIT_EXCEEDED' 
    | 'FRAUD_ATTEMPT' 
    | 'KYB_SUBMITTED'
    | 'DANGEROUS_ACTION';

export type SecuritySeverity = 'INFO' | 'WARN' | 'CRITICAL';

interface LogPayload {
    eventType: SecurityEventType;
    severity?: SecuritySeverity;
    actorUserId?: string; // uuid of the user performing the action
    targetId?: string;    // uuid of affected object (wallet, org, etc.)
    ipAddress?: string;
    metadata?: Record<string, any>;
}

// Inicializamos un ADMIN CLIENT usando el Service Role Key para saltarse el RLS.
// Esto garantiza que el log se escriba independientemente de si el atacante no está autenticado.
const getAdminSupabase = () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return null;
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        }
    );
};

// ✅ L-03 FIX: Webhook Dispatcher para Alarmas de Seguridad
// Filtra campos sensibles antes de enviar a canales externos (Discord, Slack, etc.)
const dispatchWebhookAlarm = async (payload: LogPayload) => {
    const webhookUrl = process.env.DISCORD_SECURITY_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        // Filtrar metadata sensible: nunca enviar IDs internos, tokens, o PII
        const safeMetadata = payload.metadata ? {
            type: payload.metadata.type || 'N/A',
            ...(payload.metadata.reason ? { reason: payload.metadata.reason } : {}),
        } : {};

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🚨 **ALERTA DE SEGURIDAD (${payload.severity})** 🚨\n**Evento:** ${payload.eventType}\n**Actor:** \`[REDACTED]\`\n**Contexto:** \`\`\`json\n${JSON.stringify(safeMetadata, null, 2)}\n\`\`\``
            })
        });
    } catch (e) {
        // ✅ L-02 FIX: Log estructurado en lugar de console.error genérico
        console.error(JSON.stringify({
            level: 'ERROR',
            module: 'security_logger',
            action: 'webhook_dispatch_failed',
            error: e instanceof Error ? e.message : 'Unknown error'
        }));
    }
};

/**
 * Registra un evento de seguridad de forma asíncrona (Fire & Forget)
 * en la tabla inmutable `security_logs`.
 */
export async function logSecurityEvent(payload: LogPayload) {
    const severity = payload.severity || 'INFO';
    
    // 1. Siempre hacer log en la consola de despliegue (Vercel/Sentry)
    console[severity === 'CRITICAL' ? 'error' : severity === 'WARN' ? 'warn' : 'info'](
        `[SECURITY_LOG: ${payload.eventType}]`, payload
    );

    // 2. Disparar Webhook si es Warn o Critical
    if (severity === 'WARN' || severity === 'CRITICAL') {
        // Ejecución en segundo plano sin bloquear el hilo principal
        dispatchWebhookAlarm({ ...payload, severity }).catch(() => {});
    }

    // 3. Escribir en la Base de Datos (WORM - Write Once Read Many)
    const supabaseAdmin = getAdminSupabase();
    if (!supabaseAdmin) {
        console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY no definido. El log de seguridad no se guardó en BD.');
        return;
    }

    try {
        await supabaseAdmin.from('security_logs').insert([{
            event_type: payload.eventType,
            severity: severity,
            actor_user_id: payload.actorUserId,
            target_id: payload.targetId,
            ip_address: payload.ipAddress,
            metadata: payload.metadata
        }]);
    } catch (dbError) {
        console.error('Error insertando en security_logs', dbError);
    }
}
