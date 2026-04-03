'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logSecurityEvent } from '@/lib/logger'

/**
 * Verifica si el usuario actual cumple con los requisitos Zero-Trust para ser Super-Admin.
 * 1. Debe estar autenticado.
 * 2. Su correo debe pertenecer al dominio corporativo autorizado.
 * 3. (Futuro) Debe tener un nivel de autenticación AAL2 (MFA). 
 */
export async function verifyZeroTrustAdmin() {
    const supabase = await createClient()

    // ✅ SEGURIDAD BANCARIA: getUser() valida el JWT criptográficamente contra el servidor de Supabase.
    // getSession() lee cookies sin verificar, un hacker podría falsificar su identidad.
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return { authorized: false, reason: 'NO_SESSION' }

    // 1. DOMAIN RESTRICTION (Cambiar por el dominio final de la empresa)
    const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || '@aynipoint.com'
    const userEmail = user.email || ''

    if (!userEmail.endsWith(ADMIN_DOMAIN)) {
        await logSecurityEvent({
            eventType: 'FRAUD_ATTEMPT',
            severity: 'CRITICAL',
            actorUserId: user.id,
            metadata: { type: 'UNAUTHORIZED_ADMIN_ACCESS', email: userEmail }
        })
        return { authorized: false, reason: 'INVALID_DOMAIN' }
    }

    // 2. MFA STEP-UP (AAL2) ENFORCEMENT
    // ✅ C-06 FIX: Cuando MFA está forzado, TODOS los usuarios requieren aal2.
    // Un usuario sin factores configurados es RECHAZADO (debe configurar MFA primero).
    const isMfaEnforced = process.env.NEXT_PUBLIC_ENFORCE_MFA === 'true'
    if (isMfaEnforced) {
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (data?.currentLevel !== 'aal2') {
            return { authorized: false, reason: 'MFA_REQUIRED' }
        }
    }

    return { authorized: true, user }
}

export async function getSystemSettings() {
    const { authorized } = await verifyZeroTrustAdmin()
    if (!authorized) return { success: false, error: 'Acceso Denegado (Zero-Trust)' }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'require_kyb_verification')
        .single()

    if (error && error.code !== 'PGRST116') {
        return { success: false, error: 'Error al leer configuraciones globales.' }
    }

    // Si no existe, devolvemos OFF por defecto
    const isKybRequired = data?.value === 'true'

    return {
        success: true,
        data: { require_kyb_verification: isKybRequired }
    }
}

export async function toggleKybVerification(newValue: boolean) {
    const { authorized, user } = await verifyZeroTrustAdmin()
    if (!authorized || !user) return { success: false, error: 'Acceso Denegado (Zero-Trust)' }

    const supabase = await createClient()

    const { error } = await supabase
        .from('system_settings')
        .update({
            value: newValue,  // JSONB boolean (true/false), no string
            updated_by: user.id,
            updated_at: new Date().toISOString()
        })
        .eq('key', 'require_kyb_verification')

    if (error) {
        console.error('[Admin] toggleKyb error:', error.message);
        return { success: false, error: 'Error al actualizar el Master Switch.' }
    }

    await logSecurityEvent({
        eventType: 'DANGEROUS_ACTION',
        severity: 'WARN',
        actorUserId: user.id,
        metadata: { action: 'TOGGLE_GLOBAL_KYB', newValue }
    })

    revalidatePath('/admin', 'page')
    return { success: true }
}
