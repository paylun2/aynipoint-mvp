-- ==============================================================================================
-- MIGRACIÓN 008: Reglas de Validación de Teléfonos Internacionales (POS)
-- Fecha: 2026-03-12
-- Propósito: Evitar la fragmentación de usuarios y la creación de "usuarios fantasma" con 
--            números incorrectos en el POS.
-- ==============================================================================================

-- 1. CREACIÓN DE LA TABLA DE REGLAS DE REFERENCIA
CREATE TABLE IF NOT EXISTS public.country_phone_rules (
    country_code VARCHAR(3) PRIMARY KEY, -- ISO 3166-1 alpha-2 (PE, CO, MX)
    country_name VARCHAR(100) NOT NULL,
    dial_code VARCHAR(5) NOT NULL,       -- +51, +57
    phone_length INT NOT NULL,           -- 9 (Perú), 10 (Colombia)
    phone_regex VARCHAR(100) NOT NULL,   -- Regex de validación (ej: ^9\d{8}$)
    example_number VARCHAR(20) NOT NULL, -- Número de ejemplo para UI
    is_active BOOLEAN DEFAULT TRUE       -- Para activar/desactivar países soportados
);

-- 2. POBLAR DATOS PARA LATAM
INSERT INTO public.country_phone_rules (country_code, country_name, dial_code, phone_length, phone_regex, example_number) VALUES
('PE', 'Perú', '+51', 9, '^9\d{8}$', '912345678'),
('CO', 'Colombia', '+57', 10, '^3\d{9}$', '3101234567'),
('MX', 'México', '+52', 10, '^\d{10}$', '5512345678'),
('CL', 'Chile', '+56', 9, '^9\d{8}$', '912345678'),
('AR', 'Argentina', '+54', 10, '^\d{10}$', '1112345678'),
('EC', 'Ecuador', '+593', 9, '^9\d{8}$', '912345678'),
('BO', 'Bolivia', '+591', 8, '^[67][0-9]{7}$', '71234567')
ON CONFLICT (country_code) DO UPDATE SET
    phone_length = EXCLUDED.phone_length,
    phone_regex = EXCLUDED.phone_regex,
    example_number = EXCLUDED.example_number;

-- 3. POLÍTICAS RLS PARA LA TABLA DE REGLAS
ALTER TABLE public.country_phone_rules ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer las reglas para validar en frontend
CREATE POLICY "Lectura pública de reglas de teléfono"
ON public.country_phone_rules FOR SELECT USING (is_active = TRUE);

-- ==============================================================================================
-- 4. NORMALIZACIÓN DE LA TABLA ORGANIZATIONS
-- ==============================================================================================
-- La tabla actual tiene VARCHAR(100) en country, que podría tener 'Peru', 'Perú', vacíó, etc.
-- Actualizamos organizaciones existentes a 'PE' por defecto (MVP inicial fue en Perú).
UPDATE public.organizations 
SET country = 'PE' 
WHERE country IS NULL OR country = '' OR country ILIKE '%peru%' OR country ILIKE '%perú%';

-- Hacemos la columna restrictiva temporalmente o añadimos FK a la tabla de reglas
ALTER TABLE public.organizations 
ADD CONSTRAINT fk_organizations_country 
FOREIGN KEY (country) REFERENCES public.country_phone_rules(country_code)
ON DELETE RESTRICT;

-- Reafirmamos NOT NULL (si no lo era ya)
ALTER TABLE public.organizations ALTER COLUMN country SET NOT NULL;
