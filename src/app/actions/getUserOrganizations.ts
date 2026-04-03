"use server";

import { createClient } from "@/utils/supabase/server";
import { sanitizeError } from '@/lib/error-sanitizer';

/**
 * Obtiene todas las organizaciones activas del usuario autenticado.
 * RLS: "Auth: Usuarios ven sus propias membresias" (006)
 */
export async function getUserOrganizations() {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: 'No autorizado' };
    }

    // 2. Fetch all active memberships — RLS: self-read (006)
    const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
            id,
            role_code,
            organizations (
                id,
                slug,
                commercial_name,
                created_at,
                status
            )
        `)
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');

    if (error) {
        console.error("[getUserOrgs] Error:", error.message);
        return { success: false, error: sanitizeError(error, 'getUserOrganizations') };
    }

    // 3. Format and sort by creation date (newest first)
    const orgs = memberships
        .map(m => {
            const org = m.organizations as any;
            return {
                id: org.id,
                slug: org.slug,
                name: org.commercial_name,
                role: m.role_code,
                createdAt: org.created_at,
                status: org.status
            };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, data: orgs };
}
