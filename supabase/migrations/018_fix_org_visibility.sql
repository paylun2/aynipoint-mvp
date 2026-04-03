-- ==============================================================================================
-- MIGRACIÓN 018: Fix RLS Organizations - Visibilidad B2C (Nuevos / Pendientes)
-- Fecha: 2026-03-15
-- Propósito: La política "Lectura publica de negocios verificados" exigía que `is_public=TRUE` 
-- y `status='VERIFIED'` para que un negocio sea visible. Esto impedía que negocios nuevos 
-- (`PENDING_VERIFICATION`) aparezcan en la pestaña "Nuevos" del Directorio o que se pudiera 
-- acceder a su Landing Page compartida, bloqueando su capacidad de conseguir likes.
-- ==============================================================================================

DROP POLICY IF EXISTS "Lectura publica de negocios verificados" ON public.organizations;
DROP POLICY IF EXISTS "Lectura publica de negocios activos y pendientes" ON public.organizations;
DROP POLICY IF EXISTS "Lectura publica de negocios" ON public.organizations;

-- Permitimos lectura a cualquier negocio que no esté SUSPENDED ni ARCHIVED
CREATE POLICY "Lectura publica de negocios"
ON public.organizations FOR SELECT
USING (status IN ('PENDING_VERIFICATION', 'VERIFIED', 'ACTIVE'));
