-- ==============================================================================================
-- MIGRACIÓN 006: Políticas RLS para auth.uid() (Compatibilidad Supabase Auth / Next.js)
-- Fecha: 2026-03-12
-- Propósito: Agregar políticas usando auth.uid() para que los Server Actions de Next.js
--            puedan operar con el cliente normal (sin Service Role), manteniendo seguridad RLS.
-- NOTA: Las políticas existentes de FastAPI (get_current_user_id) NO se eliminan.
--       PostgreSQL evalúa múltiples políticas con OR, así que ambas coexisten.
-- ==============================================================================================

-- ==========================================
-- 1. organization_members — Auto-lectura via auth.uid()
-- ==========================================
-- Permite que un usuario autenticado vea sus propias membresías.
-- Esto habilita: "¿A qué organizaciones pertenezco?" y "¿Cuál es mi rol?"

CREATE POLICY "Auth: Usuarios ven sus propias membresias"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

-- Permite que miembros OWNER/ADMIN vean a todo el staff de su organización
CREATE POLICY "Auth: Owners ven staff de su org"
ON public.organization_members FOR SELECT
USING (
    org_id IN (
        SELECT om.org_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN')
    )
);

-- Permite INSERT para onboarding (crear membresía de OWNER al registrar negocio)
-- NOTA: Solo el Service Role debería insertar en producción, pero lo habilitamos para el flujo de Next.js
CREATE POLICY "Auth: Insertar membresia propia"
ON public.organization_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ==========================================
-- 2. organizations — Lectura via membresía con auth.uid()
-- ==========================================
-- Permite que un miembro vea la organización a la que pertenece.
-- Complementa la política existente que solo muestra orgs públicas/verificadas.

CREATE POLICY "Auth: Miembros ven su propia organizacion"
ON public.organizations FOR SELECT
USING (
    id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);

-- Permite que OWNER/ADMIN actualicen su organización
CREATE POLICY "Auth: Owners actualizan su organizacion"
ON public.organizations FOR UPDATE
USING (
    id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- Permite INSERT para onboarding (crear nuevo negocio)
CREATE POLICY "Auth: Usuarios crean organizaciones"
ON public.organizations FOR INSERT
WITH CHECK (true); -- El control se hace a nivel de aplicación (onboarding flow)

-- ==========================================
-- 3. subscriptions — Lectura via membresía con auth.uid()
-- ==========================================
-- Permite que los miembros de una org vean su suscripción activa.

CREATE POLICY "Auth: Miembros ven suscripcion de su org"
ON public.subscriptions FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 4. billing_history — Lectura via membresía con auth.uid()
-- ==========================================

CREATE POLICY "Auth: Owners ven historial de facturacion"
ON public.billing_history FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 5. campaigns — CRUD via membresía con auth.uid()
-- ==========================================

CREATE POLICY "Auth: Miembros ven campañas de su org"
ON public.campaigns FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

CREATE POLICY "Auth: Owners gestionan campañas"
ON public.campaigns FOR ALL
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 6. local_rewards — CRUD via membresía con auth.uid()
-- ==========================================
-- B2C ya tiene lectura pública (is_active = TRUE).
-- Agregamos gestión B2B para OWNER/ADMIN.

CREATE POLICY "Auth: Owners gestionan premios"
ON public.local_rewards FOR ALL
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 7. ledger_transactions — Lectura B2B via membresía
-- ==========================================
-- El cajero/owner ve todas las transacciones de su negocio.

CREATE POLICY "Auth: Miembros ven transacciones de su org"
ON public.ledger_transactions FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- Permite INSERT para crear transacciones desde el POS (Next.js)
CREATE POLICY "Auth: Cajeros crean transacciones"
ON public.ledger_transactions FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- ==========================================
-- 8. wallets — INSERT para crear wallets desde POS
-- ==========================================
-- La política de SELECT B2B ya fue agregada en 005.
-- Agregamos INSERT para que el POS pueda crear wallets.

CREATE POLICY "Auth: Cajeros crean wallets para clientes"
ON public.wallets FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- ==========================================
-- 9. users — INSERT para crear Ghost Users desde POS
-- ==========================================
-- Permite que el POS cree usuarios fantasma al dar puntos.

CREATE POLICY "Auth: Cajeros crean usuarios ghost"
ON public.users FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- ==========================================
-- 10. security_logs — Lectura B2B via membresía
-- ==========================================

CREATE POLICY "Auth: Owners ven logs de seguridad de su org"
ON public.security_logs FOR SELECT
USING (
    target_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER')
    )
);

-- ==========================================
-- 11. api_credentials — CRUD solo OWNER
-- ==========================================

CREATE POLICY "Auth: Owners gestionan API credentials"
ON public.api_credentials FOR ALL
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code = 'OWNER'
    )
);
