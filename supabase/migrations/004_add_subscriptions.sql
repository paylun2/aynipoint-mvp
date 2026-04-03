/* ========================================================================
Loyalty Central - Database Migration
Version: 004
Description: B2B SaaS Subscriptions and Billing History with Strict RLS
======================================================================== */

-- 1. TABLA DE SUSCRIPCIONES (Nivel Core Bancario)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Plan Details
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plan_tier IN ('FREE', 'PRO', 'ENTERPRISE')),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'NONE' CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL', 'NONE')),
    
    -- Status & Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIAL')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Integración Futura (Stripe/Niubiz)
    payment_gateway_customer_id VARCHAR(100),
    payment_gateway_subscription_id VARCHAR(100),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Trigger de Update Timestamp (Uses the existing function trigger_set_timestamp)
DROP TRIGGER IF EXISTS set_timestamp_subscriptions ON public.subscriptions;
CREATE TRIGGER set_timestamp_subscriptions
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


-- 2. TABLA DE HISTORIAL DE FACTURACIÓN (Inmutable - Ledger Style)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.billing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    
    -- Datos Financieros (Monto en centavos enteros para evitar floats)
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'OPEN', 'VOID', 'FAILED', 'REFUNDED')),
    
    invoice_url TEXT,
    billing_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Tax Data / Metadatos de Facturación Local
    tax_number VARCHAR(50), -- RUC guardado en la foto de ese momento
    legal_name VARCHAR(200),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_history_org_id ON public.billing_history(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_date ON public.billing_history(billing_date DESC);


-- 3. POLÍTICAS RLS (Seguridad Robusta - Aislamiento Absoluto B2B)
-- =====================================================================

-- Subscriptions RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Lectura: Solo la organización puede ver su suscripción
DROP POLICY IF EXISTS "Organizaciones ven su propia suscripcion" ON public.subscriptions;
CREATE POLICY "Organizaciones ven su propia suscripcion"
ON public.subscriptions FOR SELECT
USING (org_id::text = current_setting('app.current_org_id', TRUE));

-- Inmutabilidad en Cliente: Los clientes/B2B NUNCA pueden insertar/actualizar/borrar directamente.
-- Solo el servidor backend (FastAPI/Next.js con Service Role) o Stripe Webhooks pueden modificar esto.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon;


-- Billing History RLS
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Lectura: Solo la organización puede ver su historial de pagos
DROP POLICY IF EXISTS "Organizaciones ven sus propios pagos" ON public.billing_history;
CREATE POLICY "Organizaciones ven sus propios pagos"
ON public.billing_history FOR SELECT
USING (org_id::text = current_setting('app.current_org_id', TRUE));

-- Inmutabilidad Financiera: Nadie desde el cliente puede modificar un recibo histórico.
REVOKE INSERT, UPDATE, DELETE ON public.billing_history FROM authenticated, anon;


-- 4. FUNCIÓN TRIGGER PARA INICIALIZAR SUSCRIPCIÓN (Free Tier)
-- =====================================================================
-- Cuando se crea una Organización, automáticamente le creamos una suscripción FREE.
CREATE OR REPLACE FUNCTION sp_initialize_org_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (
        org_id, 
        plan_tier, 
        billing_cycle, 
        status, 
        current_period_start, 
        current_period_end
    ) VALUES (
        NEW.id, 
        'FREE', 
        'NONE', 
        'ACTIVE', 
        NOW(), 
        NOW() + INTERVAL '100 years' -- Free forever by default
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER FUNCTION public.sp_initialize_org_subscription() SET search_path = public;

-- Drop trigger if it exists before recreating
DROP TRIGGER IF EXISTS trg_initialize_subscription ON public.organizations;
CREATE TRIGGER trg_initialize_subscription
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE PROCEDURE sp_initialize_org_subscription();

-- Backfill: Crear suscripciones Free para las organizaciones (bodegas) que ya existen y no tienen
INSERT INTO public.subscriptions (
    org_id, plan_tier, billing_cycle, status, current_period_start, current_period_end
)
SELECT id, 'FREE', 'NONE', 'ACTIVE', NOW(), NOW() + INTERVAL '100 years'
FROM public.organizations
WHERE id NOT IN (SELECT org_id FROM public.subscriptions);
