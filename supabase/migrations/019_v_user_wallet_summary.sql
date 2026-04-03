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
