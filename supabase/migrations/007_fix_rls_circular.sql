-- ==============================================================================================
-- MIGRACIÓN 007: Fix RLS Circular Dependency (organizations ↔ organization_members)
-- Fecha: 2026-03-12
-- Problema: La política de organizations hace un subquery a organization_members,
--           pero organization_members TAMBIÉN tiene RLS. Esto crea una dependencia
--           circular que hace que PostgreSQL no pueda evaluar ninguna de las dos.
-- Solución: Crear una función SECURITY DEFINER que bypasea RLS internamente.
--           Luego reescribir las políticas para usar esa función.
-- ==============================================================================================

-- 1. FUNCIÓN HELPER: Obtiene los org_ids del usuario autenticado
-- SECURITY DEFINER = se ejecuta con los permisos del OWNER de la función (postgres),
-- bypasseando RLS dentro de la función. Es seguro porque solo devuelve org_ids
-- del usuario autenticado (auth.uid()).
CREATE OR REPLACE FUNCTION public.get_auth_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM public.organization_members
    WHERE user_id = auth.uid()
$$;

-- 2. FUNCIÓN HELPER: Obtiene los org_ids donde el usuario es OWNER/ADMIN
CREATE OR REPLACE FUNCTION public.get_auth_user_admin_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM public.organization_members
    WHERE user_id = auth.uid()
    AND role_code IN ('OWNER', 'ADMIN')
$$;

-- 3. FUNCIÓN HELPER: Obtiene los org_ids donde el usuario es OWNER/ADMIN/CASHIER
CREATE OR REPLACE FUNCTION public.get_auth_user_staff_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM public.organization_members
    WHERE user_id = auth.uid()
    AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
$$;

-- 4. FUNCIÓN HELPER: Verifica si el usuario es staff en alguna org
CREATE OR REPLACE FUNCTION public.is_auth_user_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
$$;

-- ==========================================
-- REESCRIBIR POLÍTICAS DE 006 USANDO LAS FUNCIONES HELPER
-- ==========================================

-- == organizations ==
DROP POLICY IF EXISTS "Auth: Miembros ven su propia organizacion" ON public.organizations;
CREATE POLICY "Auth: Miembros ven su propia organizacion"
ON public.organizations FOR SELECT
USING (id IN (SELECT public.get_auth_user_org_ids()));

DROP POLICY IF EXISTS "Auth: Owners actualizan su organizacion" ON public.organizations;
CREATE POLICY "Auth: Owners actualizan su organizacion"
ON public.organizations FOR UPDATE
USING (id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == organization_members ==
-- La self-read policy NO necesita cambiar (no tiene subquery circular)
-- Pero la "Owners ven staff" SÍ hace subquery, hay que arreglarla:
DROP POLICY IF EXISTS "Auth: Owners ven staff de su org" ON public.organization_members;
CREATE POLICY "Auth: Owners ven staff de su org"
ON public.organization_members FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == subscriptions ==
DROP POLICY IF EXISTS "Auth: Miembros ven suscripcion de su org" ON public.subscriptions;
CREATE POLICY "Auth: Miembros ven suscripcion de su org"
ON public.subscriptions FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == billing_history ==
DROP POLICY IF EXISTS "Auth: Owners ven historial de facturacion" ON public.billing_history;
CREATE POLICY "Auth: Owners ven historial de facturacion"
ON public.billing_history FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == campaigns ==
DROP POLICY IF EXISTS "Auth: Miembros ven campañas de su org" ON public.campaigns;
CREATE POLICY "Auth: Miembros ven campañas de su org"
ON public.campaigns FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

DROP POLICY IF EXISTS "Auth: Owners gestionan campañas" ON public.campaigns;
CREATE POLICY "Auth: Owners gestionan campañas"
ON public.campaigns FOR ALL
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == local_rewards ==
DROP POLICY IF EXISTS "Auth: Owners gestionan premios" ON public.local_rewards;
CREATE POLICY "Auth: Owners gestionan premios"
ON public.local_rewards FOR ALL
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == ledger_transactions ==
DROP POLICY IF EXISTS "Auth: Miembros ven transacciones de su org" ON public.ledger_transactions;
CREATE POLICY "Auth: Miembros ven transacciones de su org"
ON public.ledger_transactions FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

DROP POLICY IF EXISTS "Auth: Cajeros crean transacciones" ON public.ledger_transactions;
CREATE POLICY "Auth: Cajeros crean transacciones"
ON public.ledger_transactions FOR INSERT
WITH CHECK (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

-- == wallets ==
DROP POLICY IF EXISTS "Auth: Cajeros crean wallets para clientes" ON public.wallets;
CREATE POLICY "Auth: Cajeros crean wallets para clientes"
ON public.wallets FOR INSERT
WITH CHECK (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

-- == users ==
-- Staff members can read basic details of users who are members of their organizations
DROP POLICY IF EXISTS "Auth: Staff ve usuarios de su org" ON public.users;
CREATE POLICY "Auth: Staff ve usuarios de su org"
ON public.users FOR SELECT
USING (
    id IN (
        SELECT dom.user_id FROM public.organization_members dom
        WHERE dom.org_id IN (SELECT public.get_auth_user_staff_org_ids())
    )
);

DROP POLICY IF EXISTS "Auth: Cajeros crean usuarios ghost" ON public.users;
CREATE POLICY "Auth: Cajeros crean usuarios ghost"
ON public.users FOR INSERT
WITH CHECK (public.is_auth_user_staff());

-- == security_logs ==
DROP POLICY IF EXISTS "Auth: Owners ven logs de seguridad de su org" ON public.security_logs;
CREATE POLICY "Auth: Owners ven logs de seguridad de su org"
ON public.security_logs FOR SELECT
USING (
    target_id IN (SELECT public.get_auth_user_admin_org_ids())
);

-- == api_credentials ==
DROP POLICY IF EXISTS "Auth: Owners gestionan API credentials" ON public.api_credentials;
CREATE POLICY "Auth: Owners gestionan API credentials"
ON public.api_credentials FOR ALL
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code = 'OWNER'
    )
);

-- ==========================================
-- POLÍTICA ADICIONAL: loyalty_rules lectura para staff (faltaba en 006)
-- ==========================================
-- El POS necesita leer loyalty_rules para aplicar multiplicadores
DROP POLICY IF EXISTS "Auth: Staff lee reglas de lealtad de su org" ON public.loyalty_rules;
CREATE POLICY "Auth: Staff lee reglas de lealtad de su org"
ON public.loyalty_rules FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

-- UPDATE para owners (guardar configuración de marketing)
DROP POLICY IF EXISTS "Auth: Owners actualizan reglas de lealtad" ON public.loyalty_rules;
CREATE POLICY "Auth: Owners actualizan reglas de lealtad"
ON public.loyalty_rules FOR UPDATE
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- INSERT para onboarding (crear reglas default al crear negocio)
DROP POLICY IF EXISTS "Auth: Owners crean reglas de lealtad" ON public.loyalty_rules;
CREATE POLICY "Auth: Owners crean reglas de lealtad"
ON public.loyalty_rules FOR INSERT
WITH CHECK (org_id IN (SELECT public.get_auth_user_admin_org_ids()));
