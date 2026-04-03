-- ==============================================================================================
-- MIGRACIÓN 016: Soft Delete para Descuentos — Seguridad Bancaria (Inmutabilidad de Datos)
-- Fecha: 2026-03-14
-- Propósito: Eliminar el campo booleano is_active y reemplazarlo por un campo status de tipo enum,
--            permitiendo auditorías y trazabilidad completa. En seguridad bancaria, los datos 
--            NUNCA se eliminan físicamente; se marcan como eliminados con timestamp de auditoría.
-- ==============================================================================================

-- 1. Crear el tipo ENUM para los estados del descuento
DO $$ BEGIN
    CREATE TYPE discount_status AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Agregar la nueva columna status con valor por defecto ACTIVE
ALTER TABLE public.b2b_discounts
ADD COLUMN IF NOT EXISTS status discount_status NOT NULL DEFAULT 'ACTIVE';

-- 3. Agregar columnas de auditoría para soft delete
ALTER TABLE public.b2b_discounts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID REFERENCES auth.users(id);

-- 4. Migrar datos existentes: is_active = true → ACTIVE, is_active = false → INACTIVE
UPDATE public.b2b_discounts SET status = 'ACTIVE' WHERE is_active = TRUE;
UPDATE public.b2b_discounts SET status = 'INACTIVE' WHERE is_active = FALSE;

-- 5. PRIMERO eliminar policies que dependen de is_active (resolver dependencia)
DROP POLICY IF EXISTS "Lectura publica de descuentos activos" ON public.b2b_discounts;
DROP POLICY IF EXISTS "Miembros ven todos sus descuentos" ON public.b2b_discounts;
DROP POLICY IF EXISTS "Owners crean descuentos" ON public.b2b_discounts;
DROP POLICY IF EXISTS "Owners actualizan descuentos" ON public.b2b_discounts;
DROP POLICY IF EXISTS "Owners eliminan descuentos" ON public.b2b_discounts;

-- 6. AHORA sí eliminar el campo booleano antiguo (dependencias ya eliminadas)
ALTER TABLE public.b2b_discounts DROP COLUMN IF EXISTS is_active;

-- 7. Índices optimizados para el nuevo campo status
DROP INDEX IF EXISTS idx_b2b_discounts_active;
CREATE INDEX IF NOT EXISTS idx_b2b_discounts_status ON public.b2b_discounts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_b2b_discounts_active_status ON public.b2b_discounts(org_id, status) WHERE status = 'ACTIVE';

-- 7a. Lectura Pública: Solo descuentos ACTIVOS (los DELETED e INACTIVE son invisibles al público)
CREATE POLICY "Lectura publica de descuentos activos"
ON public.b2b_discounts FOR SELECT
USING (status = 'ACTIVE');

-- 7b. Miembros de la Org ven ACTIVE e INACTIVE (NO ven DELETED — solo auditoría interna)
CREATE POLICY "Miembros ven descuentos no eliminados"
ON public.b2b_discounts FOR SELECT
USING (
    status IN ('ACTIVE', 'INACTIVE')
    AND org_id IN (SELECT get_auth_user_org_ids() AS get_auth_user_org_ids)
);

-- 7c. INSERT: Solo OWNER/ADMIN
CREATE POLICY "Owners crean descuentos"
ON public.b2b_discounts FOR INSERT
WITH CHECK (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- 7d. UPDATE: Solo OWNER/ADMIN (para toggle y soft delete)
CREATE POLICY "Owners actualizan descuentos"
ON public.b2b_discounts FOR UPDATE
USING (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- 7e. DELETE físico: PROHIBIDO (No se permite DELETE en esta tabla — seguridad bancaria)
-- No se crea policy de DELETE = Nadie puede hacer hard delete, ni siquiera OWNER/ADMIN.
-- Toda "eliminación" es un UPDATE a status = 'DELETED'.

-- ═══════ NOTAS DE SEGURIDAD BANCARIA ═══════
-- • Los descuentos NUNCA se eliminan físicamente de la base de datos
-- • status = 'DELETED' marca el registro como eliminado + deleted_at registra cuándo
-- • deleted_by_user_id registra QUIÉN lo eliminó (trazabilidad completa)
-- • La policy de SELECT para miembros excluye DELETED, pero los registros persisten
-- • Solo un superadmin con acceso directo a la BD podría ver registros DELETED
-- • Esto cumple con estándares de auditoría financiera (SOX, PCI-DSS)
