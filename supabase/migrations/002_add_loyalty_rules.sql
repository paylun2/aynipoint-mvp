-- 1. Crear la tabla de reglas de lealtad (Marketing & Anti-Fraude)
CREATE TABLE public.loyalty_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    
    -- Escudo Anti-Fraude (Borde 1 y 3 del Volumen 4)
    min_hours_between_tx INT NOT NULL DEFAULT 0,
    max_points_per_transaction INT NOT NULL DEFAULT 1000,
    
    -- Motores de Marketing PLG (Multiplicadores por día de la semana)
    multiplier_monday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    multiplier_tuesday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    multiplier_wednesday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    multiplier_thursday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    multiplier_friday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    multiplier_saturday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    multiplier_sunday DECIMAL(3,1) NOT NULL DEFAULT 1.0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Validaciones de cordura
    CONSTRAINT check_multipliers_positive CHECK (
        multiplier_monday >= 1.0 AND multiplier_tuesday >= 1.0 AND 
        multiplier_wednesday >= 1.0 AND multiplier_thursday >= 1.0 AND 
        multiplier_friday >= 1.0 AND multiplier_saturday >= 1.0 AND 
        multiplier_sunday >= 1.0
    ),
    CONSTRAINT check_max_points CHECK (max_points_per_transaction >= 1)
);

-- 2. Habilitar RLS
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS)
-- Los dueños y administradores pueden leer las reglas de su organización
CREATE POLICY "Lectura de reglas para miembros de la organización"
ON public.loyalty_rules FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om 
        WHERE om.org_id = loyalty_rules.org_id 
        AND om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN', 'CASHIER') -- Los cajeros leen para el POS
    )
);

-- Solo los dueños o admins pueden modificar las reglas
CREATE POLICY "Modificación de reglas para dueños y administradores"
ON public.loyalty_rules FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om 
        WHERE om.org_id = loyalty_rules.org_id 
        AND om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN') -- Cajeros no pueden editar
    )
);

-- Los dueños o admins pueden insertar las reglas (en caso de que no existan)
CREATE POLICY "Inserción de reglas para dueños y administradores"
ON public.loyalty_rules FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om 
        WHERE om.org_id = loyalty_rules.org_id 
        AND om.user_id = auth.uid()
        AND om.role IN ('OWNER', 'ADMIN')
    )
);

-- 4. Trigger para auto-inyección (Opcional, pero recomendado para retrocompatibilidad)
-- Si una tienda antigua no tiene reglas, se le insertan reglas por defecto la primera vez que intente leer algo o insertará mediante upsert desde el app.

-- 5. Trigger for updated_at
CREATE TRIGGER trg_loyalty_rules_updated_at
BEFORE UPDATE ON public.loyalty_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
