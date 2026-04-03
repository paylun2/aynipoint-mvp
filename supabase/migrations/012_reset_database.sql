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
    public.rewards,
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
