"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ═══════ CONSTANTES DE NEGOCIO ═══════
const FREE_PLAN_MAX_REWARDS = 3;

/**
 * Obtiene los premios de una organización por slug.
 * RLS: local_rewards tiene lectura pública para activos + gestión B2B via 006.
 * organizations: lectura via membresía (006).
 */
export async function getLocalRewards(orgSlug: string) {
    const supabase = await createClient();

    try {
        if (!orgSlug || !/^[a-z0-9-]+$/i.test(orgSlug)) {
            return { error: 'Slug de organización inválido.' };
        }

        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, subscription_tier')
            .eq('slug', orgSlug)
            .single();

        if (orgError || !org) return { error: 'Organización no encontrada.' };

        const { data: rewards, error: rewardsError } = await supabase
            .from('local_rewards')
            .select('*')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false });

        if (rewardsError) return { error: 'Error al cargar los premios.' };

        return { 
            success: true, 
            data: rewards, 
            planType: org.subscription_tier || 'FREE',
            maxRewards: org.subscription_tier === 'PRO' ? 99999 : FREE_PLAN_MAX_REWARDS,
        };
    } catch (error) {
        return { error: 'Error inesperado al cargar los premios.' };
    }
}

/**
 * Obtiene los premios activos de una organización por su ID.
 * Usado por la wallet B2C para mostrar premios disponibles.
 * RLS: local_rewards tiene lectura pública para activos.
 */
export async function getRewardsByOrgId(orgId: string) {
    const supabase = await createClient();

    try {
        if (!orgId || !/^[0-9a-f-]{36}$/i.test(orgId)) {
            return { error: 'ID de organización inválido.' };
        }

        const { data: rewards, error } = await supabase
            .from('local_rewards')
            .select('id, title, description, points_cost, is_active')
            .eq('org_id', orgId)
            .eq('is_active', true)
            .order('points_cost', { ascending: true });

        if (error) return { error: 'Error al cargar los detalles del premio.' };

        return { success: true, data: rewards || [] };
    } catch (error) {
        return { error: 'Error inesperado al cargar los premios.' };
    }
}

/**
 * Crea un nuevo premio local.
 * RLS: OWNER/ADMIN pueden insertar via policy "Auth: Owners gestionan premios" (006).
 */
export async function createLocalReward(formData: FormData) {
    const supabase = await createClient();

    try {
        const orgSlug = formData.get('org_slug') as string;
        const title = (formData.get('title') as string)?.trim();
        const description = (formData.get('description') as string)?.trim() || null;
        const pointsCost = parseInt(formData.get('points_cost') as string, 10);

        // ═══════ INPUT VALIDATION ═══════
        if (!orgSlug || !/^[a-z0-9-]+$/i.test(orgSlug)) {
            return { error: 'Slug de organización inválido.' };
        }

        if (!title || title.length < 2 || title.length > 100) {
            return { error: 'El título debe tener entre 2 y 100 caracteres.' };
        }

        if (description && description.length > 500) {
            return { error: 'La descripción no puede exceder los 500 caracteres.' };
        }

        if (!pointsCost || isNaN(pointsCost) || pointsCost < 1 || pointsCost > 100000) {
            return { error: 'El costo en puntos debe ser entre 1 y 100,000.' };
        }

        // ═══════ AUTH ═══════
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Sesión no válida.' };

        // Get Org — RLS: miembros ven su propia org (006)
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, subscription_tier')
            .eq('slug', orgSlug)
            .single();

        if (orgError || !org) return { error: 'Organización no encontrada.' };

        // Verify membership — RLS: auto-lectura (006)
        const { data: membership } = await supabase
            .from('organization_members')
            .select('id, role_code')
            .eq('user_id', user.id)
            .eq('org_id', org.id)
            .single();

        if (!membership) return { error: 'No tienes permiso en este comercio.' };

        // ═══════ PLAN LIMIT CHECK ═══════
        const planType = org.subscription_tier || 'FREE';
        if (planType === 'FREE') {
            const { count, error: countError } = await supabase
                .from('local_rewards')
                .select('id', { count: 'exact', head: true })
                .eq('org_id', org.id)
                .eq('is_active', true);

            if (countError) return { error: 'Error al verificar el límite de premios.' };

            if ((count ?? 0) >= FREE_PLAN_MAX_REWARDS) {
                return { 
                    error: `Plan FREE: Máximo ${FREE_PLAN_MAX_REWARDS} premios activos. Desactiva un premio existente o actualiza a Plan PRO para premios ilimitados.` 
                };
            }
        }

        // ═══════ INSERT — RLS: "Auth: Owners gestionan premios" (006) ═══════
        const { error: insertError } = await supabase
            .from('local_rewards')
            .insert({
                org_id: org.id,
                title: title,
                description: description,
                points_cost: pointsCost,
                is_active: true
            });

        if (insertError) return { error: 'Error al crear el premio. Verifica los datos e intenta nuevamente.' };

        revalidatePath(`/b2b/${orgSlug}/rewards`);
        return { success: true };

    } catch (error) {
        return { error: 'Error inesperado al crear el premio.' };
    }
}
