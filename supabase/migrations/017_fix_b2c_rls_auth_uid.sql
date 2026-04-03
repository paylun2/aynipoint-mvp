-- ==============================================================================================
-- MIGRACIÓN 017: Fix RLS B2C para Next.js (wallets y users)
-- Fecha: 2026-03-15
-- Propósito: La política original B2C de `wallets` usaba `public.get_current_user_id()`, 
-- que lee una variable de FastAPI (`app.current_user_id`). Al usar Supabase/Next.js, 
-- esta variable es nula, por lo que RLS bloqueaba la lectura de las propias billeteras 
-- del usuario.
-- Se añaden políticas OR tolerantes a ambas arquitecturas.
-- ==============================================================================================

-- 1. Billeteras B2C (Lectura propia)
DROP POLICY IF EXISTS "Clientes ven sus propias billeteras" ON public.wallets;
CREATE POLICY "Clientes ven sus propias billeteras"
ON public.wallets FOR SELECT
USING (
    user_id = public.get_current_user_id() 
    OR 
    user_id = auth.uid()
);

-- 2. Usuarios B2C (Auto-lectura)
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.users;
CREATE POLICY "Usuarios ven su propio perfil"
ON public.users FOR SELECT
USING (
    id = public.get_current_user_id()
    OR
    id = auth.uid()
);

-- 3. Usuarios B2C (Auto-edición)
DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON public.users;
CREATE POLICY "Usuarios editan su propio perfil"
ON public.users FOR UPDATE
USING (
    id = public.get_current_user_id()
    OR
    id = auth.uid()
);

-- 4. Historial B2C (Ledger)
DROP POLICY IF EXISTS "Clientes ven su propio historial" ON public.ledger_transactions;
CREATE POLICY "Clientes ven su propio historial"
ON public.ledger_transactions FOR SELECT
USING (
    wallet_id IN (
        SELECT id FROM public.wallets 
        WHERE user_id = public.get_current_user_id() OR user_id = auth.uid()
    )
);
