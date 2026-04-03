'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sanitizeError } from '@/lib/error-sanitizer'

/**
 * Obtiene el perfil del usuario autenticado desde la tabla public.users.
 * Busca por auth_user_id (no por users.id) para soportar identidades fusionadas.
 * RLS: users B2C self-read (005) — users where auth_user_id = auth.uid()
 */
export async function getUserProfile() {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuario no autenticado')

        // Buscar por auth_user_id (vinculado durante Identity Fusion)
        const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()

        if (error || !userProfile) {
            // Fallback: buscar por id (para usuarios B2B que no pasaron por fusión)
            const { data: fallbackProfile, error: fallbackError } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

            if (fallbackError || !fallbackProfile) {
                throw new Error('Perfil no encontrado.')
            }

            return {
                success: true,
                data: {
                    ...fallbackProfile,
                    email: user.email
                }
            }
        }

        return {
            success: true,
            data: {
                ...userProfile,
                email: user.email
            }
        }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'profile') }
    }
}

/**
 * Elimina la cuenta del usuario (Soft Delete + Auth Hard Delete).
 * REQUIERE supabaseAdmin por:
 * 1. Soft-delete en public.users (UPDATE con is_anonymized, borrado de PII)
 * 2. Hard-delete de auth.users via admin.deleteUser() (API privilegiada)
 */
export async function deleteUserAccount() {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autenticado')

        // Buscar primero por auth_user_id, luego fallback a id
        let userId: string | null = null

        const { data: byAuth } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()

        if (byAuth) {
            userId = byAuth.id
        } else {
            userId = user.id
        }

        // Soft Delete in 'users' table
        await supabaseAdmin
            .from('users')
            .update({
                is_anonymized: true,
                deleted_at: new Date().toISOString(),
                phone: null,
                email: null,
                full_name: 'Anónimo',
                avatar_url: null
            })
            .eq('id', userId)

        // Hard delete from auth.users (admin API only)
        await supabaseAdmin.auth.admin.deleteUser(user.id)

        return { success: true }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'profile') }
    }
}

/**
 * Reclama una cuenta fantasma por número de teléfono.
 * ✅ M-05 FIX: Función BLOQUEADA. El flujo seguro de fusión de identidad
 * se realiza exclusivamente a través de /vincular con verificación OTP.
 * Mantener el export para no romper imports, pero bloquear ejecución.
 * @deprecated BLOQUEADO — usar el flujo /vincular con OTP
 */
export async function claimShadowAccount(_phone: string) {
    return {
        success: false,
        error: 'Esta función ha sido deshabilitada por razones de seguridad. ' +
               'Usa el flujo de vinculación segura desde la página /vincular.'
    }
}
