-- ==============================================================================================
-- FIX: Corrección de Políticas RLS para Marketing B2B
-- Problema: Las políticas de loyalty_rules usaban "om.role" pero la columna real es "om.role_code".
-- Problema: No existían políticas B2B para que los dueños vean wallets/users de su organización.
-- ==============================================================================================

-- ==========================================
-- 1. FIX: loyalty_rules — Corregir om.role → om.role_code
-- ==========================================

-- Eliminar las políticas viejas (con el nombre incorrecto del campo)
DROP POLICY IF EXISTS "Lectura de reglas para miembros de la organización" ON public.loyalty_rules;
DROP POLICY IF EXISTS "Modificación de reglas para dueños y administradores" ON public.loyalty_rules;
DROP POLICY IF EXISTS "Inserción de reglas para dueños y administradores" ON public.loyalty_rules;

-- Recrear con la columna correcta: role_code
CREATE POLICY "Lectura de reglas para miembros de la organización"
ON public.loyalty_rules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = loyalty_rules.org_id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

CREATE POLICY "Modificación de reglas para dueños y administradores"
ON public.loyalty_rules FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = loyalty_rules.org_id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN')
    )
);

CREATE POLICY "Inserción de reglas para dueños y administradores"
ON public.loyalty_rules FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = loyalty_rules.org_id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 2. FIX: wallets — Agregar política B2B para que dueños vean las wallets de su org
-- ==========================================

CREATE POLICY "B2B members can view org wallets"
ON public.wallets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = wallets.org_id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- ==========================================
-- 3. FIX: users — Agregar política B2B para que dueños vean datos de clientes con wallet
-- ==========================================

CREATE POLICY "B2B members can view their org customer profiles"
ON public.users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.wallets w
        JOIN public.organization_members om ON om.org_id = w.org_id
        WHERE w.user_id = users.id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 4. Agregar columnas de horario para multiplicadores
-- ==========================================

ALTER TABLE public.loyalty_rules
    ADD COLUMN IF NOT EXISTS hour_start INT NOT NULL DEFAULT 0;

ALTER TABLE public.loyalty_rules
    ADD COLUMN IF NOT EXISTS hour_end INT NOT NULL DEFAULT 23;
