-- ==============================================================================================
-- MIGRACIÓN 009: Permitir a Cajeros (Staff) leer usuarios para el POS
-- Fecha: 2026-03-12
-- Propósito: La política de 007 restringió de más la lectura de usuarios, no permitiendo
--            que los cajeros encuentren a los clientes (ghost users) o que el INSERT
--            .select() pueda retornar la fila recién creada.
-- ==============================================================================================

-- Drop the overly restrictive policy from 007 if it exists
DROP POLICY IF EXISTS "Auth: Staff ve usuarios de su org" ON public.users;

-- Create a robust policy: Any B2B staff can read basic users details to grant points
CREATE POLICY "Auth: Staff puede buscar clientes por telefono" 
ON public.users FOR SELECT 
USING (public.is_auth_user_staff());
