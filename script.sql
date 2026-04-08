/* ========================================================================
LOYALTY CENTRAL - MASTER SQL SCRIPT (PART 1/4)
VERSION: 2.0.0 (ENTERPRISE / FASTAPI ARCHITECTURE)
MODULE: SETUP & IDENTITY CORE
AUTHOR: Gemini Architect
========================================================================
*/

-- 1. EXTENSIONES (Superpoderes para Postgres)
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Generación de IDs únicos universales
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Hashing y criptografía
CREATE EXTENSION IF NOT EXISTS "citext";         -- Texto Case-Insensitive (para emails)
CREATE EXTENSION IF NOT EXISTS "moddatetime";    -- Actualización automática de timestamps
CREATE EXTENSION IF NOT EXISTS "vector";         -- Habilitamos extensiones necesarias para UUIDs y Vectores (IA)


-- 2. TIPOS DE DATOS PERSONALIZADOS (ENUMS)
-- =====================================================================
-- Definimos los estados posibles para evitar "strings mágicos"
CREATE TYPE user_risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'BLOCKED');
CREATE TYPE auth_provider_type AS ENUM ('GOOGLE', 'APPLE', 'MICROSOFT', 'EMAIL_OTP');
-- NOTA ARQUITECTURA: Se eliminó 'device_trust_level' ya que el fingerprinting ahora vive en Redis/FastAPI.


-- 3. FUNCIONES DE UTILIDAD Y CONTEXTO RLS
-- =====================================================================

-- A. Función para actualizar la columna 'updated_at' automáticamente
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B. HELPER RLS (NUEVO PARA FASTAPI): 
-- Reemplaza a auth.uid() de Supabase. Lee de forma segura la variable que inyecta FastAPI.
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. BLINDAR FUNCIONES (Fix Search Path)
-- =====================================================================
-- Forzamos a que las funciones solo miren en el esquema 'public'.
-- Esto evita ataques de suplantación de objetos.
ALTER FUNCTION public.trigger_set_timestamp() SET search_path = public;
ALTER FUNCTION public.get_current_user_id() SET search_path = public;



--222222222222222222222222222222222222222222222222222222222222222222222222222222222222

/* ========================================================================
LOYALTY CENTRAL - MASTER SQL SCRIPT (PART 2/7)
VERSION: 2.0.0 (ENTERPRISE / FASTAPI ARCHITECTURE)
MODULE: IDENTITY CORE & SECURITY LOGS
========================================================================
*/

-- 4. TABLA MAESTRA DE USUARIOS (Identity)
-- =====================================================================
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    phone VARCHAR(20) UNIQUE,  -- Clave para Perú (Ej: 999123456)
    email VARCHAR(255),        -- Opcional (Solo si se registra en la App)
    full_name VARCHAR(150),
    avatar_url TEXT,
    
    -- Seguridad de la cuenta
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    risk_score user_risk_level DEFAULT 'LOW',
    
    -- Estado
    is_registered BOOLEAN DEFAULT FALSE, -- FALSE = Fantasma (Solo en caja), TRUE = Tiene App
    validated_by_org_id UUID, -- Registra qué negocio validó a este cliente    
    
    -- Privacidad & GDPR (Flujo 10 - Derecho al Olvido)
    is_anonymized BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ, 
    
    -- Auditoría básica
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Índices para búsqueda rápida en la Caja
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_ghost_users ON public.users(phone) WHERE is_registered = FALSE;
-- Trigger: Auto-update updated_at
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- 🛡️ POLÍTICAS RLS (DEFENSA EN PROFUNDIDAD PARA FASTAPI)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política 1: El usuario final B2C solo puede leer y editar su propia fila
CREATE POLICY "Usuarios ven su propio perfil"
ON public.users FOR SELECT
USING (id = public.get_current_user_id());

CREATE POLICY "Usuarios editan su propio perfil"
ON public.users FOR UPDATE
USING (id = public.get_current_user_id());

-- Política 2: Los Cajeros B2B pueden buscar usuarios por teléfono para dar puntos
-- (Se permite la lectura si FastAPI inyectó el ID de una Organización en la sesión)
CREATE POLICY "Cajeros pueden buscar usuarios (FastAPI Context)"
ON public.users FOR SELECT
USING (current_setting('app.current_org_id', TRUE) IS NOT NULL);


-- 5. TABLA DE PROVEEDORES DE AUTENTICACIÓN (SSO)
-- =====================================================================
DROP TABLE IF EXISTS public.auth_providers CASCADE;
CREATE TABLE public.auth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    provider auth_provider_type NOT NULL,
    provider_uid VARCHAR(255) NOT NULL, -- El 'sub' de Google/Apple
    
    metadata JSONB DEFAULT '{}'::jsonb, -- Guardamos claims extras
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Un usuario no puede vincular el mismo Google ID dos veces
    UNIQUE(provider, provider_uid)
);

-- Índices para velocidad en el Login (O(1))
CREATE INDEX idx_auth_lookup ON public.auth_providers(provider, provider_uid);
CREATE INDEX idx_auth_user ON public.auth_providers(user_id);

-- 🛡️ POLÍTICAS RLS
ALTER TABLE public.auth_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propios proveedores de auth"
ON public.auth_providers FOR SELECT
USING (user_id = public.get_current_user_id());


-- 6. LOGS DE SEGURIDAD (Auditoría de Acceso y Compliance)
-- =====================================================================
DROP TABLE IF EXISTS public.security_logs CASCADE;
CREATE TABLE public.security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    event_type VARCHAR(50) NOT NULL, -- 'LOGIN_FAIL', 'HIGH_VALUE_TX', 'USER_DELETED'
    severity VARCHAR(20) DEFAULT 'INFO', -- 'INFO', 'WARN', 'CRITICAL'
    
    actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- Quién lo hizo
    target_id UUID,   -- A qué objeto (Wallet ID, Org ID)
    
    ip_address INET,
    metadata JSONB DEFAULT '{}'::jsonb,  -- Detalles técnicos
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🛡️ POLÍTICAS RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Política: Los dueños/auditores solo pueden ver los logs relacionados a su propia organización
CREATE POLICY "Lectura de logs aislada por Organización (Tenant Isolation)"
ON public.security_logs FOR SELECT
USING (target_id::text = current_setting('app.current_org_id', TRUE));

-- NOTA: Los inserts en security_logs los hará FastAPI usando el Service Role, 
-- por lo que no requieren una política explícita de INSERT para los usuarios.






--333333333333333333333333333333333333333333333333333333333333333333333333
/* ========================================================================
LOYALTY CENTRAL - MASTER SQL SCRIPT (PART 3/7)
VERSION: 2.0.0 (ENTERPRISE / FASTAPI ARCHITECTURE)
MODULE: TENANCY, GOVERNANCE & DISCOVERY
========================================================================
*/

-- 1. ESTRUCTURA DE ORGANIZACIONES (Empresas)
-- =============================================================================
DROP TABLE IF EXISTS public.organizations CASCADE;
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- A. DATOS LEGALES (Privados - KYC)
    legal_name VARCHAR(200) NOT NULL,    -- "Inversiones Bravos SAC"
    tax_id VARCHAR(50),                  -- RUC / NIT
    
    -- B. PERFIL PÚBLICO (Directorio y SEO)
    commercial_name VARCHAR(100) NOT NULL, -- "Barbería Los Bravos"
    short_code VARCHAR(20) UNIQUE NOT NULL, -- "BRV-8X2" para el QR
    slug VARCHAR(100) UNIQUE,              -- loyalty.pe/barberia-los-bravos
    category VARCHAR(50) DEFAULT 'BARBERSHOP',
    logo_url TEXT,
    website_url TEXT,
    
    -- C. UBICACIÓN & GEOFENCING
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Peru',
    gps_lat DOUBLE PRECISION, 
    gps_lng DOUBLE PRECISION,
    geofence_radius_meters INT DEFAULT 100,
    
    -- D. ECONOMÍA & BRANDING
    brand_color VARCHAR(7) DEFAULT '#0F172A',
    currency_name VARCHAR(20) DEFAULT 'Puntos',
    currency_symbol VARCHAR(5) DEFAULT 'pts',
    
    -- E. CONFIGURACIÓN SAAS & ANTI-SPAM (NUEVO)
    status VARCHAR(30) DEFAULT 'PENDING_VERIFICATION' 
        CHECK (status IN ('PENDING_VERIFICATION', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    
    is_public BOOLEAN DEFAULT FALSE, -- [NUEVO] Controla si aparece en la billetera B2C
    
    subscription_tier VARCHAR(20) DEFAULT 'FREE' 
        CHECK (subscription_tier IN ('FREE', 'PRO', 'ENTERPRISE')),
        
    max_users_limit INT DEFAULT 100,
    
    -- F. AUDITORÍA
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orgs_slug ON public.organizations(slug);
CREATE INDEX idx_orgs_category ON public.organizations(category);

CREATE TRIGGER set_timestamp_orgs
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- 🛡️ POLÍTICAS RLS (DEFENSA EN PROFUNDIDAD)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Política de Lectura B2C (Pública): Permite a la app B2C mostrar el negocio en el mapa
CREATE POLICY "Lectura publica de negocios verificados"
ON public.organizations FOR SELECT
USING (is_public = TRUE AND status IN ('VERIFIED', 'ACTIVE'));

-- Política de Lectura B2B (Aislada): Permite al dueño/cajero ver su propio negocio
CREATE POLICY "Lectura aislada de su propia organizacion"
ON public.organizations FOR SELECT
USING (id::text = current_setting('app.current_org_id', TRUE));

-- Política de Escritura B2B: Solo pueden editar si están dentro de su contexto
CREATE POLICY "Actualizacion aislada de su propia organizacion"
ON public.organizations FOR UPDATE
USING (id::text = current_setting('app.current_org_id', TRUE));


-- 2. DEFINICIÓN DE ROLES DINÁMICOS (RBAC)
-- =====================================================================
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.app_roles CASCADE;

CREATE TABLE public.app_roles (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE
);

INSERT INTO public.app_roles (code, name, description, is_system_role) VALUES
('OWNER',   'Dueño',   'Acceso total financiero y administrativo', TRUE),
('MANAGER', 'Gerente', 'Gestión de campañas y personal', TRUE),
('CASHIER', 'Cajero',  'Escaneo de QRs y validación', TRUE),
('VIEWER',  'Auditor', 'Solo lectura de reportes', TRUE),
('AI_AGENT','Bot IA',  'Acceso limitado a vistas de conocimiento', TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE public.permissions (
    code VARCHAR(100) PRIMARY KEY,
    description TEXT
);

INSERT INTO public.permissions (code, description) VALUES
('org:update', 'Editar logo y colores de la empresa'),
('points:issue', 'Emitir puntos a clientes'),
('finance:read', 'Ver el libro mayor y facturación'),
('staff:manage', 'Invitar o despedir empleados')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE public.role_permissions (
    role_code VARCHAR(50) REFERENCES public.app_roles(code) ON DELETE CASCADE,
    permission_code VARCHAR(100) REFERENCES public.permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_code, permission_code)
);

INSERT INTO public.role_permissions (role_code, permission_code) VALUES
('OWNER', 'org:update'), ('OWNER', 'points:issue'), ('OWNER', 'finance:read'), ('OWNER', 'staff:manage'),
('MANAGER', 'points:issue'), ('MANAGER', 'staff:manage'),
('CASHIER', 'points:issue')
ON CONFLICT DO NOTHING;

-- 🛡️ POLÍTICAS RLS (Diccionarios Estáticos)
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura global de roles" ON public.app_roles FOR SELECT USING (TRUE);
CREATE POLICY "Lectura global de permisos" ON public.permissions FOR SELECT USING (TRUE);
CREATE POLICY "Lectura global de mapeo de roles" ON public.role_permissions FOR SELECT USING (TRUE);


-- 3. MIEMBROS DE ORGANIZACIÓN (El Vínculo Humano-Empresa)
-- =====================================================================
DROP TABLE IF EXISTS public.organization_members CASCADE;
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_code VARCHAR(50) NOT NULL REFERENCES public.app_roles(code),
    
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'DISABLED')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(org_id);

-- 🛡️ POLÍTICAS RLS (Multi-Tenant)
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Política 1: El usuario puede ver a qué organizaciones pertenece (Pantalla de Cambio de Organización)
CREATE POLICY "Usuarios ven sus propias membresias"
ON public.organization_members FOR SELECT
USING (user_id = public.get_current_user_id());

-- Política 2: El negocio puede ver a todos sus empleados (Aislamiento B2B)
CREATE POLICY "Negocios ven a su propio staff"
ON public.organization_members FOR SELECT
USING (org_id::text = current_setting('app.current_org_id', TRUE));






--44444444444444444444444444444444444444444444444444444444444444444444444444

/* ========================================================================
LOYALTY CENTRAL - MASTER SQL SCRIPT (PART 4/7)
VERSION: 2.0.0 (ENTERPRISE / FASTAPI ARCHITECTURE)
MODULE: FEDERATIONS (POOLS) & M2M SECURITY
========================================================================
*/

-- 4. POOLS (Federaciones / Alianzas)
-- =====================================================================
DROP TABLE IF EXISTS public.pool_memberships CASCADE;
DROP TABLE IF EXISTS public.pools CASCADE;

CREATE TABLE public.pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_org_id UUID NOT NULL REFERENCES public.organizations(id),
    
    join_policy VARCHAR(20) DEFAULT 'INVITE_ONLY',
    rules_config JSONB DEFAULT '{}'::jsonb, 
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.pool_memberships (
    pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    status VARCHAR(20) DEFAULT 'ACTIVE',
    exchange_rate_multiplier DECIMAL(5,2) DEFAULT 1.0,
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (pool_id, org_id)
);

-- 🛡️ POLÍTICAS RLS (POOLS Y MEMBRESÍAS)
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_memberships ENABLE ROW LEVEL SECURITY;

-- Política Pools: Una organización ve los pools que creó o a los que pertenece
CREATE POLICY "Lectura de Pools propios o aliados"
ON public.pools FOR SELECT
USING (
    owner_org_id::text = current_setting('app.current_org_id', TRUE)
    OR id IN (
        SELECT pool_id FROM public.pool_memberships 
        WHERE org_id::text = current_setting('app.current_org_id', TRUE)
    )
);

-- Política Membresías: Puede ver quiénes están en su mismo Pool
CREATE POLICY "Lectura de membresias de Pool"
ON public.pool_memberships FOR SELECT
USING (
    org_id::text = current_setting('app.current_org_id', TRUE)
    OR pool_id IN (
        SELECT id FROM public.pools 
        WHERE owner_org_id::text = current_setting('app.current_org_id', TRUE)
    )
);


-- 5. API CREDENTIALS (SEGURIDAD M2M)
-- =====================================================================
DROP TABLE IF EXISTS public.api_credentials CASCADE;
CREATE TABLE public.api_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, 
    
    secret_hash TEXT NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['points:read'], 
    allowed_origins TEXT[] DEFAULT ARRAY['*'], 
    
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_creds_org ON public.api_credentials(org_id);

-- 🛡️ POLÍTICAS RLS (SECRECY AISLADO)
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- Política: Aislamiento absoluto. Solo la organización dueña puede ver sus credenciales.
CREATE POLICY "Aislamiento estricto de API Credentials"
ON public.api_credentials FOR SELECT
USING (org_id::text = current_setting('app.current_org_id', TRUE));

CREATE POLICY "Aislamiento estricto para actualizar API Credentials"
ON public.api_credentials FOR UPDATE
USING (org_id::text = current_setting('app.current_org_id', TRUE));
















--5555555555555555555555555555555

/* ========================================================================
LOYALTY CENTRAL - MASTER SQL SCRIPT (PART 5/7)
VERSION: 2.0.0 (ENTERPRISE / FASTAPI ARCHITECTURE)
MODULE: BANKING CORE, WALLETS & CAMPAIGNS
========================================================================
*/

-- 1. REGLAS DE LEALTAD POR ORGANIZACIÓN
-- =====================================================================
CREATE TABLE public.loyalty_rules (
    org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    currency_name VARCHAR(50) DEFAULT 'Puntos',
    currency_symbol VARCHAR(10) DEFAULT 'pts',
    
    expiration_policy VARCHAR(20) DEFAULT 'ROLLING' CHECK (expiration_policy IN ('ROLLING', 'FIXED_DATE', 'NEVER')),
    expiration_days INTEGER DEFAULT 365,
    
    max_points_per_transaction INTEGER DEFAULT 1000,
    min_hours_between_tx INTEGER DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🛡️ POLÍTICAS RLS
ALTER TABLE public.loyalty_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura y Escritura aislada de Reglas"
ON public.loyalty_rules FOR ALL
USING (org_id::text = current_setting('app.current_org_id', TRUE));


-- 2. MOTOR DE CAMPAÑAS (Marketing Engine)
-- =====================================================================
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(150) NOT NULL,
    description TEXT,
    
    multiplier DECIMAL(4,2) DEFAULT 1.0,
    bonus_points INTEGER DEFAULT 0,
    
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    conditions JSONB DEFAULT '{}'::jsonb, 
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_campaigns_org ON public.campaigns(org_id);

-- 🛡️ POLÍTICAS RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura y Escritura aislada de Campañas"
ON public.campaigns FOR ALL
USING (org_id::text = current_setting('app.current_org_id', TRUE));





-- 2.5 CATÁLOGO DE PREMIOS (Local Rewards)
-- =====================================================================
CREATE TABLE public.local_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    title VARCHAR(150) NOT NULL,           -- Ej: "Corte de cabello clásico"
    description TEXT,
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    inventory_count INTEGER,               -- NULL significa inventario infinito
    requires_manager_approval BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewards_org ON public.local_rewards(org_id);

CREATE TRIGGER set_timestamp_rewards
BEFORE UPDATE ON public.local_rewards
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- 🛡️ POLÍTICAS RLS (DOBLE ESPEJO)
ALTER TABLE public.local_rewards ENABLE ROW LEVEL SECURITY;

-- B2C: Lectura Pública. Cualquier cliente puede ver los premios de las tiendas verificadas.
CREATE POLICY "Clientes ven los premios disponibles"
ON public.local_rewards FOR SELECT
USING (is_active = TRUE);

-- B2B: Lectura y Escritura Aislada. La bodega edita su propio catálogo.
CREATE POLICY "Negocios gestionan sus propios premios"
ON public.local_rewards FOR ALL
USING (org_id::text = current_setting('app.current_org_id', TRUE));




-- 3. WALLETS (Billeteras / Saldos en Tiempo Real)
-- =====================================================================
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    pool_id UUID REFERENCES public.pools(id) ON DELETE SET NULL,
    
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0), 
    lifetime_earned BIGINT NOT NULL DEFAULT 0,
    
    last_transaction_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, org_id, pool_id)
);

CREATE INDEX idx_wallets_user ON public.wallets(user_id);
CREATE INDEX idx_wallets_org_user ON public.wallets(org_id, user_id);

-- 🛡️ POLÍTICAS RLS (DOBLE ESPEJO)
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- B2C: Carlos ve su propia billetera sin importar en qué bodega sea
CREATE POLICY "Clientes ven sus propias billeteras"
ON public.wallets FOR SELECT
USING (user_id = public.get_current_user_id());

-- B2B: La Bodega ve todas las billeteras, pero solo las de su propio local
CREATE POLICY "Negocios ven billeteras de su local"
ON public.wallets FOR SELECT
USING (org_id::text = current_setting('app.current_org_id', TRUE));


-- 4. LEDGER (Libro Mayor Inmutable)
-- =====================================================================
DROP TABLE IF EXISTS public.ledger_transactions CASCADE;
CREATE TABLE public.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    wallet_id UUID NOT NULL REFERENCES public.wallets(id),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    campaign_id UUID REFERENCES public.campaigns(id),
    api_credential_id UUID REFERENCES public.api_credentials(id),
    
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('EARN', 'REDEEM', 'EXPIRE', 'REFUND', 'BONUS', 'MIGRATE')),
    amount INTEGER NOT NULL,
    balance_snapshot BIGINT NOT NULL,
    
    description TEXT,
    created_by_member_id UUID REFERENCES public.organization_members(id),
    
    ip_address INET,
    gps_location POINT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_wallet ON public.ledger_transactions(wallet_id);
CREATE INDEX idx_ledger_org ON public.ledger_transactions(org_id);
CREATE INDEX idx_ledger_date ON public.ledger_transactions(created_at DESC);

-- Bloquear UPDATE y DELETE en el Ledger a nivel de base de datos
REVOKE UPDATE, DELETE ON public.ledger_transactions FROM authenticated, anon, public;

-- 🛡️ POLÍTICAS RLS (DOBLE ESPEJO)
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;

-- B2C: Carlos ve su propio historial de transacciones (join seguro con su wallet)
CREATE POLICY "Clientes ven su propio historial"
ON public.ledger_transactions FOR SELECT
USING (wallet_id IN (
    SELECT id FROM public.wallets WHERE user_id = public.get_current_user_id()
));

-- B2B: La Bodega ve todas las transacciones generadas en su local
CREATE POLICY "Negocios ven el historial de su local"
ON public.ledger_transactions FOR SELECT
USING (org_id::text = current_setting('app.current_org_id', TRUE));


-- 5. TRIGGER BANCARIO (Actualización Automática de Saldo)
-- =====================================================================
CREATE OR REPLACE FUNCTION sp_update_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance BIGINT;
BEGIN
    -- Bloqueo pesimista (Row-level lock): Evita que 2 cajeros cobren al mismo tiempo
    SELECT balance INTO current_balance 
    FROM public.wallets 
    WHERE id = NEW.wallet_id 
    FOR UPDATE;

    -- Calculamos la verdad absoluta del Ledger
    NEW.balance_snapshot := current_balance + NEW.amount;

    -- Actualizamos la Wallet
    UPDATE public.wallets
    SET 
        balance = NEW.balance_snapshot,
        last_transaction_at = NOW(),
        lifetime_earned = CASE 
            WHEN NEW.amount > 0 THEN lifetime_earned + NEW.amount 
            ELSE lifetime_earned 
        END
    WHERE id = NEW.wallet_id;

    -- Al retornar NEW en un trigger BEFORE, PostgreSQL guarda el balance_snapshot real
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.sp_update_wallet_balance() SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_balance ON public.ledger_transactions;

CREATE TRIGGER trg_update_balance
BEFORE INSERT ON public.ledger_transactions
FOR EACH ROW
EXECUTE PROCEDURE sp_update_wallet_balance();



--666666666666666666666666666666666666666666

/* ========================================================================
LOYALTY CENTRAL - MASTER SQL SCRIPT (PART 6/7)
VERSION: 2.0.0 (ENTERPRISE / FASTAPI ARCHITECTURE)
MODULE: FINANCIAL LOGIC & REPORTING VIEWS
========================================================================
*/

-- 1. VISTA DE RESUMEN DE BILLETERA (High Performance View)
-- =====================================================================
-- NOTA DE SEGURIDAD: security_invoker = true garantiza que esta vista
-- obedezca las políticas RLS de las tablas base (users, wallets, organizations)
CREATE OR REPLACE VIEW public.v_user_wallet_summary WITH (security_invoker = true) AS
SELECT 
    u.id AS user_id,
    u.email,
    u.full_name,
    w.id AS wallet_id,
    w.balance,
    w.lifetime_earned,
    w.last_transaction_at,
    o.id AS org_id,
    o.commercial_name AS shop_name,
    o.currency_name,
    lr.expiration_policy,
    lr.expiration_days
FROM public.wallets w
JOIN public.users u ON w.user_id = u.id
JOIN public.organizations o ON w.org_id = o.id
LEFT JOIN public.loyalty_rules lr ON w.org_id = lr.org_id;


-- 2. FUNCIÓN DE VENCIMIENTO DE PUNTOS (Expiration Engine)
-- =====================================================================
-- Esta función será ejecutada por un Cron Job o un Background Task en FastAPI
-- a la medianoche para barrer y expirar los puntos no usados.
CREATE OR REPLACE FUNCTION sp_process_expirations()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT org_id, expiration_days 
        FROM public.loyalty_rules 
        WHERE expiration_policy = 'ROLLING'
    LOOP
        INSERT INTO public.ledger_transactions (
            wallet_id, 
            org_id, 
            type, 
            amount, 
            balance_snapshot, 
            description, 
            created_at
        )
        SELECT 
            w.id,
            w.org_id,
            'EXPIRE',
            (w.balance * -1), 
            0, 
            'Vencimiento por inactividad automatica',
            NOW()
        FROM public.wallets w
        WHERE w.org_id = r.org_id
          AND w.balance > 0
          AND w.last_transaction_at < (NOW() - (r.expiration_days || ' days')::INTERVAL);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- BLINDAJE DE LA FUNCIÓN
ALTER FUNCTION public.sp_process_expirations() SET search_path = public;
-- Evitamos que cualquier usuario llame a esta función y force vencimientos masivos
REVOKE ALL ON FUNCTION sp_process_expirations() FROM PUBLIC;






--7777777777777777777777777777777777777777777777777777777



/* ========================================================================
LOYALTY CENTRAL - MASTER SQL SCRIPT (PART 7/7)
VERSION: 2.0.0 (ENTERPRISE / FASTAPI ARCHITECTURE)
MODULE: AI INFRASTRUCTURE (RAG & REAL-TIME)
========================================================================
*/

CREATE SCHEMA IF NOT EXISTS ai_access;

-- 1. BASE DE CONOCIMIENTO (RAG - Hemisferio Semántico)
-- =====================================================================
DROP TABLE IF EXISTS public.ai_knowledge_base CASCADE;
CREATE TABLE public.ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, 
    content TEXT NOT NULL,    
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_vectors ON public.ai_knowledge_base USING hnsw (embedding vector_cosine_ops);

-- 🛡️ POLÍTICAS RLS (AISLAMIENTO DEL CEREBRO DE IA)
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aislamiento de conocimiento de IA por organizacion"
ON public.ai_knowledge_base FOR ALL
USING (org_id::text = current_setting('app.current_org_id', TRUE));


-- 2. VISTAS SANITIZADAS (JAULA DE IA)
-- =====================================================================
-- NOTA DE SEGURIDAD: security_invoker = true obliga a que la IA herede 
-- el RLS de las tablas base, impidiendo que haga "trampa" y lea otras empresas.

-- Vista A: Métricas Diarias
CREATE OR REPLACE VIEW ai_access.daily_metrics WITH (security_invoker = true) AS
SELECT 
    org_id,
    DATE(created_at) as day,
    COUNT(*) as total_transactions,
    SUM(amount) FILTER (WHERE type = 'EARN') as points_issued,
    SUM(ABS(amount)) FILTER (WHERE type = 'REDEEM') as points_redeemed
FROM public.ledger_transactions
GROUP BY org_id, DATE(created_at);

-- Vista B: Rendimiento de Campañas
CREATE OR REPLACE VIEW ai_access.campaign_performance WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.name,
    COUNT(t.id) as usage_count,
    SUM(t.amount) as points_generated
FROM public.campaigns c
LEFT JOIN public.ledger_transactions t ON t.campaign_id = c.id
GROUP BY c.id, c.name;

-- Vista C: Ranking Live
CREATE OR REPLACE VIEW ai_access.ranking_live WITH (security_invoker = true) AS
SELECT 
    o.commercial_name,
    o.category,
    o.city,
    COUNT(w.id) as total_active_users,
    o.website_url
FROM public.organizations o
LEFT JOIN public.wallets w ON o.id = w.org_id
WHERE o.status = 'ACTIVE'
GROUP BY o.id, o.commercial_name, o.category, o.city
ORDER BY total_active_users DESC;

-- Vista D: Campañas Live
CREATE OR REPLACE VIEW ai_access.campaigns_live WITH (security_invoker = true) AS
SELECT 
    o.commercial_name as shop_name,
    c.name as promo_name,
    c.description,
    c.multiplier,
    c.end_date
FROM public.campaigns c
JOIN public.organizations o ON c.org_id = o.id
WHERE c.is_active = TRUE 
AND (c.end_date > NOW() OR c.end_date IS NULL);

-- NOTA DE ARQUITECTURA: Se eliminaron los comandos GRANT/REVOKE de Supabase 
-- (anon, authenticated) porque FastAPI gestionará el acceso mediante la API
-- usando un usuario único de base de datos y validando el contexto RLS.


























-- ==========================================
-- SCRIPT DE PERMISOS SUPERIORES (GRANTS)
-- ==========================================
-- Ejecuta esto en el SQL Editor de Supabase
-- para reparar el error 42501 (Permission Denied).

-- 1. Permisos para la capa de API (Next.js / PostgREST)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Permisos sobre todas las tablas actuales
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Permisos sobre secuencias (Para hacer INSERTS con IDs autoincrementables)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. Permisos sobre funciones y procedimientos almacenados (RPC / Triggers)
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 5. Asegurar que las futuras tablas también reciban estos permisos automáticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;




































-- ==========================================
-- SCRIPT DE AUTO-REGISTRO B2C/B2B (TRIGGER)
-- ==========================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para reparar el error "organization_members_user_id_fkey".

-- 1. Crear o reemplazar la función que copia los datos desde Google/Correo 
-- a nuestra tabla de negocio 'public.users'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, is_registered)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        new.raw_user_meta_data->>'avatar_url',
        TRUE -- Identifica que es un usuario verificado de la App, no "Fantasma"
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        is_registered = TRUE;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. Conectar la función al evento de registro oficial de Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. (BACKFILL) Sincronizar todos los usuarios que intentaron loguearse hasta este momento
-- y que no pasaron a la tabla public.users debido a la falta del trigger.
INSERT INTO public.users (id, email, full_name, avatar_url, is_registered)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'avatar_url',
    TRUE
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;




















-- ============================================================================
-- MIGRATION: Agregar columna auth_user_id a la tabla users
-- Fecha: 2026-03-10
-- Propósito: Vincular el usuario fantasma (Ghost) con el auth.users de Supabase
-- ============================================================================

-- 1. Agregar la columna auth_user_id (nullable, ya que los Ghost Users no la tienen)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- 2. Crear índice para búsquedas rápidas por auth_user_id
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- 3. Comentario de documentación
COMMENT ON COLUMN public.users.auth_user_id IS 'UUID del usuario en auth.users de Supabase. NULL para Ghost Users (solo creados en la caja). Se asigna durante la fusión de identidad (Identity Fusion).';

-- ============================================================================
-- VERIFICACIÓN: Ejecuta esta query después para confirmar que la columna existe
-- ============================================================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'auth_user_id';



























-- 1. Add likes_count column to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;

-- 2. Create organization_likes table
CREATE TABLE IF NOT EXISTS public.organization_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- 3. Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_likes_org_id ON public.organization_likes(org_id);
CREATE INDEX IF NOT EXISTS idx_org_likes_user_id ON public.organization_likes(user_id);

-- 4. Enable RLS on organization_likes
ALTER TABLE public.organization_likes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for organization_likes
-- Anyone can see likes
CREATE POLICY "Lectura publica de likes"
ON public.organization_likes FOR SELECT
USING (true);

-- Users can only insert their own likes
CREATE POLICY "Usuarios insertan sus propios likes"
ON public.organization_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Usuarios borran sus propios likes"
ON public.organization_likes FOR DELETE
USING (auth.uid() = user_id);

-- 6. Trigger functionality to auto-update likes_count in organizations
CREATE OR REPLACE FUNCTION sp_update_org_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.organizations
        SET likes_count = likes_count + 1
        WHERE id = NEW.org_id;
        
        -- Si llega a 50 likes, hacerlo publico y verificado automaticamente
        UPDATE public.organizations
        SET is_public = TRUE, status = 'VERIFIED'
        WHERE id = NEW.org_id AND likes_count >= 50 AND is_public = FALSE;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.organizations
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.org_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS trg_update_org_likes_count ON public.organization_likes;

-- Create trigger
CREATE TRIGGER trg_update_org_likes_count
AFTER INSERT OR DELETE ON public.organization_likes
FOR EACH ROW EXECUTE PROCEDURE sp_update_org_likes_count();

-- 7. Grant permissions
GRANT SELECT, INSERT, DELETE ON public.organization_likes TO authenticated;
GRANT SELECT ON public.organization_likes TO anon;


















--Para marketing

-- Agregar las nuevas columnas de Marketing a la tabla existente
ALTER TABLE public.loyalty_rules 
ADD COLUMN IF NOT EXISTS multiplier_monday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS multiplier_tuesday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS multiplier_wednesday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS multiplier_thursday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS multiplier_friday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS multiplier_saturday DECIMAL(3,1) NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS multiplier_sunday DECIMAL(3,1) NOT NULL DEFAULT 1.0;

-- Agregar la restricción de validación para los multiplicadores
ALTER TABLE public.loyalty_rules
ADD CONSTRAINT check_multipliers_positive CHECK (
    multiplier_monday >= 1.0 AND multiplier_tuesday >= 1.0 AND 
    multiplier_wednesday >= 1.0 AND multiplier_thursday >= 1.0 AND 
    multiplier_friday >= 1.0 AND multiplier_saturday >= 1.0 AND 
    multiplier_sunday >= 1.0
);









--Para darle temas de landing page a cada negocio
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS ui_theme VARCHAR(50) DEFAULT 'DARK';































--SCRIPTA PARA PLANES DE PAGO
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
















ALTER TABLE public.loyalty_rules ADD COLUMN IF NOT EXISTS hour_start INT NOT NULL DEFAULT 0;
ALTER TABLE public.loyalty_rules ADD COLUMN IF NOT EXISTS hour_end INT NOT NULL DEFAULT 23;












--se crea rls para las politicas
-- ==============================================================================================
-- FIX: Corrección de Políticas RLS para Marketing B2B
-- Problema: Las políticas de loyalty_rules usaban "om.role" pero la columna real es "om.role_code".
-- Problema: No existían políticas B2B para que los dueños vean wallets/users de su organización.
-- ==============================================================================================

-- ==========================================
-- 1. FIX: loyalty_rules — Corregir om.role → om.role_code
-- ==========================================

-- Eliminar las políticas viejas (con el nombre incorrecto del campo)
DROP POLICY IF EXISTS "Lectura de reglas para miembros de la organización" ON public.loyalty_rules;
DROP POLICY IF EXISTS "Modificación de reglas para dueños y administradores" ON public.loyalty_rules;
DROP POLICY IF EXISTS "Inserción de reglas para dueños y administradores" ON public.loyalty_rules;

-- Recrear con la columna correcta: role_code
CREATE POLICY "Lectura de reglas para miembros de la organización"
ON public.loyalty_rules FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = loyalty_rules.org_id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

CREATE POLICY "Modificación de reglas para dueños y administradores"
ON public.loyalty_rules FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = loyalty_rules.org_id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN')
    )
);

CREATE POLICY "Inserción de reglas para dueños y administradores"
ON public.loyalty_rules FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = loyalty_rules.org_id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 2. FIX: wallets — Agregar política B2B para que dueños vean las wallets de su org
-- ==========================================

CREATE POLICY "B2B members can view org wallets"
ON public.wallets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = wallets.org_id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- ==========================================
-- 3. FIX: users — Agregar política B2B para que dueños vean datos de clientes con wallet
-- ==========================================

CREATE POLICY "B2B members can view their org customer profiles"
ON public.users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.wallets w
        JOIN public.organization_members om ON om.org_id = w.org_id
        WHERE w.user_id = users.id
        AND om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 4. Agregar columnas de horario para multiplicadores
-- ==========================================

ALTER TABLE public.loyalty_rules
    ADD COLUMN IF NOT EXISTS hour_start INT NOT NULL DEFAULT 0;

ALTER TABLE public.loyalty_rules
    ADD COLUMN IF NOT EXISTS hour_end INT NOT NULL DEFAULT 23;






























--RLS









-- ==============================================================================================
-- MIGRACIÓN 006: Políticas RLS para auth.uid() (Compatibilidad Supabase Auth / Next.js)
-- Fecha: 2026-03-12
-- Propósito: Agregar políticas usando auth.uid() para que los Server Actions de Next.js
--            puedan operar con el cliente normal (sin Service Role), manteniendo seguridad RLS.
-- NOTA: Las políticas existentes de FastAPI (get_current_user_id) NO se eliminan.
--       PostgreSQL evalúa múltiples políticas con OR, así que ambas coexisten.
-- ==============================================================================================

-- ==========================================
-- 1. organization_members — Auto-lectura via auth.uid()
-- ==========================================
-- Permite que un usuario autenticado vea sus propias membresías.
-- Esto habilita: "¿A qué organizaciones pertenezco?" y "¿Cuál es mi rol?"

CREATE POLICY "Auth: Usuarios ven sus propias membresias"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

-- Permite que miembros OWNER/ADMIN vean a todo el staff de su organización
CREATE POLICY "Auth: Owners ven staff de su org"
ON public.organization_members FOR SELECT
USING (
    org_id IN (
        SELECT om.org_id FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN')
    )
);

-- Permite INSERT para onboarding (crear membresía de OWNER al registrar negocio)
-- NOTA: Solo el Service Role debería insertar en producción, pero lo habilitamos para el flujo de Next.js
CREATE POLICY "Auth: Insertar membresia propia"
ON public.organization_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ==========================================
-- 2. organizations — Lectura via membresía con auth.uid()
-- ==========================================
-- Permite que un miembro vea la organización a la que pertenece.
-- Complementa la política existente que solo muestra orgs públicas/verificadas.

CREATE POLICY "Auth: Miembros ven su propia organizacion"
ON public.organizations FOR SELECT
USING (
    id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);

-- Permite que OWNER/ADMIN actualicen su organización
CREATE POLICY "Auth: Owners actualizan su organizacion"
ON public.organizations FOR UPDATE
USING (
    id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- Permite INSERT para onboarding (crear nuevo negocio)
CREATE POLICY "Auth: Usuarios crean organizaciones"
ON public.organizations FOR INSERT
WITH CHECK (true); -- El control se hace a nivel de aplicación (onboarding flow)

-- ==========================================
-- 3. subscriptions — Lectura via membresía con auth.uid()
-- ==========================================
-- Permite que los miembros de una org vean su suscripción activa.

CREATE POLICY "Auth: Miembros ven suscripcion de su org"
ON public.subscriptions FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 4. billing_history — Lectura via membresía con auth.uid()
-- ==========================================

CREATE POLICY "Auth: Owners ven historial de facturacion"
ON public.billing_history FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 5. campaigns — CRUD via membresía con auth.uid()
-- ==========================================

CREATE POLICY "Auth: Miembros ven campañas de su org"
ON public.campaigns FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

CREATE POLICY "Auth: Owners gestionan campañas"
ON public.campaigns FOR ALL
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 6. local_rewards — CRUD via membresía con auth.uid()
-- ==========================================
-- B2C ya tiene lectura pública (is_active = TRUE).
-- Agregamos gestión B2B para OWNER/ADMIN.

CREATE POLICY "Auth: Owners gestionan premios"
ON public.local_rewards FOR ALL
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN')
    )
);

-- ==========================================
-- 7. ledger_transactions — Lectura B2B via membresía
-- ==========================================
-- El cajero/owner ve todas las transacciones de su negocio.

CREATE POLICY "Auth: Miembros ven transacciones de su org"
ON public.ledger_transactions FOR SELECT
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- Permite INSERT para crear transacciones desde el POS (Next.js)
CREATE POLICY "Auth: Cajeros crean transacciones"
ON public.ledger_transactions FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- ==========================================
-- 8. wallets — INSERT para crear wallets desde POS
-- ==========================================
-- La política de SELECT B2B ya fue agregada en 005.
-- Agregamos INSERT para que el POS pueda crear wallets.

CREATE POLICY "Auth: Cajeros crean wallets para clientes"
ON public.wallets FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- ==========================================
-- 9. users — INSERT para crear Ghost Users desde POS
-- ==========================================
-- Permite que el POS cree usuarios fantasma al dar puntos.

CREATE POLICY "Auth: Cajeros crean usuarios ghost"
ON public.users FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
        AND om.role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
);

-- ==========================================
-- 10. security_logs — Lectura B2B via membresía
-- ==========================================

CREATE POLICY "Auth: Owners ven logs de seguridad de su org"
ON public.security_logs FOR SELECT
USING (
    target_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER')
    )
);

-- ==========================================
-- 11. api_credentials — CRUD solo OWNER
-- ==========================================

CREATE POLICY "Auth: Owners gestionan API credentials"
ON public.api_credentials FOR ALL
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code = 'OWNER'
    )
);








































--CORRECCIÓN PORQUE NO ENTRABA EL OWNER AL NEGOCIO - DASCHBOARD
-- ==============================================================================================
-- MIGRACIÓN 007: Fix RLS Circular Dependency (organizations ↔ organization_members)
-- Fecha: 2026-03-12
-- Problema: La política de organizations hace un subquery a organization_members,
--           pero organization_members TAMBIÉN tiene RLS. Esto crea una dependencia
--           circular que hace que PostgreSQL no pueda evaluar ninguna de las dos.
-- Solución: Crear una función SECURITY DEFINER que bypasea RLS internamente.
--           Luego reescribir las políticas para usar esa función.
-- ==============================================================================================

-- 1. FUNCIÓN HELPER: Obtiene los org_ids del usuario autenticado
-- SECURITY DEFINER = se ejecuta con los permisos del OWNER de la función (postgres),
-- bypasseando RLS dentro de la función. Es seguro porque solo devuelve org_ids
-- del usuario autenticado (auth.uid()).
CREATE OR REPLACE FUNCTION public.get_auth_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM public.organization_members
    WHERE user_id = auth.uid()
$$;

-- 2. FUNCIÓN HELPER: Obtiene los org_ids donde el usuario es OWNER/ADMIN
CREATE OR REPLACE FUNCTION public.get_auth_user_admin_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM public.organization_members
    WHERE user_id = auth.uid()
    AND role_code IN ('OWNER', 'ADMIN')
$$;

-- 3. FUNCIÓN HELPER: Obtiene los org_ids donde el usuario es OWNER/ADMIN/CASHIER
CREATE OR REPLACE FUNCTION public.get_auth_user_staff_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM public.organization_members
    WHERE user_id = auth.uid()
    AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
$$;

-- 4. FUNCIÓN HELPER: Verifica si el usuario es staff en alguna org
CREATE OR REPLACE FUNCTION public.is_auth_user_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code IN ('OWNER', 'ADMIN', 'CASHIER')
    )
$$;

-- ==========================================
-- REESCRIBIR POLÍTICAS DE 006 USANDO LAS FUNCIONES HELPER
-- ==========================================

-- == organizations ==
DROP POLICY IF EXISTS "Auth: Miembros ven su propia organizacion" ON public.organizations;
CREATE POLICY "Auth: Miembros ven su propia organizacion"
ON public.organizations FOR SELECT
USING (id IN (SELECT public.get_auth_user_org_ids()));

DROP POLICY IF EXISTS "Auth: Owners actualizan su organizacion" ON public.organizations;
CREATE POLICY "Auth: Owners actualizan su organizacion"
ON public.organizations FOR UPDATE
USING (id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == organization_members ==
-- La self-read policy NO necesita cambiar (no tiene subquery circular)
-- Pero la "Owners ven staff" SÍ hace subquery, hay que arreglarla:
DROP POLICY IF EXISTS "Auth: Owners ven staff de su org" ON public.organization_members;
CREATE POLICY "Auth: Owners ven staff de su org"
ON public.organization_members FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == subscriptions ==
DROP POLICY IF EXISTS "Auth: Miembros ven suscripcion de su org" ON public.subscriptions;
CREATE POLICY "Auth: Miembros ven suscripcion de su org"
ON public.subscriptions FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == billing_history ==
DROP POLICY IF EXISTS "Auth: Owners ven historial de facturacion" ON public.billing_history;
CREATE POLICY "Auth: Owners ven historial de facturacion"
ON public.billing_history FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == campaigns ==
DROP POLICY IF EXISTS "Auth: Miembros ven campañas de su org" ON public.campaigns;
CREATE POLICY "Auth: Miembros ven campañas de su org"
ON public.campaigns FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

DROP POLICY IF EXISTS "Auth: Owners gestionan campañas" ON public.campaigns;
CREATE POLICY "Auth: Owners gestionan campañas"
ON public.campaigns FOR ALL
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == local_rewards ==
DROP POLICY IF EXISTS "Auth: Owners gestionan premios" ON public.local_rewards;
CREATE POLICY "Auth: Owners gestionan premios"
ON public.local_rewards FOR ALL
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- == ledger_transactions ==
DROP POLICY IF EXISTS "Auth: Miembros ven transacciones de su org" ON public.ledger_transactions;
CREATE POLICY "Auth: Miembros ven transacciones de su org"
ON public.ledger_transactions FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

DROP POLICY IF EXISTS "Auth: Cajeros crean transacciones" ON public.ledger_transactions;
CREATE POLICY "Auth: Cajeros crean transacciones"
ON public.ledger_transactions FOR INSERT
WITH CHECK (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

-- == wallets ==
DROP POLICY IF EXISTS "Auth: Cajeros crean wallets para clientes" ON public.wallets;
CREATE POLICY "Auth: Cajeros crean wallets para clientes"
ON public.wallets FOR INSERT
WITH CHECK (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

-- == users ==
-- Staff members can read basic details of users who are members of their organizations
DROP POLICY IF EXISTS "Auth: Staff ve usuarios de su org" ON public.users;
CREATE POLICY "Auth: Staff ve usuarios de su org"
ON public.users FOR SELECT
USING (
    id IN (
        SELECT dom.user_id FROM public.organization_members dom
        WHERE dom.org_id IN (SELECT public.get_auth_user_staff_org_ids())
    )
);

DROP POLICY IF EXISTS "Auth: Cajeros crean usuarios ghost" ON public.users;
CREATE POLICY "Auth: Cajeros crean usuarios ghost"
ON public.users FOR INSERT
WITH CHECK (public.is_auth_user_staff());

-- == security_logs ==
DROP POLICY IF EXISTS "Auth: Owners ven logs de seguridad de su org" ON public.security_logs;
CREATE POLICY "Auth: Owners ven logs de seguridad de su org"
ON public.security_logs FOR SELECT
USING (
    target_id IN (SELECT public.get_auth_user_admin_org_ids())
);

-- == api_credentials ==
DROP POLICY IF EXISTS "Auth: Owners gestionan API credentials" ON public.api_credentials;
CREATE POLICY "Auth: Owners gestionan API credentials"
ON public.api_credentials FOR ALL
USING (
    org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role_code = 'OWNER'
    )
);

-- ==========================================
-- POLÍTICA ADICIONAL: loyalty_rules lectura para staff (faltaba en 006)
-- ==========================================
-- El POS necesita leer loyalty_rules para aplicar multiplicadores
DROP POLICY IF EXISTS "Auth: Staff lee reglas de lealtad de su org" ON public.loyalty_rules;
CREATE POLICY "Auth: Staff lee reglas de lealtad de su org"
ON public.loyalty_rules FOR SELECT
USING (org_id IN (SELECT public.get_auth_user_staff_org_ids()));

-- UPDATE para owners (guardar configuración de marketing)
DROP POLICY IF EXISTS "Auth: Owners actualizan reglas de lealtad" ON public.loyalty_rules;
CREATE POLICY "Auth: Owners actualizan reglas de lealtad"
ON public.loyalty_rules FOR UPDATE
USING (org_id IN (SELECT public.get_auth_user_admin_org_ids()));

-- INSERT para onboarding (crear reglas default al crear negocio)
DROP POLICY IF EXISTS "Auth: Owners crean reglas de lealtad" ON public.loyalty_rules;
CREATE POLICY "Auth: Owners crean reglas de lealtad"
ON public.loyalty_rules FOR INSERT
WITH CHECK (org_id IN (SELECT public.get_auth_user_admin_org_ids()));




































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




























-- ==============================================================================================
-- SCRIPT DE LIMPIEZA TOTAL (WIPE DATA MVP)
-- ADVERTENCIA EXTREMA: Ejecutar esto borrará todos los usuarios, comercios, puntos y transacciones.
-- ==============================================================================================

-- 1. TRUNCATE a todas las tablas de datos (Mantiene la estructura intacta)
-- Usamos CASCADE para que PostgreSQL se encargue de seguir los hilos de dependencias
-- y borrar todo el árbol de información conectada.
TRUNCATE TABLE 
    public.ledger_transactions,
    public.wallets,
    public.organization_members,
    public.loyalty_rules,
    public.b2b_discounts,
    public.subscriptions,
    public.billing_history,
    public.organizations,
    public.users 
CASCADE;

-- NOTA IMPORTANTE PARA EL TEMA DE USUARIOS (AUTH):
-- Este script limpia la tabla "public.users" (los perfiles). 
-- PERO no puede borrar las credenciales de correo/Google porque esas viven en un
-- esquema protegido de Supabase llamado "auth.users".
-- 
-- Si truncas esto y luego intentas iniciar sesión con una cuenta de Google que ya usabas, 
-- la app podría romperse porque Supabase recordará el correo pero no encontrará el perfil.
-- 
-- PASO OBLIGATORIO DESPUÉS DE ESTE SCRIPT:
-- Ve al panel lateral izquierdo de Supabase -> "Authentication" -> "Users"
-- Y elimina manualmente a todos los usuarios de prueba desde la interfaz web.
-- Así, la próxima vez que entres, el sistema los creará desde cero como nuevos.















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
-- Cualquier usuario autenticado (auth.uid() IS NOT NULL) puede crear un registro
-- El control de "máximo un negocio por usuario" se maneja en el Backend (Server Actions).
DROP POLICY IF EXISTS "Auth: Usuarios crean organizaciones" ON public.organizations;
CREATE POLICY "Auth: Usuarios crean organizaciones"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Asegurar INSERT para Organization Members
-- Cualquier usuario puede insertarse a sí mismo (user_id = auth.uid()) como miembro 
-- de una nueva organización que acaba de crear.
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





































-- ==============================================================================================
-- MIGRACIÓN 015: Evolución de Premios Genéricos -> Descuentos Estrictos
-- Fecha: 2026-03-13
-- Propósito: Reemplazar la tabla genérica `local_rewards` por `b2b_discounts`, un modelo financiero
--            estricto donde los únicos incentivos permitidos son Descuentos con reglas validadas 
--            a nivel de base de datos (Seguridad Bancaria).
-- ==============================================================================================

-- 0. Eliminar tabla anterior (Desarrollo — en producción se haría ALTER TABLE + migración de datos)
DROP TABLE IF EXISTS public.local_rewards CASCADE;

-- 1. Crear tabla de Descuentos B2B
CREATE TABLE public.b2b_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- ═══════ CAMPOS OBLIGATORIOS (Requeridos por el usuario) ═══════
    description TEXT NOT NULL,                                        -- "90% de descuento en lácteos"
    discount_percentage INT NOT NULL,                                 -- 90 (representa 90%)
    max_discount_amount DECIMAL(12,2) NOT NULL,                       -- 20.00 (límite en moneda local)
    min_quantity INT NOT NULL DEFAULT 1,                               -- Stock mínimo a entregar (Ej: 30)
    restrictions TEXT,                                                -- Condiciones legales / productos excluidos
    points_cost INT NOT NULL DEFAULT 0,                               -- Cuántos puntos cuesta canjear (0 = sin costo de puntos)

    -- ═══════ CAMPOS COMPLEMENTARIOS (Recomendados para un sistema de lealtad completo) ═══════
    total_inventory INT NOT NULL DEFAULT 0,                           -- Stock total disponible para canjear
    redeemed_count INT NOT NULL DEFAULT 0,                            -- Cuántos se han canjeado (se incrementa con cada canje)
    expires_at TIMESTAMP WITH TIME ZONE,                              -- Fecha de expiración (NULL = sin expiración)
    
    -- ═══════ ESTADO Y AUDITORÍA ═══════
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id UUID REFERENCES auth.users(id),                -- Quién lo creó (Auditoría)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- ═══════ RESTRICCIONES DE INTEGRIDAD FINANCIERA (Nivel Bancario) ═══════
    CONSTRAINT chk_discount_percentage CHECK (discount_percentage BETWEEN 1 AND 100),
    CONSTRAINT chk_max_discount_positive CHECK (max_discount_amount > 0),
    CONSTRAINT chk_min_quantity_positive CHECK (min_quantity >= 1),
    CONSTRAINT chk_total_inventory_positive CHECK (total_inventory >= 0),
    CONSTRAINT chk_redeemed_not_exceed CHECK (redeemed_count >= 0 AND redeemed_count <= total_inventory),
    CONSTRAINT chk_points_cost_positive CHECK (points_cost >= 1)
);

-- 2. Índices para rendimiento
CREATE INDEX idx_b2b_discounts_org_id ON public.b2b_discounts(org_id);
CREATE INDEX idx_b2b_discounts_active ON public.b2b_discounts(org_id, is_active) WHERE is_active = TRUE;

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION sp_b2b_discounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_b2b_discounts_updated_at
BEFORE UPDATE ON public.b2b_discounts
FOR EACH ROW
EXECUTE FUNCTION sp_b2b_discounts_updated_at();

-- 4. Row Level Security (RLS) — Seguridad Bancaria Estricta
ALTER TABLE public.b2b_discounts ENABLE ROW LEVEL SECURITY;

-- 4a. Lectura Pública de Descuentos Activos (Los clientes necesitan verlos)
CREATE POLICY "Lectura publica de descuentos activos"
ON public.b2b_discounts FOR SELECT
USING (is_active = TRUE);

-- 4b. Lectura Completa para Miembros de la Organización (Incluye inactivos)
CREATE POLICY "Miembros ven todos sus descuentos"
ON public.b2b_discounts FOR SELECT
USING (
    org_id IN (SELECT get_auth_user_org_ids() AS get_auth_user_org_ids)
);

-- 4c. INSERT: Solo OWNER/ADMIN de la Org pueden crear descuentos
CREATE POLICY "Owners crean descuentos"
ON public.b2b_discounts FOR INSERT
WITH CHECK (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- 4d. UPDATE: Solo OWNER/ADMIN de la Org pueden modificar descuentos
CREATE POLICY "Owners actualizan descuentos"
ON public.b2b_discounts FOR UPDATE
USING (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- 4e. DELETE: Solo OWNER/ADMIN de la Org pueden eliminar descuentos
CREATE POLICY "Owners eliminan descuentos"
ON public.b2b_discounts FOR DELETE
USING (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- NOTA: Las funciones `get_auth_user_org_ids()` y `get_auth_user_admin_org_ids()` 
-- fueron creadas en la migración 007_fix_rls_circular.sql y son reutilizadas aquí
-- para mantener consistencia y evitar dependencias circulares en las políticas RLS.


























-- ==============================================================================================
-- MIGRACIÓN 016: Soft Delete para Descuentos — Seguridad Bancaria (Inmutabilidad de Datos)
-- Fecha: 2026-03-14
-- Propósito: Eliminar el campo booleano is_active y reemplazarlo por un campo status de tipo enum,
--            permitiendo auditorías y trazabilidad completa. En seguridad bancaria, los datos 
--            NUNCA se eliminan físicamente; se marcan como eliminados con timestamp de auditoría.
-- ==============================================================================================

-- 1. Crear el tipo ENUM para los estados del descuento
DO $$ BEGIN
    CREATE TYPE discount_status AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Agregar la nueva columna status con valor por defecto ACTIVE
ALTER TABLE public.b2b_discounts
ADD COLUMN IF NOT EXISTS status discount_status NOT NULL DEFAULT 'ACTIVE';

-- 3. Agregar columnas de auditoría para soft delete
ALTER TABLE public.b2b_discounts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID REFERENCES auth.users(id);

-- 4. Migrar datos existentes: is_active = true → ACTIVE, is_active = false → INACTIVE
UPDATE public.b2b_discounts SET status = 'ACTIVE' WHERE is_active = TRUE;
UPDATE public.b2b_discounts SET status = 'INACTIVE' WHERE is_active = FALSE;

-- 5. PRIMERO eliminar policies que dependen de is_active (resolver dependencia)
DROP POLICY IF EXISTS "Lectura publica de descuentos activos" ON public.b2b_discounts;
DROP POLICY IF EXISTS "Miembros ven todos sus descuentos" ON public.b2b_discounts;
DROP POLICY IF EXISTS "Owners crean descuentos" ON public.b2b_discounts;
DROP POLICY IF EXISTS "Owners actualizan descuentos" ON public.b2b_discounts;
DROP POLICY IF EXISTS "Owners eliminan descuentos" ON public.b2b_discounts;

-- 6. AHORA sí eliminar el campo booleano antiguo (dependencias ya eliminadas)
ALTER TABLE public.b2b_discounts DROP COLUMN IF EXISTS is_active;

-- 7. Índices optimizados para el nuevo campo status
DROP INDEX IF EXISTS idx_b2b_discounts_active;
CREATE INDEX IF NOT EXISTS idx_b2b_discounts_status ON public.b2b_discounts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_b2b_discounts_active_status ON public.b2b_discounts(org_id, status) WHERE status = 'ACTIVE';

-- 7a. Lectura Pública: Solo descuentos ACTIVOS (los DELETED e INACTIVE son invisibles al público)
CREATE POLICY "Lectura publica de descuentos activos"
ON public.b2b_discounts FOR SELECT
USING (status = 'ACTIVE');

-- 7b. Miembros de la Org ven ACTIVE e INACTIVE (NO ven DELETED — solo auditoría interna)
CREATE POLICY "Miembros ven descuentos no eliminados"
ON public.b2b_discounts FOR SELECT
USING (
    status IN ('ACTIVE', 'INACTIVE')
    AND org_id IN (SELECT get_auth_user_org_ids() AS get_auth_user_org_ids)
);

-- 7c. INSERT: Solo OWNER/ADMIN
CREATE POLICY "Owners crean descuentos"
ON public.b2b_discounts FOR INSERT
WITH CHECK (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- 7d. UPDATE: Solo OWNER/ADMIN (para toggle y soft delete)
CREATE POLICY "Owners actualizan descuentos"
ON public.b2b_discounts FOR UPDATE
USING (
    org_id IN (SELECT get_auth_user_admin_org_ids() AS get_auth_user_admin_org_ids)
);

-- 7e. DELETE físico: PROHIBIDO (No se permite DELETE en esta tabla — seguridad bancaria)
-- No se crea policy de DELETE = Nadie puede hacer hard delete, ni siquiera OWNER/ADMIN.
-- Toda "eliminación" es un UPDATE a status = 'DELETED'.

-- ═══════ NOTAS DE SEGURIDAD BANCARIA ═══════
-- • Los descuentos NUNCA se eliminan físicamente de la base de datos
-- • status = 'DELETED' marca el registro como eliminado + deleted_at registra cuándo
-- • deleted_by_user_id registra QUIÉN lo eliminó (trazabilidad completa)
-- • La policy de SELECT para miembros excluye DELETED, pero los registros persisten
-- • Solo un superadmin con acceso directo a la BD podría ver registros DELETED
-- • Esto cumple con estándares de auditoría financiera (SOX, PCI-DSS)



























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

-- ==============================================================================================
-- MIGRACIÓN 019: INFRAESTRUCTURA MOTOR ANTI-FRAUDE KYB (Know Your Business)
-- Fecha: 2026-03-24
-- Propósito: Prepara la base de datos para exigencias documentarias (DNI/Poder) y anade el Master Switch.
-- ==============================================================================================

-- 0. Tabla de Super Administradores Globales (Zero-Trust Master Keys)
CREATE TABLE IF NOT EXISTS public.super_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    added_by UUID REFERENCES auth.users(id), -- Quién lo ascendió
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================================
-- FUNCIÓN ANTI-RECURSIÓN: SECURITY DEFINER se salta el RLS interno,
-- rompiendo el ciclo infinito de "para leer super_admins, necesito leer super_admins".
-- Es el equivalente a un bypass quirúrgico controlado.
-- ======================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Blindamos la función: solo usuarios autenticados pueden invocarla
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- NOTA: El primer Super Admin (el CEO fundador) DEBE ser insertado manualmente 
-- desde el SQL Editor o Supabase Studio por seguridad física.
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Limpiamos políticas anteriores para evitar duplicados
DROP POLICY IF EXISTS "SuperAdmins look up" ON public.super_admins;
DROP POLICY IF EXISTS "SuperAdmins delegate" ON public.super_admins;
DROP POLICY IF EXISTS "SuperAdmins revoke" ON public.super_admins;

-- SELECT: Un super admin ve su propia fila (auth.uid() = user_id) SIN subquery recursiva
CREATE POLICY "SuperAdmins look up" ON public.super_admins FOR SELECT USING (
    (auth.jwt()->>'email' LIKE '%@aynipoint.com') OR 
    (auth.uid() = user_id)
);
-- INSERT/DELETE: Usamos la función SECURITY DEFINER que ya rompió el ciclo
CREATE POLICY "SuperAdmins delegate" ON public.super_admins FOR INSERT WITH CHECK (
    public.is_super_admin()
);
CREATE POLICY "SuperAdmins revoke" ON public.super_admins FOR DELETE USING (
    public.is_super_admin()
);

-- 1. Tabla de Configuración Global (Super-Admin Feature Flags)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Limpiamos políticas anteriores
DROP POLICY IF EXISTS "Public read for system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Lectura publica configuracion" ON public.system_settings;
DROP POLICY IF EXISTS "Modificacion Zero-Trust (Solo SuperAdmins)" ON public.system_settings;
DROP POLICY IF EXISTS "Insercion Zero-Trust (Solo SuperAdmins)" ON public.system_settings;

CREATE POLICY "Lectura publica configuracion" ON public.system_settings FOR SELECT USING (TRUE);

-- UPDATE e INSERT ahora usan la función segura sin recursión
CREATE POLICY "Modificacion Zero-Trust (Solo SuperAdmins)"
ON public.system_settings FOR UPDATE USING (
    public.is_super_admin()
);

CREATE POLICY "Insercion Zero-Trust (Solo SuperAdmins)"
ON public.system_settings FOR INSERT WITH CHECK (
    public.is_super_admin()
);

-- Habilitar KYB por defecto en OFF (Growth-First)
INSERT INTO public.system_settings (key, value, description)
VALUES ('require_kyb_verification', 'false'::jsonb, 'Exige a los comercios subir su DNI/Poder para operar y ser visibles.')
ON CONFLICT (key) DO NOTHING;

-- 2. Expandir tabla Organizations para alocar documentos KYB
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS kyb_documents JSONB DEFAULT '[]'::jsonb;

-- 3. Crear Storage Bucket para KYB protegido (RLS Estricto a nivel bancario)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyb_vault', 'kyb_vault', false, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;






























-- ============================================================
-- MIGRACIÓN: C-05 — Función atómica para actualizar saldo de wallet
-- Evita race conditions (TOCTOU) en operaciones de refund concurrentes.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================



























-- ============================================================
-- 019: Vista v_user_wallet_summary (Vol 6.6 del Spec)
-- 
-- Propósito: Evita JOINs repetidos en POS, Dashboard y CRM.
-- NO reemplaza lógica existente — es puramente aditiva.
--
-- SEGURIDAD BANCARIA: security_invoker = true garantiza que esta
-- vista obedezca las políticas RLS de las tablas base (wallets,
-- users, organizations). Sin esto, la vista ejecutaría con
-- privilegios del owner (superuser) y bypassearía todo el RLS.
--
-- FIX: Se usa DROP + CREATE en vez de CREATE OR REPLACE porque
-- PostgreSQL no permite renombrar columnas con REPLACE.
-- ============================================================

-- Eliminar versión anterior si existe (seguro, la vista no tiene dependencias)
DROP VIEW IF EXISTS public.v_user_wallet_summary;

CREATE VIEW public.v_user_wallet_summary WITH (security_invoker = true) AS
SELECT 
    w.id          AS wallet_id,
    w.org_id,
    w.user_id,
    w.balance,
    w.lifetime_earned,
    w.last_transaction_at,
    w.created_at  AS wallet_created_at,
    u.phone,
    u.full_name,
    u.email,
    u.is_registered,
    u.avatar_url,
    o.commercial_name AS org_name,
    o.slug            AS org_slug,
    o.currency_symbol,
    o.short_code      AS org_short_code
FROM public.wallets w
JOIN public.users u          ON u.id = w.user_id
JOIN public.organizations o  ON o.id = w.org_id;

-- Documentación de la vista
COMMENT ON VIEW public.v_user_wallet_summary IS 
    'Vol 6.6: Vista de resumen de wallets con datos de usuario y organización. '
    'Optimiza JOINs repetidos en POS, Dashboard y CRM. '
    'SECURITY INVOKER: Hereda RLS de las tablas subyacentes.';






















