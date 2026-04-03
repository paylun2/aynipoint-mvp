'use server'

import { createClient } from '@/utils/supabase/server'
import { encryptPhone } from '@/utils/crypto'

/**
 * Server Action para generar el payload encriptado del QR.
 * 
 * La encriptación se ejecuta en el servidor donde QR_ENCRYPTION_KEY está disponible.
 * El cliente solo recibe el string cifrado, nunca la clave.
 */
export async function getEncryptedQRPayload() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return { success: false, error: 'No autorizado' }
        }

        // Buscar teléfono del usuario en public.users (puede ser ghost fusionado)
        const { data: profile } = await supabase
            .from('users')
            .select('phone')
            .eq('auth_user_id', user.id)
            .single()

        const identifier = profile?.phone || user.phone || user.id
        const payload = encryptPhone(identifier)

        if (!payload) {
            return { success: false, error: 'Error al generar el código QR.' }
        }

        return { success: true, payload }
    } catch (e: any) {
        console.error('[Passport] QR generation error:', e.message)
        return { success: false, error: 'Error al generar el código QR.' }
    }
}
