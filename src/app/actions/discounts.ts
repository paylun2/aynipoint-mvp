"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ═══════ CONSTANTES DE NEGOCIO ═══════
const FREE_PLAN_MAX_DISCOUNTS = 3;

/**
 * Obtiene los descuentos de una organización por slug.
 * RLS: b2b_discounts tiene lectura para miembros (ACTIVE + INACTIVE, no DELETED).
 */
export async function getDiscounts(orgSlug: string) {
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

        // RLS: Miembros solo ven ACTIVE e INACTIVE (DELETED es invisible por policy)
        const { data: discounts, error: discountsError } = await supabase
            .from('b2b_discounts')
            .select('*')
            .eq('org_id', org.id)
            .in('status', ['ACTIVE', 'INACTIVE'])
            .order('created_at', { ascending: false });

        if (discountsError) return { error: 'Error al cargar los descuentos.' };

        return { 
            success: true, 
            data: discounts, 
            planType: org.subscription_tier || 'FREE',
            maxDiscounts: org.subscription_tier === 'PRO' ? 99999 : FREE_PLAN_MAX_DISCOUNTS,
        };
    } catch (error) {
        return { error: 'Error inesperado al cargar los descuentos.' };
    }
}

/**
 * Obtiene los descuentos activos de una organización por su ID.
 * Usado por la wallet B2C para mostrar descuentos disponibles.
 */
export async function getDiscountsByOrgId(orgId: string) {
    const supabase = await createClient();

    try {
        if (!orgId || !/^[0-9a-f-]{36}$/i.test(orgId)) {
            return { error: 'ID de organización inválido.' };
        }

        const { data: discounts, error } = await supabase
            .from('b2b_discounts')
            .select('id, description, discount_percentage, max_discount_amount, min_quantity, restrictions, points_cost, total_inventory, redeemed_count, status, expires_at')
            .eq('org_id', orgId)
            .eq('status', 'ACTIVE')
            .order('discount_percentage', { ascending: false });

        if (error) return { error: 'Error al cargar los detalles del descuento.' };

        // Filtrar descuentos expirados al vuelo
        const now = new Date().toISOString();
        const activeDiscounts = (discounts || []).filter(d => 
            !d.expires_at || d.expires_at > now
        ).map(d => ({
            ...d,
            remaining_stock: d.total_inventory - d.redeemed_count
        }));

        return { success: true, data: activeDiscounts };
    } catch (error) {
        return { error: 'Error inesperado al cargar los descuentos.' };
    }
}

/**
 * Crea un nuevo descuento.
 * RLS: OWNER/ADMIN pueden insertar vía policy "Owners crean descuentos" (015).
 */
export async function createDiscount(formData: FormData) {
    const supabase = await createClient();

    try {
        const orgSlug = formData.get('org_slug') as string;
        const description = (formData.get('description') as string)?.trim();
        const discountPercentage = parseInt(formData.get('discount_percentage') as string, 10);
        const maxDiscountAmount = parseFloat(formData.get('max_discount_amount') as string);
        const minQuantity = parseInt(formData.get('min_quantity') as string, 10);
        const restrictions = (formData.get('restrictions') as string)?.trim() || null;
        const pointsCost = parseInt(formData.get('points_cost') as string, 10);
        const totalInventory = parseInt(formData.get('total_inventory') as string || '0', 10);
        const expiresAt = formData.get('expires_at') as string || null;

        // ═══════ INPUT VALIDATION (Nivel Bancario) ═══════
        if (!orgSlug || !/^[a-z0-9-]+$/i.test(orgSlug)) {
            return { error: 'Slug de organización inválido.' };
        }

        if (!description || description.length < 5 || description.length > 300) {
            return { error: 'La descripción debe tener entre 5 y 300 caracteres.' };
        }

        if (!discountPercentage || isNaN(discountPercentage) || discountPercentage < 1 || discountPercentage > 100) {
            return { error: 'El porcentaje de descuento debe estar entre 1% y 100%.' };
        }

        if (!maxDiscountAmount || isNaN(maxDiscountAmount) || maxDiscountAmount <= 0 || maxDiscountAmount > 999999.99) {
            return { error: 'El límite de descuento debe ser un monto positivo válido.' };
        }

        if (!minQuantity || isNaN(minQuantity) || minQuantity < 1) {
            return { error: 'La cantidad mínima a entregar debe ser al menos 1.' };
        }

        if (restrictions && restrictions.length > 1000) {
            return { error: 'Las restricciones no pueden exceder los 1000 caracteres.' };
        }

        if (!pointsCost || isNaN(pointsCost) || pointsCost < 1) {
            return { error: 'El costo en puntos es obligatorio y debe ser al menos 1.' };
        }

        if (isNaN(totalInventory) || totalInventory < 0) {
            return { error: 'El inventario no puede ser negativo.' };
        }

        // Si se especifica inventario, debe ser >= min_quantity
        if (totalInventory > 0 && totalInventory < minQuantity) {
            return { error: `El inventario (${totalInventory}) no puede ser menor a la cantidad mínima (${minQuantity}).` };
        }

        if (expiresAt) {
            const expDate = new Date(expiresAt);
            if (isNaN(expDate.getTime()) || expDate <= new Date()) {
                return { error: 'La fecha de expiración debe ser una fecha futura válida.' };
            }
        }

        // ═══════ AUTH ═══════
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Sesión no válida.' };

        // Get Org
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, subscription_tier')
            .eq('slug', orgSlug)
            .single();

        if (orgError || !org) return { error: 'Organización no encontrada.' };

        // Verify membership
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
                .from('b2b_discounts')
                .select('id', { count: 'exact', head: true })
                .eq('org_id', org.id)
                .eq('status', 'ACTIVE');

            if (countError) return { error: 'Error al verificar el límite de descuentos.' };

            if ((count ?? 0) >= FREE_PLAN_MAX_DISCOUNTS) {
                return { 
                    error: `Plan FREE: Máximo ${FREE_PLAN_MAX_DISCOUNTS} descuentos activos. Desactiva uno o actualiza a Plan PRO.` 
                };
            }
        }

        // ═══════ INSERT — RLS: "Owners crean descuentos" (015) ═══════
        const { error: insertError } = await supabase
            .from('b2b_discounts')
            .insert({
                org_id: org.id,
                description,
                discount_percentage: discountPercentage,
                max_discount_amount: maxDiscountAmount,
                min_quantity: minQuantity,
                restrictions,
                points_cost: pointsCost,
                total_inventory: totalInventory || minQuantity,
                redeemed_count: 0,
                expires_at: expiresAt || null,
                status: 'ACTIVE',
                created_by_user_id: user.id
            });

        if (insertError) return { error: 'Error al crear el descuento. Verifica los datos e intenta nuevamente.' };

        revalidatePath(`/b2b/${orgSlug}/rewards`);
        return { success: true };

    } catch (error) {
        return { error: 'Error inesperado al crear el descuento.' };
    }
}

/**
 * Activa/Desactiva un descuento existente (toggle entre ACTIVE ↔ INACTIVE).
 * RESTRICCIÓN: Solo disponible para planes PRO o ENTERPRISE.
 * RLS: OWNER/ADMIN pueden actualizar vía policy "Owners actualizan descuentos" (016).
 */
export async function toggleDiscount(discountId: string, orgSlug: string, newStatus: boolean) {
    const supabase = await createClient();

    try {
        if (!discountId || !/^[0-9a-f-]{36}$/i.test(discountId)) {
            return { error: 'ID de descuento inválido.' };
        }

        if (!orgSlug || !/^[a-z0-9-]+$/i.test(orgSlug)) {
            return { error: 'Slug de organización inválido.' };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Sesión no válida.' };

        // ═══════ PLAN ENFORCEMENT (Seguridad Bancaria) ═══════
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, subscription_tier')
            .eq('slug', orgSlug)
            .single();

        if (orgError || !org) return { error: 'Organización no encontrada.' };

        const planType = org.subscription_tier || 'FREE';
        if (planType === 'FREE') {
            return { error: 'La función de activar/desactivar descuentos requiere Plan PRO o Enterprise.' };
        }

        // Toggle entre ACTIVE e INACTIVE (NUNCA toca DELETED)
        const targetStatus = newStatus ? 'ACTIVE' : 'INACTIVE';

        const { error } = await supabase
            .from('b2b_discounts')
            .update({ status: targetStatus })
            .eq('id', discountId)
            .eq('org_id', org.id) // Aislamiento: solo descuentos de ESTA org
            .in('status', ['ACTIVE', 'INACTIVE']); // Safety: nunca resucita un DELETED

        if (error) return { error: 'Error al actualizar el descuento.' };

        revalidatePath(`/b2b/${orgSlug}/rewards`);
        return { success: true };
    } catch (error) {
        return { error: 'Error inesperado.' };
    }
}

/**
 * Soft Delete: Marca un descuento como DELETED (no se elimina físicamente).
 * Disponible para TODOS los planes (FREE, PRO, ENTERPRISE).
 * Seguridad Bancaria: 
 *   - Los datos NUNCA se eliminan de la BD (inmutabilidad para auditorías)
 *   - Se registra quién eliminó y cuándo (trazabilidad completa)
 *   - Los registros DELETED son invisibles para la app pero persisten en la BD
 */
export async function deleteDiscount(discountId: string, orgSlug: string) {
    const supabase = await createClient();

    try {
        if (!discountId || !/^[0-9a-f-]{36}$/i.test(discountId)) {
            return { error: 'ID de descuento inválido.' };
        }

        if (!orgSlug || !/^[a-z0-9-]+$/i.test(orgSlug)) {
            return { error: 'Slug de organización inválido.' };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Sesión no válida.' };

        // ═══════ VERIFICACIÓN DE MEMBRESÍA (Seguridad Bancaria) ═══════
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
            .single();

        if (orgError || !org) return { error: 'Organización no encontrada.' };

        const { data: membership } = await supabase
            .from('organization_members')
            .select('role_code')
            .eq('user_id', user.id)
            .eq('org_id', org.id)
            .single();

        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role_code)) {
            return { error: 'Solo el propietario o administrador puede eliminar descuentos.' };
        }

        // ═══════ SOFT DELETE (Seguridad Bancaria — Inmutabilidad de Datos) ═══════
        // En lugar de DELETE físico, marcamos como DELETED con registro de auditoría
        const { error } = await supabase
            .from('b2b_discounts')
            .update({ 
                status: 'DELETED',
                deleted_at: new Date().toISOString(),
                deleted_by_user_id: user.id
            })
            .eq('id', discountId)
            .eq('org_id', org.id)
            .in('status', ['ACTIVE', 'INACTIVE']); // Safety: no puede "re-eliminar" uno ya eliminado

        if (error) return { error: 'Error al eliminar el descuento.' };

        revalidatePath(`/b2b/${orgSlug}/rewards`);
        return { success: true };
    } catch (error) {
        return { error: 'Error inesperado al eliminar.' };
    }
}
