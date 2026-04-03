'use server'

import { createClient } from '@/utils/supabase/server'
import { sanitizeError } from '@/lib/error-sanitizer'

// Interface para las reglas
export interface LoyaltyRules {
    id?: string;
    org_id: string;
    min_hours_between_tx: number;
    max_points_per_transaction: number;
    multiplier_monday: number;
    multiplier_tuesday: number;
    multiplier_wednesday: number;
    multiplier_thursday: number;
    multiplier_friday: number;
    multiplier_saturday: number;
    multiplier_sunday: number;
    hour_start: number;
    hour_end: number;
}

// Valores por defecto
const DEFAULT_RULES: Omit<LoyaltyRules, 'id' | 'org_id'> = {
    min_hours_between_tx: 0,
    max_points_per_transaction: 1000,
    multiplier_monday: 1.0,
    multiplier_tuesday: 1.0,
    multiplier_wednesday: 1.0,
    multiplier_thursday: 1.0,
    multiplier_friday: 1.0,
    multiplier_saturday: 1.0,
    multiplier_sunday: 1.0,
    hour_start: 0,
    hour_end: 23,
}

// ==========================================
// Loyalty Rules (Reglas de Marketing)
// Seguridad: 100% por RLS (auth.uid() policies en 005 + 006)
// ==========================================

/**
 * Obtiene las reglas de lealtad de una organización.
 * RLS: Miembros con OWNER/ADMIN/CASHIER pueden leer (policy 005).
 */
export async function getLoyaltyRules(orgId: string) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autorizado');

        const { data: rules, error } = await supabase
            .from('loyalty_rules')
            .select('*')
            .eq('org_id', orgId)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error("[Marketing] Error fetching rules:", error);
            throw new Error('Error al cargar la configuración');
        }

        if (!rules) {
            return { success: true, data: { org_id: orgId, ...DEFAULT_RULES } as LoyaltyRules };
        }

        return { 
            success: true, 
            data: { 
                ...rules, 
                hour_start: rules.hour_start ?? 0,
                hour_end: rules.hour_end ?? 23
            } as LoyaltyRules 
        };
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'marketing') }
    }
}

/**
 * Actualiza o inserta las reglas de lealtad de una organización.
 * RLS: Solo OWNER/ADMIN pueden escribir (INSERT/UPDATE policies en 005).
 */
export async function updateLoyaltyRules(orgId: string, rulesToUpdate: Partial<LoyaltyRules>) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autorizado');

        // Limpiar campos que no son columnas de la tabla
        const { id, ...cleanRules } = rulesToUpdate as any;

        const payload = {
            org_id: orgId,
            ...cleanRules
        };

        const { error } = await supabase
            .from('loyalty_rules')
            .upsert(payload, { onConflict: 'org_id' });

        if (error) {
            console.error("[Marketing] Error updating rules:", error);
            throw new Error('Error al guardar la configuración');
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'marketing') }
    }
}

// ==========================================
// CRM: Directorio de Clientes B2B
// Seguridad: RLS (auth.uid() policies en 005 + 006)
// ==========================================

/** Ofusca un número de teléfono: 999123456 → ******456 (Seguridad Bancaria) */
function maskPhone(phone: string | null): string {
    if (!phone || phone.length < 6) return 'Oculto';
    return `******${phone.substring(phone.length - 3)}`;
}

/** Ofusca un email: user@email.com → u***@email.com */
function maskEmail(email: string | null): string {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local.charAt(0)}***@${domain}`;
}

/**
 * Obtiene el directorio de clientes (CRM B2B).
 * RLS: OWNER/ADMIN pueden ver wallets (005) + users (005) de su org.
 */
export async function getOrganizationCustomers(
    orgId: string, 
    searchTerm: string = '', 
    page: number = 1, 
    pageSize: number = 50
) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autorizado');

        const offset = (page - 1) * pageSize;

        let query = supabase
            .from('wallets')
            .select(`
                id,
                balance,
                lifetime_earned,
                last_transaction_at,
                created_at,
                users!inner (
                    id,
                    full_name,
                    email,
                    phone,
                    is_registered
                )
            `, { count: 'exact' })
            .eq('org_id', orgId);

        if (searchTerm) {
            // ✅ H-02 FIX: Sanitizar searchTerm para prevenir inyección PostgREST
            // Se eliminan caracteres especiales de PostgREST: (), ., ,, :, !, *
            const sanitized = searchTerm
                .replace(/[().,;:!*\\/%&|"'<>{}[\]]/g, '')
                .trim()
                .substring(0, 100);

            if (sanitized.length > 0) {
                query = query.or(`phone.ilike.%${sanitized}%,full_name.ilike.%${sanitized}%`, { foreignTable: 'users' });
            }
        }

        const { data, error, count } = await query
            .order('balance', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (error) {
            console.error("[CRM] Error fetching customers:", error);
            throw new Error('Error al obtener la base de clientes');
        }

        console.debug(`[CRM] Found ${count} customers for org ${orgId}`);

        const customers = data?.map((w: any) => ({
            walletId: w.id,
            points: w.balance,
            lastActivity: w.last_transaction_at || w.created_at,
            userId: w.users.id,
            fullName: w.users.full_name || 'Cliente Anónimo',
            email: maskEmail(w.users.email),
            phone: maskPhone(w.users.phone),
            isRegistered: w.users.is_registered
        })) || [];

        return { 
            success: true, 
            data: {
                customers,
                totalCount: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize)
            }
        };

    } catch (e: any) {
        console.error("[CRM] Error:", e.message);
        return { success: false, error: sanitizeError(e, 'marketing') }
    }
}
