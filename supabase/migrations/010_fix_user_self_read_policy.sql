-- ==============================================================================================
-- MIGRACIÓN 010: Fix Users Table Self-Read Policy
-- Fecha: 2026-03-13
-- Problema: La Identity Fusion enlaza el auth_user_id al usuario Ghost creado vía POS.
--           El backend de profile.ts utiliza al cliente de Supabase respetando RLS para resolver el perfil,
--           buscando eq('auth_user_id', auth.uid()). Sin embargo, el RLS base solo permitía lectura si
--           id = auth.uid(), ocasionando que devuelva error y haga un fallback al usuario sin teléfono.
-- Solución: Modificar la política para permitir a un usuario autenticado leer la cuenta donde se ha
--           asignado su auth_user_id exitosamente.
-- ==============================================================================================

DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

CREATE POLICY "Users can view their own data"
ON public.users FOR SELECT
USING (id = auth.uid() OR auth_user_id = auth.uid());
