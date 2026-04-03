'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { cleanPhoneNumber, validatePhoneFormat, getPhoneFormatErrorMessage } from '@/lib/phone-validation'
import { rateLimitPos, redis } from '@/lib/redis'
import { logSecurityEvent } from '@/lib/logger'
import { sanitizeError } from '@/lib/error-sanitizer'

/**
 * Procesa una transacción POS (EARN o REDEEM).
 * Seguridad 100% RLS: auth.uid() policies en 005 + 006.
 * 
 * RLS involucradas:
 * - organizations: "Auth: Miembros ven su propia organizacion"
 * - organization_members: "Auth: Usuarios ven sus propias membresias"
 * - users: "Auth: Cajeros crean usuarios ghost" (INSERT)
 * - wallets: B2B read (005) + "Auth: Cajeros crean wallets para clientes" (INSERT 006)
 * - loyalty_rules: B2B CASHIER read (005)
 * - ledger_transactions: "Auth: Cajeros crean transacciones" (INSERT 006)
 */
export async function processPosTransaction(
    orgSlug: string,
    phone: string,
    pointsToProcess: number,
    type: 'EARN' | 'REDEEM',
    securityToken?: string,
    rewardId?: string,
    rewardTitle?: string
) {
    const supabase = await createClient()

    try {
        // 0. AUTH & RBAC SECURITY CHECK
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('No estás conectado al sistema B2B')

        // 0.5 RATE LIMITING (Anti-DDoS / Anti-Farming)
        if (rateLimitPos) {
            const reqHeaders = await headers(); // Next.js 15+ headers await
            const ip = reqHeaders.get('x-forwarded-for') ?? '127.0.0.1';
            // Limit based on Org + User ID to prevent a single cashier from spamming points
            const identifier = `${orgSlug}:${user.id}:${ip}`;
            const { success } = await rateLimitPos.limit(identifier);
            if (!success) {
                await logSecurityEvent({
                    eventType: 'RATE_LIMIT_EXCEEDED',
                    severity: 'WARN',
                    actorUserId: user.id,
                    targetId: orgSlug,
                    ipAddress: ip,
                    metadata: { type, pointsToProcess, endpoint: '/api/pos' }
                });
                return { success: false, error: '⚠️ Regla de Seguridad: Has excedido el límite de emisión de puntos permitido por minuto. Por favor, espera un momento para evitar saturación de red.' }
            }
        }

        // 1. Get Organization ID and Country from slug
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select(`
                id, 
                country,
                country_phone_rules:country (
                    country_code,
                    country_name,
                    dial_code,
                    phone_length,
                    phone_regex,
                    example_number
                )
            `)
            .eq('slug', orgSlug)
            .single()

        if (orgError || !org) throw new Error('Organización no encontrada')
        const orgId = org.id

        // ============================================================
        // 🔒 FASE 6: KILL-SWITCH — Bloqueo de POS en Plan FREE
        // Si el negocio es FREE y tiene >= 100 usuarios fantasma,
        // la caja queda inhabilitada hasta que actualicen a PRO.
        // ============================================================
        if (type === 'EARN') {
            const { data: orgData } = await supabase
                .from('organizations')
                .select('subscription_tier')
                .eq('id', orgId)
                .single()

            if (orgData?.subscription_tier === 'FREE' || !orgData?.subscription_tier) {
                const { count: ghostCount } = await supabase
                    .from('wallets')
                    .select('id', { count: 'exact', head: true })
                    .eq('org_id', orgId);

                const FREE_PLAN_LIMIT = 100;
                if ((ghostCount || 0) >= FREE_PLAN_LIMIT) {
                    await logSecurityEvent({
                        eventType: 'DANGEROUS_ACTION',
                        severity: 'INFO',
                        actorUserId: user.id,
                        targetId: orgSlug,
                        metadata: { type: 'POS_KILL_SWITCH', ghostCount, limit: FREE_PLAN_LIMIT }
                    });
                    return {
                        success: false,
                        error: `🔒 Límite del Plan Gratuito Alcanzado (${ghostCount}/${FREE_PLAN_LIMIT} clientes). Para seguir emitiendo puntos, actualiza tu suscripción a Plan PRO.`,
                        killSwitch: true
                    }
                }
            }
        }
        
        // Extract country rule (supabase join returns an array or single object depending on relationship)
        const countryRule = Array.isArray(org.country_phone_rules) ? org.country_phone_rules[0] : org.country_phone_rules;

        // 1.2 Validate and Clean Phone Number MUST happen before doing anything with the user
        const cleanedPhone = cleanPhoneNumber(phone);
        
        if (countryRule && !validatePhoneFormat(cleanedPhone, countryRule)) {
            return {
                success: false,
                error: getPhoneFormatErrorMessage(countryRule)
            }
        }

        // 1.5 Verify Membership (With Upstash Redis Cache TTL 5 mins)
        let membership = null;
        const cacheKey = `b2b_session:${user.id}:org:${orgId}`;
        
        // ✅ H-03 FIX: Para REDEEM (involucra valor monetario), siempre consultar BD directamente.
        // Un cajero desactivado podría seguir canjeando puntos usando el cache.
        const shouldBypassCache = type === 'REDEEM';

        if (redis && !shouldBypassCache) {
            membership = await redis.get<{ id: string, status: string, role_code: string }>(cacheKey);
        }

        if (!membership) {
            const { data: memData, error: memError } = await supabase
                .from('organization_members')
                .select('id, status, role_code')
                .eq('org_id', orgId)
                .eq('user_id', user.id)
                .single()

            if (memError || !memData || memData.status !== 'ACTIVE') {
                // Si estaba en cache pero ya no es activo, limpiar cache
                if (redis) await redis.del(cacheKey);
                throw new Error('Aviso de Seguridad: No tienes permisos activos para operar en esta sucursal.')
            }
            membership = memData;
            
            // Save to Redis for 5 minutes (300 seconds) — solo para EARN
            if (redis && !shouldBypassCache) {
                await redis.setex(cacheKey, 300, membership);
            }
        } else if (membership.status !== 'ACTIVE') {
            if (redis) await redis.del(cacheKey);
            throw new Error('Aviso de Seguridad: No tienes permisos activos para operar en esta sucursal.')
        }

        // 2. Find or Create Customer User by phone
        let { data: customerUser } = await supabase
            .from('users')
            .select('id')
            .eq('phone', cleanedPhone)
            .single()

        let customerUserId = customerUser?.id

        // Para REDEEM: el usuario DEBE existir (no crear fantasmas)
        if (!customerUser && type === 'REDEEM') {
            return { success: false, error: 'Cliente no encontrado. Verifica el número de celular.' }
        }

        // Para EARN: crear ghost user si no existe — RLS: "Auth: Cajeros crean usuarios ghost" (006)
        if (!customerUser && type === 'EARN') {
            const { data: newCustomerUser, error: createError } = await supabase
                .from('users')
                .insert([{ phone: cleanedPhone, is_registered: false }])
                .select('id')
                .single()

            if (createError) {
                console.error('[POS] Create User Error:', createError.message)
                throw new Error('Error al registrar usuario')
            }
            customerUserId = newCustomerUser.id
        }

        // 3. Find or Create Wallet
        let { data: wallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', customerUserId)
            .eq('org_id', orgId)
            .single()

        let walletId = wallet?.id
        let balance = wallet?.balance ?? 0

        // Para REDEEM: la wallet DEBE existir con saldo
        if (!wallet && type === 'REDEEM') {
            return { success: false, error: 'Este cliente no tiene billetera en esta tienda.' }
        }

        // Para EARN: crear wallet si no existe — RLS: "Auth: Cajeros crean wallets para clientes" (006)
        if (!wallet && type === 'EARN') {
            const { data: newWallet, error: createWalletError } = await supabase
                .from('wallets')
                .insert([{ user_id: customerUserId, org_id: orgId, balance: 0, lifetime_earned: 0 }])
                .select('id, balance')
                .single()

            if (createWalletError) throw new Error('Error al crear billetera')
            walletId = newWallet.id
            balance = newWallet.balance
        }

        // 4. Fetch Loyalty Rules (Marketing & Anti-Fraud)
        let finalPointsAmount = pointsToProcess;
        let pointsGenerated = pointsToProcess;
        let appliedMultiplier = 1.0;

        const { data: rules } = await supabase
            .from('loyalty_rules')
            .select('*')
            .eq('org_id', orgId)
            .single()

        if (rules) {
            // Anti-Fraud: Max Points Per Transaction
            if (type === 'EARN' && pointsToProcess > rules.max_points_per_transaction) {
                await logSecurityEvent({
                    eventType: 'FRAUD_ATTEMPT',
                    severity: 'CRITICAL',
                    actorUserId: user.id,
                    targetId: walletId || orgId,
                    metadata: { type: 'MAX_POINTS_BREACH', attempted: pointsToProcess, allowed: rules.max_points_per_transaction }
                });
                return { 
                    success: false, 
                    error: `⚠️ Seguridad: No puedes otorgar más de ${rules.max_points_per_transaction} puntos en una sola transacción. Habla con el administrador o corrige el monto.` 
                }
            }

            // Anti-Farming: Minimum Hours Between Transactions (mismo wallet)
            // Solo aplica si el admin configuró min_hours_between_tx > 0 en Marketing.
            // Default = 0 (desactivado) → no rompe flujo existente.
            if (type === 'EARN' && rules.min_hours_between_tx > 0 && walletId) {
                const { data: lastTx } = await supabase
                    .from('ledger_transactions')
                    .select('created_at')
                    .eq('wallet_id', walletId)
                    .eq('type', 'EARN')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (lastTx) {
                    const hoursSinceLast = (Date.now() - new Date(lastTx.created_at).getTime()) / (1000 * 60 * 60);
                    if (hoursSinceLast < rules.min_hours_between_tx) {
                        const hoursRemaining = Math.ceil(rules.min_hours_between_tx - hoursSinceLast);
                        await logSecurityEvent({
                            eventType: 'FRAUD_ATTEMPT',
                            severity: 'WARN',
                            actorUserId: user.id,
                            targetId: walletId,
                            metadata: { type: 'MIN_HOURS_VIOLATION', hoursSinceLast: Math.round(hoursSinceLast * 10) / 10, required: rules.min_hours_between_tx }
                        });
                        return {
                            success: false,
                            error: `⚠️ Protección Anti-Fraude: Este cliente ya recibió puntos recientemente. Debe esperar ${hoursRemaining}h más antes de la siguiente emisión.`
                        };
                    }
                }
            }

            // Marketing: Daily Multipliers (Only for EARN)
            if (type === 'EARN') {
                const now = new Date();
                const dayOfWeek = now.getDay();
                const currentHour = now.getHours();

                // Determinar multiplicador del día
                switch (dayOfWeek) {
                    case 0: appliedMultiplier = Number(rules.multiplier_sunday); break;
                    case 1: appliedMultiplier = Number(rules.multiplier_monday); break;
                    case 2: appliedMultiplier = Number(rules.multiplier_tuesday); break;
                    case 3: appliedMultiplier = Number(rules.multiplier_wednesday); break;
                    case 4: appliedMultiplier = Number(rules.multiplier_thursday); break;
                    case 5: appliedMultiplier = Number(rules.multiplier_friday); break;
                    case 6: appliedMultiplier = Number(rules.multiplier_saturday); break;
                }

                // Validar rango horario: solo aplica si la hora actual está dentro del rango configurado
                const hourStart = rules.hour_start ?? 0;
                const hourEnd = rules.hour_end ?? 23;
                const inTimeRange = currentHour >= hourStart && currentHour <= hourEnd;

                if (appliedMultiplier > 1.0 && inTimeRange) {
                    finalPointsAmount = Math.floor(pointsToProcess * appliedMultiplier);
                    pointsGenerated = finalPointsAmount;
                } else {
                    // Fuera de horario o sin multiplicador: x1 estándar
                    appliedMultiplier = 1.0;
                }
            }
        }

        // Para REDEEM: Validate balance
        if (type === 'REDEEM' && balance < finalPointsAmount) {
            return { success: false, error: `Saldo insuficiente. El cliente tiene ${balance} pts y necesita ${finalPointsAmount} pts.` }
        }

        // 5. Insert into ledger — RLS: "Auth: Cajeros crean transacciones" (006)
        const transactionAmount = type === 'EARN' ? finalPointsAmount : -finalPointsAmount
        const newBalance = balance + transactionAmount

        const { error: txError } = await supabase
            .from('ledger_transactions')
            .insert([{
                wallet_id: walletId,
                org_id: orgId,
                type: type,
                amount: transactionAmount,
                balance_snapshot: newBalance,
                created_by_member_id: membership.id,
                description: type === 'REDEEM' && rewardTitle 
                    ? `Canje: ${rewardTitle}` 
                    : `Transacción desde POS (Terminal)`,
                // Transparencia Financiera: Registrar multiplicador aplicado
                // Solo se graba cuando hay multiplicador > 1.0 (días de promoción)
                // Transacciones normales (x1) mantienen metadata vacía
                metadata: appliedMultiplier > 1.0 ? {
                    base_amount: pointsToProcess,
                    multiplier: appliedMultiplier,
                    multiplier_day: new Date().toLocaleDateString('es-PE', { weekday: 'long' })
                } : {}
            }])

        if (txError) {
            console.debug('[POS] TX Error:', txError);
            throw new Error('Error procesando transacción financiera');
        }

        // El balance se actualiza via trigger 'sp_update_wallet_balance'
        revalidatePath(`/b2b/${orgSlug}/dashboard`, 'page');
        revalidatePath(`/b2b/${orgSlug}/pos`, 'page');

        return {
            success: true,
            data: {
                newBalance: newBalance,
                walletId,
                pointsGenerated: pointsGenerated 
            }
        }

    } catch (err: any) {
        console.error('POS Action Error:', err)
        return { success: false, error: sanitizeError(err, 'pos') }
    }
}
