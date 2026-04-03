/**
 * ✅ C-04 FIX: Módulo de cifrado de teléfonos para QR codes.
 *
 * ANTES: Usaba NEXT_PUBLIC_QR_SECRET que se exponía en el bundle del navegador.
 * AHORA: Usa QR_ENCRYPTION_KEY (sin NEXT_PUBLIC_) que solo existe en el servidor.
 *
 * Esta función SOLO debe invocarse desde Server Actions o API Routes.
 * Si necesitas generar/leer QR en el cliente, hazlo a través de una Server Action.
 */
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

// ✅ C-04 FIX: Clave privada del servidor (NUNCA expuesta al cliente)
function getEncryptionKey(): string {
    const key = process.env.QR_ENCRYPTION_KEY;
    if (!key || key.length < 16) {
        throw new Error(
            'QR_ENCRYPTION_KEY no está configurado o es demasiado débil. ' +
            'Configura una variable de entorno con al menos 16 caracteres.'
        );
    }
    return key;
}

/**
 * Encrypts a phone number into an alphanumeric string safe for QR codes.
 * ⚠️ SOLO llamar desde Server Actions / API Routes.
 */
export function encryptPhone(phone: string): string {
    if (!phone) return '';
    try {
        const encrypted = AES.encrypt(phone, getEncryptionKey()).toString();
        return encodeURIComponent(encrypted);
    } catch (e) {
        console.error("Encryption error:", e);
        return '';
    }
}

/**
 * Decrypts a QR payload back into the phone number.
 * ⚠️ SOLO llamar desde Server Actions / API Routes.
 */
export function decryptPhone(encryptedPayload: string): string {
    if (!encryptedPayload) return '';
    try {
        const decoded = decodeURIComponent(encryptedPayload);
        const bytes = AES.decrypt(decoded, getEncryptionKey());
        return bytes.toString(Utf8);
    } catch (e) {
        console.error("Decryption error:", e);
        return '';
    }
}
