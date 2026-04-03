"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

// Cliente anonimo sin dependencias de cookies para soportar Caché Estática en Edge
const getAnonSupabase = () => createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const fetchCachedPublicOrgs = unstable_cache(
    async (category?: string) => {
        const supabase = getAnonSupabase();

        // ✅ H-09 FIX (mejorado): Respetar el Growth Mode del admin.
        // Si KYB está deshabilitado, mostrar TODOS los comercios (incluyendo PENDING_VERIFICATION).
        // Si KYB está habilitado (Strict Mode), solo mostrar ACTIVE/VERIFIED.
        const { data: kybSetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'require_kyb_verification')
            .single();

        const kybRequired = kybSetting?.value === true || kybSetting?.value === 'true';
        const allowedStatuses = kybRequired
            ? ['ACTIVE', 'VERIFIED']
            : ['ACTIVE', 'VERIFIED', 'PENDING_VERIFICATION'];

        let query = supabase
            .from('organizations')
            .select('id, commercial_name, slug, category, logo_url, address, city, brand_color, currency_name, currency_symbol, short_code, likes_count, is_public, ui_theme')
            .in('status', allowedStatuses)
            .order('likes_count', { ascending: false })
            .order('commercial_name', { ascending: true });

        if (category && category !== 'ALL') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) {
            console.debug('[Explore] Cache fetch error:', error.message);
            throw new Error('Error al consultar directorio de comercios');
        }
        return data || [];
    },
    ['public-orgs-dir'],
    { revalidate: 60, tags: ['explore-directory'] }
);

export async function getPublicOrganizations(category?: string) {
    try {
        const data = await fetchCachedPublicOrgs(category);
        return { success: true, data };
    } catch (error) {
        return { error: 'Error inesperado al cargar los comercios en caché Edge.' };
    }
}

const fetchCachedCategories = unstable_cache(
    async () => {
        const supabase = getAnonSupabase();
        const { data, error } = await supabase
            .from('organizations')
            .select('category')
            // Incluir PENDING_VERIFICATION para categorías también (consistencia con directorio)
            .in('status', ['ACTIVE', 'VERIFIED', 'PENDING_VERIFICATION']);

        if (error) {
            console.debug('[Explore] Categories cache error:', error.message);
            throw new Error('Error al consultar categorías');
        }
        return [...new Set((data || []).map(d => d.category).filter(Boolean))];
    },
    ['public-cats-dir'],
    { revalidate: 60, tags: ['explore-categories'] }
);

export async function getPublicCategories() {
    try {
        const data = await fetchCachedCategories();
        return { success: true, data };
    } catch (error) {
        return { error: 'Error inesperado al generar categorías estáticas.' };
    }
}

/**
 * Da o quita un like a una organización.
 * RLS: organization_likes tiene INSERT/DELETE para usuarios autenticados.
 */
export async function toggleLikeOrganization(orgId: string) {
    try {
        const supabase = await createClient();
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { error: 'Debes iniciar sesión para apoyar un negocio.' };
        }

        const { data: existingLike } = await supabase
            .from('organization_likes')
            .select('id')
            .eq('org_id', orgId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingLike) {
            const { error } = await supabase
                .from('organization_likes')
                .delete()
                .eq('id', existingLike.id);
                
            if (error) throw error;
            return { success: true, action: 'REMOVED' };
        } else {
            const { error } = await supabase
                .from('organization_likes')
                .insert({
                    org_id: orgId,
                    user_id: user.id
                });
                
            if (error) throw error;
            return { success: true, action: 'ADDED' };
        }
        
    } catch (error: any) {
        console.debug('[Explore] Like toggle error:', error?.message);
        return { error: 'Ocurrió un error al procesar tu apoyo.' };
    }
}
