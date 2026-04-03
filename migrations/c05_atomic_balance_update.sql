-- ============================================================
-- MIGRACIÓN: C-05 — Función atómica para actualizar saldo de wallet
-- Evita race conditions (TOCTOU) en operaciones de refund concurrentes.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- Función RPC para actualización atómica de balance
CREATE OR REPLACE FUNCTION atomic_balance_update(
    p_wallet_id UUID,
    p_delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- Ejecuta con privilegios del owner (bypasa RLS)
SET search_path = public
AS $$
BEGIN
    UPDATE wallets
    SET balance = balance + p_delta,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet % no encontrada', p_wallet_id;
    END IF;
END;
$$;

-- Solo el service_role puede invocar esta función (seguridad bancaria)
REVOKE ALL ON FUNCTION atomic_balance_update(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION atomic_balance_update(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION atomic_balance_update(UUID, INTEGER) FROM authenticated;

-- Comentario de auditoría
COMMENT ON FUNCTION atomic_balance_update IS 'C-05 Security Fix: Atomic wallet balance update to prevent race conditions in concurrent refunds. SECURITY DEFINER, restricted to service_role only.';
