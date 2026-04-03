-- ==============================================================================================
-- AYNIPOINT / LOYALTY CENTRAL - CORE LEDGER SCHEMA (VOLUMEN 6)
-- Target: PostgreSQL 15+ (Supabase)
-- Description: Implementación del Libro Mayor Inmutable (Append-Only), RLS Multi-Tenant, y Fusión B2C
-- ==============================================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE ledger_tx_type AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'REFUND', 'BONUS', 'MIGRATE');

-- ==========================================
-- 3. TABLES
-- ==========================================

-- A. Organizations (B2B Tenants)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    short_code VARCHAR(10) UNIQUE NOT NULL, -- Ej: BRV-8X2 (QR Attribution)
    plan_type VARCHAR(50) DEFAULT 'FREE',
    max_free_allocated_users INT DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. Users (Dual Identity: Ghost / Sovereign)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL, -- El ancla de identidad (Ghost)
    auth_user_id UUID UNIQUE, -- Supabase Auth ID (Sovereign)
    is_registered BOOLEAN DEFAULT FALSE,
    validated_by_org_id UUID REFERENCES public.organizations(id), -- PLG: Quién logró la conversión
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. Wallets (Saldos en tiempo real)
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0), -- CIRCUIT BREAKER
    lifetime_earned INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, org_id) -- Un usuario solo tiene una billetera por organización
);

-- D. Ledger Transactions (Libro Mayor Inmutable)
CREATE TABLE public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    type ledger_tx_type NOT NULL,
    amount INT NOT NULL, -- Positivo (Earn) o Negativo (Redeem)
    balance_snapshot INT, -- Rellenado por el Trigger
    description TEXT,
    reference_id VARCHAR(255), -- Para idempotencia o vinculación con tickets de POS
    device_fingerprint VARCHAR(255),
    created_by_user_id UUID, -- Qué cajero ejecutó la transacción
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. FINANCIAL TRIGGERS & RPCs
-- ==========================================

-- Trigger Function: Actualizar el saldo de la billetera automáticamente
CREATE OR REPLACE FUNCTION sp_update_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con privilegios máximos para garantizar inmutabilidad
AS $$
DECLARE
    current_balance INT;
    new_balance INT;
BEGIN
    -- 1. Bloquear la billetera para evitar Race Conditions (SELECT FOR UPDATE)
    SELECT balance INTO current_balance 
    FROM public.wallets 
    WHERE id = NEW.wallet_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet no encontrada (ID: %)', NEW.wallet_id;
    END IF;

    -- 2. Calcular nuevo saldo
    new_balance := current_balance + NEW.amount;

    -- 3. La tabla Wallet tiene un CHECK(balance >= 0). 
    -- Si new_balance es negativo, el UPDATE fallará y abortará toda la transacción ACID.
    UPDATE public.wallets
    SET balance = new_balance,
        lifetime_earned = CASE WHEN NEW.amount > 0 THEN lifetime_earned + NEW.amount ELSE lifetime_earned END,
        updated_at = NOW()
    WHERE id = NEW.wallet_id;

    -- 4. Guardar evidencia en el Ledger (Snapshot)
    NEW.balance_snapshot := new_balance;

    RETURN NEW;
END;
$$;

-- Vincular Trigger al Ledger
CREATE TRIGGER trigger_update_wallet_balance
BEFORE INSERT ON public.ledger_transactions
FOR EACH ROW
EXECUTE FUNCTION sp_update_wallet_balance();

-- Protección Forense: Prohibir UPDATE y DELETE en el Ledger
CREATE OR REPLACE FUNCTION sp_prevent_ledger_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'El Ledger es inmutable. No se permiten operaciones UPDATE ni DELETE.';
END;
$$;

CREATE TRIGGER trigger_prevent_ledger_tampering
BEFORE UPDATE OR DELETE ON public.ledger_transactions
FOR EACH ROW
EXECUTE FUNCTION sp_prevent_ledger_tampering();

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;

-- Organizaciones: Cualquiera puede leer (necesario para ver los comercios afiliados)
CREATE POLICY "Orgs are viewable by everyone" ON public.organizations FOR SELECT USING (TRUE);

-- Usuarios B2C: Un usuario soberano solo puede ver su propia data usando auth.uid()
CREATE POLICY "Users can view their own data" ON public.users 
FOR SELECT USING (auth_user_id = auth.uid());

-- Wallets B2C: Un usuario solo puede ver sus propias billeteras
CREATE POLICY "Users can view their own wallets" ON public.wallets 
FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Ledger: Un usuario solo puede ver las transacciones de sus billeteras
CREATE POLICY "Users can view their own transactions" ON public.ledger_transactions 
FOR SELECT USING (
    wallet_id IN (
        SELECT id FROM public.wallets 
        WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
);

-- Notas de Implementación B2B:
-- Las políticas RLS para lectura y escritura B2B (Cajeros emitiendo puntos) usarán una función auxiliar 
-- (has_role_in_org) consultando una tabla "organization_members" que asocia auth_user_id con org_id.
-- Para simplificar este script base del Ledger MVP, las mutaciones se realizarán mediante Service Role 
-- o Server Actions (Backend B2B autorizado).
