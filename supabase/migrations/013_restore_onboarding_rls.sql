-- ==============================================================================================
-- MIGRACIÓN 013: Restauración de RLS Segura para Onboarding B2B (V2 - Nivel Bancario)
-- Fecha: 2026-03-13
-- Propósito: Restaura la capacidad de que un usuario autenticado cree un negocio.
--            Se implementa `created_by_user_id` para garantizar Aislamiento Transaccional Estricto
--            durante el `.insert().select('id')` sin exponer comercios "Pending" a terceros.
-- ==============================================================================================

-- 0. Columna de Auditoría y Aislamiento (Root Cause Fix para el SELECT)
-- Permite saber quién es el dueño exacto de la fila ANTES de que exista en `organization_members`
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 1. Restaurar INSERT para Organizations
-- Solo usuarios 100% autenticados pueden crear. (Evitamos el "true" que abre puertas a anónimos).
DROP POLICY IF EXISTS "Auth: Usuarios crean organizaciones" ON public.organizations;
CREATE POLICY "Auth: Usuarios crean organizaciones"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Asegurar INSERT para Organization Members
DROP POLICY IF EXISTS "Auth: Insertar membresia propia" ON public.organization_members;
CREATE POLICY "Auth: Insertar membresia propia"
ON public.organization_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 3. Lectura Transaccional Estricta (El 'Hack' de Nivel Bancario)
-- El fundador puede leer la tienda que acaba de crear (necesario para `.select('id')`),
-- PERO ningún otro usuario logueado en la plataforma puede verla gracias al filtro selectivo.
DROP POLICY IF EXISTS "Auth: Creadores leen su propia insercion" ON public.organizations;
CREATE POLICY "Auth: Creadores leen su propia insercion"
ON public.organizations FOR SELECT
USING (created_by_user_id = auth.uid());
-- NOTA: Con estas dos políticas, src/app/actions/onboarding.ts puede volver a usar
-- `createClient()` (cliente normal ligado al JWT del navegador) de forma 100% segura
-- sin violar los principios de segregación de privilegios de la base de datos.
