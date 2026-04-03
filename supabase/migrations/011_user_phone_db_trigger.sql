-- ==============================================================================================
-- MIGRACIÓN 011: Blindaje Nivel Base de Datos para Teléfonos Globales (Users)
-- Fecha: 2026-03-13
-- Propósito: Prevenir a nivel de motor de PostgreSQL que cualquier inserción de usuario (manual,
--           API, o hackeo del frontend) utilice un formato telefónico inválido.
-- Optimización: El trigger evalúa el string contra los regex activos de latam/mundo en milisegundos.
-- ==============================================================================================

-- 1. Función PL/pgSQL de Alta Eficiencia (Ejecución Engine-side)
CREATE OR REPLACE FUNCTION public.check_phone_validity()
RETURNS trigger AS $$
DECLARE
    is_valid BOOLEAN := false;
    rule RECORD;
BEGIN
    -- 1. Si el registro no tiene teléfono (ej. Auth directo Google sin POS), dejar pasar.
    IF NEW.phone IS NULL OR NEW.phone = '' THEN
        RETURN NEW;
    END IF;

    -- 2. Limpieza de seguridad: asegurarnos que solo hay dígitos antes de validar
    NEW.phone := regexp_replace(NEW.phone, '\D', '', 'g');

    -- 3. Búsqueda optimizada por regex. 
    -- Se iteran las reglas activas (Perú, Colombia, USA, España, etc). 
    -- Al primer match exitoso, detiene la búsqueda (Short-circuit optimization).
    FOR rule IN SELECT phone_regex FROM public.country_phone_rules WHERE is_active = true LOOP
        -- El operador '~' ejecuta un Regular Expression match nativo y veloz en Postgres
        IF NEW.phone ~ rule.phone_regex THEN
            is_valid := true;
            EXIT; 
        END IF;
    END LOOP;

    -- 4. Veredicto Final del Engine
    IF NOT is_valid THEN
        RAISE EXCEPTION 'Nivel Seguridad DB: El número telefónico % no cumple con el formato regex bancario de ningún país soportado en el sistema.', NEW.phone;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asociar la función mediante un Trigger a la tabla principal
DROP TRIGGER IF EXISTS trg_validate_phone ON public.users;
CREATE TRIGGER trg_validate_phone
BEFORE INSERT OR UPDATE OF phone ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.check_phone_validity();
