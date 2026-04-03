// Utility module — imported by server actions, not a server action itself.

/**
 * ✅ L-01 FIX: Utilidad para sanitizar errores antes de retornarlos al cliente.
 *
 * En producción, los mensajes técnicos (nombres de tablas, columnas, errores de Supabase)
 * NUNCA deben llegar al frontend. Este módulo mapea errores internos a mensajes genéricos
 * mientras mantiene el detalle completo en los logs del servidor.
 *
 * Uso:
 *   catch (e: any) {
 *     return { success: false, error: sanitizeError(e, 'MiModulo') }
 *   }
 */

/**
 * Mensajes de error conocidos que son seguros para mostrar al usuario.
 * Si el mensaje original contiene alguno de estos, se retorna tal cual.
 */
const SAFE_ERROR_PREFIXES = [
    'No estás conectado',
    'Sesión no',
    'No autenticado',
    'No autorizado',
    'Solo el Dueño',
    'Solo el propietario',
    'Solo OWNER',
    'Nivel de Seguridad',
    'Seguridad Bancaria',
    'Aviso de Seguridad',
    'Plan FREE',
    'Organización no encontrada',
    'Miembro no encontrado',
    'Cliente no encontrado',
    'Código de comercio no encontrado',
    'No tienes permiso',
    'No tienes permisos',
    'No tienes puntos',
    'PIN de autorización',
    'PIN incorrecto',
    'MFA_REQUIRED',
    'Demasiados intentos',
    'Número de celular inválido',
    'La descripción debe',
    'El porcentaje de descuento',
    'El límite de descuento',
    'La cantidad mínima',
    'Las restricciones no',
    'El costo en puntos',
    'El inventario no',
    'La fecha de expiración',
    'Slug de organización inválido',
    'ID de descuento inválido',
    'ID de organización inválido',
    'No se puede revertir',
    'Esta transacción ya fue extornada',
    'Transacción no encontrada',
    'Tu cuenta ya está',
    'Este número ya fue',
    'El nombre comercial',
    'Ya tienes una organización',
    'Límite del Plan',
    'La función de activar',
    'Esta función ha sido deshabilitada',
    'El token de validación',
    'Token inválido',
    'Token expirado',
    'Configuración de servidor incompleta',
    'Error al crear',
    'Error al eliminar',
    'Error al actualizar',
    'Error al verificar',
    'Nombre completo es requerido',
    'Correo electrónico inválido',
    'El correo electrónico ya',
    'Acceso denegado',
    'Saldo insuficiente',
    '⚠️ Protección Anti-Fraude',
];

/**
 * Sanitiza un error para retorno seguro al cliente.
 * - Si el mensaje es "seguro" (contiene un prefijo conocido), lo retorna tal cual.
 * - Si el mensaje es técnico/desconocido, lo registra en logs y retorna genérico.
 */
export function sanitizeError(error: unknown, module: string = 'unknown'): string {
    const message = error instanceof Error
        ? error.message
        : typeof error === 'string'
            ? error
            : 'Error desconocido';

    // Verificar si es un mensaje seguro para el usuario
    const isSafe = SAFE_ERROR_PREFIXES.some(prefix => message.startsWith(prefix));
    if (isSafe) return message;

    // Log completo en el servidor (Vercel/Sentry verá esto)
    console.error(JSON.stringify({
        level: 'ERROR',
        module,
        originalMessage: message,
        timestamp: new Date().toISOString()
    }));

    // Mensaje genérico para el cliente
    return 'Ocurrió un error inesperado. Intenta nuevamente o contacta a soporte.';
}
