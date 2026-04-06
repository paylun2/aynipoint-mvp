'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sanitizeError } from '@/lib/error-sanitizer'
import { redis } from '@/lib/redis'

/**
 * Obtiene las wallets del usuario autenticado.
 * Busca primero por auth_user_id (identidad fusionada),
 * con fallback a users.id (usuarios B2B directos).
 * RLS: users B2C self-read + wallets B2C self-read (005)
 */
export async function getUserWallets() {
    const supabase = await createClient()

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('No autorizado')

        // 1. Determinar el ID interno del usuario en public.users
        let internalUserId: string | null = null

        // Primero: buscar por auth_user_id (usuarios fusionados)
        const { data: fusedUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()

        if (fusedUser) {
            internalUserId = fusedUser.id
        } else {
            // Fallback: buscar por id (usuarios B2B directos)
            const { data: directUser } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single()

            if (directUser) {
                internalUserId = directUser.id
            }
        }

        if (!internalUserId) {
            return { success: true, data: [] }
        }

        // 2. Obtener wallets
        const { data: wallets, error: walletError } = await supabase
            .from('wallets')
            .select('id, org_id, balance, last_transaction_at')
            .eq('user_id', internalUserId)
            .order('last_transaction_at', { ascending: false })

        if (walletError) throw walletError

        if (!wallets || wallets.length === 0) {
            return { success: true, data: [] }
        }

        // 3. Obtener datos de las organizaciones
        // Usamos admin client para bypass RLS. El usuario ya demostró (vía RLS de wallets)
        // que es dueño de una wallet en estas orgs. Tiene derecho a leer su metadata básica
        // aunque la org esté PENDING_VERIFICATION y oculta del público general.
        const supabaseAdmin = createAdminClient()
        const orgIds = [...new Set(wallets.map(w => w.org_id))]
        const { data: orgs } = await supabaseAdmin
            .from('organizations')
            .select('id, commercial_name, slug, is_public, status, likes_count, category, logo_url, brand_color')
            .in('id', orgIds)

        const orgMap = new Map((orgs || []).map(o => [o.id, o]))

        // 4. Mapear resultado
        const result = wallets.map(w => {
            const org = orgMap.get(w.org_id)
            return {
                id: w.id,
                org_id: w.org_id,
                balance: w.balance || 0,
                shop_name: org?.commercial_name || 'Comercio',
                slug: org?.slug || 'store',
                is_public: org?.is_public || false,
                status: org?.status || 'PENDING_VERIFICATION',
                likes_count: org?.likes_count || 0,
                category: org?.category || 'OTHER',
                logo_url: org?.logo_url,
                brand_color: org?.brand_color,
                last_transaction_at: w.last_transaction_at
            }
        })

        return { success: true, data: result }

    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'wallet') }
    }
}

/**
 * Obtiene el historial inmutable de transacciones (Ledger) de todas las wallets del usuario.
 */
export async function getUserLedger() {
    const supabase = await createClient()

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('No autorizado')

        // 1. Determinar el ID interno
        let internalUserId: string | null = null

        const { data: fusedUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()

        if (fusedUser) {
            internalUserId = fusedUser.id
        } else {
            const { data: directUser } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single()

            if (directUser) {
                internalUserId = directUser.id
            }
        }

        if (!internalUserId) {
            return { success: true, data: [] }
        }

        // 2. Obtener IDs de las wallets del usuario
        const { data: wallets } = await supabase
            .from('wallets')
            .select('id, org_id')
            .eq('user_id', internalUserId)

        if (!wallets || wallets.length === 0) {
            return { success: true, data: [] }
        }

        const walletIds = wallets.map(w => w.id)

        // 3. Consultar las transacciones del ledger
        const { data: transactions, error: ledgerError } = await supabase
            .from('ledger_transactions')
            .select('*')
            .in('wallet_id', walletIds)
            .order('created_at', { ascending: false })
            .limit(100)

        if (ledgerError) throw ledgerError

        if (!transactions || transactions.length === 0) {
            return { success: true, data: [] }
        }

        // 4. Mapear nombres y logos de los negocios para la UI
        const supabaseAdmin = createAdminClient()
        const orgIds = [...new Set(wallets.map(w => w.org_id))]
        const { data: orgs } = await supabaseAdmin
            .from('organizations')
            .select('id, commercial_name, category, logo_url')
            .in('id', orgIds)
            
        const orgMap = new Map((orgs || []).map(o => [o.id, o]))
        const walletOrgMap = new Map(wallets.map(w => [w.id, w.org_id]))

        // 5. Construir respuesta enriquecida
        const result = transactions.map(tx => {
            const orgId = walletOrgMap.get(tx.wallet_id)
            const org = orgId ? orgMap.get(orgId) : null
            return {
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                description: tx.description,
                created_at: tx.created_at,
                org_name: org?.commercial_name || 'Sistema',
                org_category: org?.category || 'OTHER',
                org_logo: org?.logo_url,
                // Transparencia: multiplicador aplicado (si existe)
                multiplier: tx.metadata?.multiplier ?? null,
                base_amount: tx.metadata?.base_amount ?? null,
            }
        })

        return { success: true, data: result }

    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'wallet') }
    }
}

/**
 * Genera un código de seguridad seguro de 6 caracteres almacenado en Redis (TTL 60s).
 * Enlaza el teléfono del usuario y el premio específico con el token para validación en el POS.
 */
export async function generateSecurityToken(orgId: string, rewardId: string) {
    const supabase = await createClient()

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('No autorizado')

        // Fetch User's Phone from DB
        const { data: userData } = await supabase
            .from('users')
            .select('phone')
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .single()

        if (!userData || !userData.phone) {
            throw new Error('Número de teléfono no encontrado en el perfil.')
        }

        const phone = userData.phone

        // Random 6 Char alphanumeric Code
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        const array = new Uint8Array(6);
        crypto.getRandomValues(array);
        for (let i = 0; i < 6; i++) {
            code += chars[array[i] % chars.length];
        }

        // Store in Redis with TTL 60 seconds
        if (redis) {
            const numericPhone = phone.replace(/\D/g, ''); // Fix para alinear cruce de datos pos vs client
            // El Token ahora guarda el payload json con el UUID de la organización
            const cacheKey = `b2b_token:${orgId}:${numericPhone}`
            const payload = JSON.stringify({ code, rewardId })
            await redis.setex(cacheKey, 60, payload)
        } else {
            console.warn('CRITICAL: Redis is not configured. Tokens are running in MOCK mode.')
        }

        return { success: true, token: code }

    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'wallet_token') }
    }
}
