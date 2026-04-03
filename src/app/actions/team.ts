'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeError } from '@/lib/error-sanitizer'
/**
 * Fetch all members of an organization.
 * RLS: "Auth: Owners ven staff de su org" + self-read (006)
 */
export async function getTeamMembers(orgSlug: string) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autenticado')

        // First get the org id from slug
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single()

        if (orgError) throw new Error('Organización no encontrada')

        // Get current user's role first
        const { data: roleData } = await supabase
            .from('organization_members')
            .select('role_code')
            .eq('org_id', org.id)
            .eq('user_id', user.id)
            .single()

        const currentUserRole = roleData?.role_code || 'CASHIER'

        // Get all members — RLS: "Auth: Owners ven staff de su org" (006)
        const { data: members, error: membersError } = await supabase
            .from('organization_members')
            .select(`
                id,
                role_code,
                status,
                joined_at,
                users (
                    id,
                    full_name,
                    email,
                    phone,
                    avatar_url
                )
            `)
            .eq('org_id', org.id)
            .order('joined_at', { ascending: false })

        if (membersError) throw new Error('Error al obtener los miembros del equipo: ' + membersError.message)

        return { success: true, data: members, currentUserRole }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'team') }
    }
}

/**
 * Update a member's status (e.g., to DISABLED to revoke access).
 * NOTA: Requiere política UPDATE en organization_members (pendiente).
 * Temporalmente usa supabaseAdmin para UPDATE operations.
 */
export async function updateMemberStatus(memberId: string, newStatus: 'ACTIVE' | 'INVITED' | 'DISABLED') {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autenticado')

        // Fetch the org_id AND role of the member being modified
        const { data: targetMember } = await supabase
            .from('organization_members')
            .select('org_id, role_code')
            .eq('id', memberId)
            .single()

        if (!targetMember) throw new Error('Miembro no encontrado')

        // ✅ M-07 FIX: No se puede modificar el status de un OWNER
        if (targetMember.role_code === 'OWNER') {
            throw new Error('Seguridad Bancaria: No se puede deshabilitar al Dueño de la organización.')
        }

        // Verify banking-level permissions
        const { data: currentRole } = await supabase
            .from('organization_members')
            .select('role_code')
            .eq('org_id', targetMember.org_id)
            .eq('user_id', user.id)
            .single()

        if (currentRole?.role_code !== 'OWNER' && currentRole?.role_code !== 'ADMIN') {
            throw new Error('Nivel de Seguridad Bancario: Sólo los administradores o dueños pueden modificar accesos.')
        }

        // NOTA: Necesita política UPDATE en organization_members para OWNER/ADMIN
        // Por ahora usamos admin client para esta operación específica
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('organization_members')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', memberId)

        if (error) throw error

        return { success: true }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'team') }
    }
}

/**
 * Invite a new member.
 * NOTA: Crea un ghost user (si no existe) y lo vincula como INVITED.
 * Requiere admin para INSERT en users (crear phantoms para otros) y INSERT members (invitar a otros).
 */
export async function inviteTeamMember(orgSlug: string, phoneOrEmail: string, roleCode: string = 'CASHIER') {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No autenticado')

        // 1. Get Org ID
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single()

        if (orgError) throw new Error('Organización no encontrada')

        // Verify banking-level permissions
        const { data: currentRole } = await supabase
            .from('organization_members')
            .select('role_code')
            .eq('org_id', org.id)
            .eq('user_id', user.id)
            .single()

        if (currentRole?.role_code !== 'OWNER' && currentRole?.role_code !== 'ADMIN') {
            throw new Error('Nivel de Seguridad Bancario: Sólo los administradores o dueños pueden emitir invitaciones.')
        }

        // ✅ H-01 FIX: Validación de jerarquía de roles — no puedes invitar a alguien de tu mismo nivel o superior
        const ROLE_HIERARCHY: Record<string, number> = { 'OWNER': 4, 'ADMIN': 3, 'MANAGER': 2, 'CASHIER': 1 };
        const inviterLevel = ROLE_HIERARCHY[currentRole?.role_code] || 0;
        const inviteeLevel = ROLE_HIERARCHY[roleCode] || 0;

        if (inviteeLevel >= inviterLevel) {
            throw new Error(`Seguridad Bancaria: No puedes asignar el rol ${roleCode}. Solo puedes invitar roles inferiores al tuyo.`)
        }

        // 2. Check if user exists by phone or email
        let userId: string;
        const isPhone = /^\d+$/.test(phoneOrEmail.replace(/\+/g, ''));

        let userQuery = supabase.from('users').select('id');
        if (isPhone) {
            userQuery = userQuery.eq('phone', phoneOrEmail);
        } else {
            userQuery = userQuery.eq('email', phoneOrEmail.toLowerCase());
        }

        const { data: existingUser } = await userQuery.single();

        if (existingUser) {
            userId = existingUser.id;
        } else {
            // Create phantom user — needs admin for creating users for OTHERS
            const { createAdminClient } = await import('@/utils/supabase/admin')
            const adminClient = createAdminClient()

            const newUserObj: any = { is_registered: false };
            if (isPhone) newUserObj.phone = phoneOrEmail;
            else newUserObj.email = phoneOrEmail.toLowerCase();

            const { data: newUser, error: createError } = await adminClient
                .from('users')
                .insert([newUserObj])
                .select('id')
                .single()

            if (createError) throw new Error('Error creando usuario invitado: ' + createError.message);
            userId = newUser.id;
        }

        // 3. Add to organization_members — needs admin for inviting OTHERS (user_id != auth.uid)
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()

        const { error: inviteError } = await adminClient
            .from('organization_members')
            .insert([{
                org_id: org.id,
                user_id: userId,
                role_code: roleCode,
                status: 'INVITED'
            }])

        if (inviteError) {
            if (inviteError.code === '23505') {
                throw new Error('Este usuario ya es miembro o está invitado.');
            }
            throw new Error('Error al vincular el usuario: ' + inviteError.message);
        }

        return { success: true }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'team') }
    }
}

/**
 * Accept an invitation — sets own membership to ACTIVE.
 * NOTA: Needs UPDATE policy for own membership (pendiente en próxima migración).
 */
export async function acceptInvitation(orgId: string) {
    const supabase = await createClient()

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('No autorizado')

        // Uses admin for UPDATE on own membership (policy needed: UPDATE WHERE user_id = auth.uid())
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminClient = createAdminClient()

        const { error: updateError } = await adminClient
            .from('organization_members')
            .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
            .eq('org_id', orgId)
            .eq('user_id', user.id)
            .eq('status', 'INVITED')

        if (updateError) throw new Error('Error al aceptar la invitación: ' + updateError.message)

        return { success: true }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'team') }
    }
}
