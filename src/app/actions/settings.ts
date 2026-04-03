'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/error-sanitizer'

/**
 * Fetch complete Organization data for Settings.
 * RLS: "Auth: Miembros ven su propia organizacion" + self-read members (006)
 */
export async function getOrganizationSettings(orgSlug: string) {
    const supabase = await createClient()

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('No estás conectado')

        // Fetch Org — RLS: members see their own org (006)
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('slug', orgSlug)
            .single()

        if (orgError || !org) throw new Error('Organización no encontrada')

        // Permission Check — RLS: self-read (006)
        const { data: membership, error: memError } = await supabase
            .from('organization_members')
            .select('role_code')
            .eq('org_id', org.id)
            .eq('user_id', user.id)
            .eq('status', 'ACTIVE')
            .single()

        if (memError || !membership) throw new Error('No tienes acceso a este negocio')
        if (membership.role_code === 'CASHIER') throw new Error('Los cajeros no pueden ver los ajustes del negocio')

        return { success: true, data: org, role: membership.role_code }
    } catch (error: any) {
        return { success: false, error: sanitizeError(error, 'settings') }
    }
}

/**
 * Update Organization details.
 * RLS: "Auth: Owners actualizan su organizacion" (006)
 * ✅ H-05 FIX: Se resuelve el orgId desde el slug server-side,
 * ignorando cualquier orgId enviado desde el cliente.
 */
export async function updateOrganizationSettings(orgIdOrSlug: string, formData: FormData) {
    const supabase = await createClient()

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('No estás conectado')

        // ✅ H-05 FIX: Resolver la organización por ID o slug, validando membresía
        // Si parece un UUID, buscar por ID; si no, buscar por slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgIdOrSlug);
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq(isUUID ? 'id' : 'slug', orgIdOrSlug)
            .single()

        if (orgError || !org) throw new Error('Organización no encontrada')

        // Permission Check — RLS: self-read (006)
        const { data: membership, error: memError } = await supabase
            .from('organization_members')
            .select('role_code')
            .eq('org_id', org.id)
            .eq('user_id', user.id)
            .eq('status', 'ACTIVE')
            .single()

        if (memError || !membership || membership.role_code !== 'OWNER') {
            throw new Error('Solo el Dueño (OWNER) puede modificar estos datos.')
        }

        const updates = {
            commercial_name: formData.get('commercial_name'),
            legal_name: formData.get('legal_name'),
            tax_id: formData.get('tax_id'),
            category: formData.get('category'),
            address: formData.get('address'),
            city: formData.get('city'),
            country: formData.get('country'),
            website_url: formData.get('website_url'),
            logo_url: formData.get('logo_url'),
            ui_theme: formData.get('ui_theme'),
            brand_color: formData.get('brand_color'),
            updated_at: new Date().toISOString()
        }

        // RLS: "Auth: Owners actualizan su organizacion" (006)
        const { error: updateError } = await supabase
            .from('organizations')
            .update(updates)
            .eq('id', org.id)

        if (updateError) {
            console.error('[Settings] DB update error:', updateError.message);
            throw new Error('Error al guardar los ajustes del negocio.');
        }

        revalidatePath('/b2b', 'layout')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: sanitizeError(error, 'settings') }
    }
}
