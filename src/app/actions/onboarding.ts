"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { rateLimitOnboarding } from '@/lib/redis';

/**
 * Fetch active countries available for registration
 */
export async function getActiveCountriesAction() {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('country_phone_rules')
            .select('country_code, country_name, dial_code')
            .eq('is_active', true)
            .order('country_name');
            
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        console.error("Error fetching countries:", e);
        return { success: false, data: [] };
    }
}


/**
 * Crea una nueva organización y vincula al usuario como OWNER.
 * Usa Admin client para bypasear RLS durante la creación atómica
 * (org + member + subscription). La seguridad se garantiza verificando
 * la sesión autenticada y el límite de 1 negocio por OWNER.
 */
export async function createOrganizationAction(formData: FormData) {
    const supabase = await createClient();

    try {
        // 1. Get the authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { error: 'No autorizado / No hay sesión activa.' };
        }

        // 🔒 Rate Limiting: 3 creaciones cada 2 min por usuario (anti-bot)
        if (rateLimitOnboarding) {
            const { success: rlOk } = await rateLimitOnboarding.limit(`onboard:${user.id}`);
            if (!rlOk) {
                return { error: 'Demasiados intentos de creación. Espera un momento.' };
            }
        }

        // 1.5. SECURITY CHECK: Ensure user does not already own an active business
        const { data: existingOwnership, error: ownCheckError } = await supabase
            .from('organization_members')
            .select('id')
            .eq('user_id', user.id)
            .eq('role_code', 'OWNER')
            .eq('status', 'ACTIVE')
            .limit(1);

        if (ownCheckError) {
            console.error("Error checking ownership limits:", ownCheckError);
            return { error: 'Error del servidor al validar los límites de tu cuenta.' };
        }

        if (existingOwnership && existingOwnership.length > 0) {
            return { error: 'No puedes crear más de un negocio (Políticas de Prevención de Fraude).' };
        }

        const commercialName = formData.get('commercial_name') as string;
        const legalName = formData.get('legal_name') as string || commercialName;
        const taxId = formData.get('tax_id') as string || null;
        const category = formData.get('category') as string || 'RETAIL';
        const country = formData.get('country') as string || 'PE'; // Default to Perú

        if (!commercialName) {
            return { error: 'El nombre comercial es obligatorio.' };
        }

        // ✅ H-04 FIX: Sufijo criptográficamente seguro (16^8 combinaciones vs 1000)
        const slug = commercialName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + crypto.randomUUID().slice(0, 8);
        const shortCode = commercialName.substring(0, 3).toUpperCase() + '-' + Array.from(crypto.getRandomValues(new Uint16Array(2))).map(n => (n % 10000).toString().padStart(4, '0')).join('').substring(0, 4);

        // 2. Insert into organizations — RLS Protegido (013_restore_onboarding_rls.sql)
        const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert({
                legal_name: legalName,
                commercial_name: commercialName,
                tax_id: taxId,
                category: category,
                country: country,
                short_code: shortCode,
                slug: slug,
                status: 'PENDING_VERIFICATION',
                is_public: false,
                created_by_user_id: user.id
            })
            .select('id')
            .single();

        if (orgError) {
            console.error("[Onboarding] Error creating org:", orgError.message);
            return { error: 'Error al crear la organización. Verifica los datos e intenta nuevamente.' };
        }

        const orgId = orgData.id;

        // 3. Insert into organization_members — RLS Protegido (013_restore_onboarding_rls.sql)
        const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
                org_id: orgId,
                user_id: user.id,
                role_code: 'OWNER',
                status: 'ACTIVE'
            });

        if (memberError) {
            console.error("Error creating member:", memberError);
            return { error: 'Error al vincular el usuario a la organización.' };
        }

        revalidatePath('/b2b', 'layout');
        return { success: true, slug: slug };

    } catch (error: any) {
        console.error("Unexpected error in onboarding:", error);
        return { error: 'Ocurrió un error inesperado al procesar el registro.' };
    }
}
