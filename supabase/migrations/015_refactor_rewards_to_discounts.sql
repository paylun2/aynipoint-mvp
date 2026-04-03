-- ==============================================================================================
-- MIGRACIÓN 015: Evolución de Premios Genéricos -> Descuentos Estrictos
-- Fecha: 2026-03-13
-- Propósito: Reemplazar la tabla genérica `local_rewards` por `b2b_discounts`, un modelo financiero
--            estricto donde los únicos incentivos permitidos son Descuentos con reglas validadas 
--            a nivel de base de datos (Seguridad Bancaria).
-- ==============================================================================================

-- 0. Eliminar tabla anterior (Desarrollo — en producción se haría ALTER TABLE + migración de datos)
DROP TABLE IF EXISTS public.local_rewards CASCADE;

-- 1. Crear tabla de Descuentos B2B
CREATE TABLE public.b2b_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- ═══════ CAMPOS OBLIGATORIOS (Requeridos por el usuario) ═══════
    description TEXT NOT NULL,                                        -- "90% de descuento en lácteos"
    discount_percentage INT NOT NULL,                                 -- 90 (representa 90%)
    max_discount_amount DECIMAL(12,2) NOT NULL,                       -- 20.00 (límite en moneda local)
    min_quantity INT NOT NULL DEFAULT 1,                               -- Stock mínimo a entregar (Ej: 30)
    restrictions TEXT,                                                -- Condiciones legales / productos excluidos

    -- ═══════ CAMPOS COMPLEMENTARIOS (Recomendados para un sistema de lealtad completo) ═══════
    points_cost INT NOT NULL DEFAULT 0,                               -- Cuántos puntos cuesta canjear (0 = sin costo de puntos)
    total_inventory INT NOT NULL DEFAULT 0,                           -- Stock total disponible para canjear
    redeemed_count INT NOT NULL DEFAULT 0,                            -- Cuántos se han canjeado (se incrementa con cada canje)
    expires_at TIMESTAMP WITH TIME ZONE,                              -- Fecha de expiración (NULL = sin expiración)
    
    -- ═══════ ESTADO Y AUDITORÍA ═══════
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id UUID REFERENCES auth.users(id),                -- Quién lo creó (Auditoría)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- ═══════ RESTRICCIONES DE INTEGRIDAD FINANCIERA (Nivel Bancario) ═══════
    CONSTRAINT chk_discount_percentage CHECK (discount_percentage BETWEEN 1 AND 100),
    CONSTRAINT chk_max_discount_positive CHECK (max_discount_amount > 0),
    CONSTRAINT chk_min_quantity_positive CHECK (min_quantity >= 1),
    CONSTRAINT chk_total_inventory_positive CHECK (total_inventory >= 0),
    CONSTRAINT chk_redeemed_not_exceed CHECK (redeemed_count >= 0 AND redeemed_count <= total_inventory),
    CONSTRAINT chk_points_cost_positive CHECK (points_cost >= 0)
);

-- 2. Índices para rendimiento
CREATE INDEX idx_b2b_discounts_org_id ON public.b2b_discounts(org_id);
CREATE INDEX idx_b2b_discounts_active ON public.b2b_discounts(org_id, is_active) WHERE is_active = TRUE;

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION sp_b2b_discounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_b2b_discounts_updated_at
BEFORE UPDATE ON public.b2b_discounts
FOR EACH ROW
EXECUTE FUNCTION sp_b2b_discounts_updated_at();

-- 4. Row Level Security (RLS) — Seguridad Bancaria Estricta
ALTER TABLE public.b2b_discounts ENABLE ROW LEVEL SECURITY;

-- 4a. Lectura Pública de Descuentos Activos (Los clientes necesitan verlos)
CREATE POLICY "Lectura publica de descuentos activos"
ON public.b2b_discounts FOR SELECT
USING (is_active = TRUE);

-- 4b. Lectura Completa para Miembros de la Organización (Incluye inactivos)
CREATE POLICY "Miembros ven todos sus descuentos"
ON public.b2b_discounts FOR SELECT
USING (
    org_id IN (SELECT get_auth_user_org_ids() AS get_auth_user_org_ids)
);

-- 4c. INSERT: Solo OWNER/ADMIN de la Org pueden crear descuentos
CREATE POLICY "Owners crean descuentos"
ON public.b2b_discounts FOR INSERT
WITH CHECK (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- 4d. UPDATE: Solo OWNER/ADMIN de la Org pueden modificar descuentos
CREATE POLICY "Owners actualizan descuentos"
ON public.b2b_discounts FOR UPDATE
USING (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- 4e. DELETE: Solo OWNER/ADMIN de la Org pueden eliminar descuentos
CREATE POLICY "Owners eliminan descuentos"
ON public.b2b_discounts FOR DELETE
USING (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- NOTA: Las funciones `get_auth_user_org_ids()` y `get_auth_user_admin_org_ids()` 
-- fueron creadas en la migración 007_fix_rls_circular.sql y son reutilizadas aquí
-- para mantener consistencia y evitar dependencias circulares en las políticas RLS.
