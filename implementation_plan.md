# Hardening Security Nivel 3: Aislamiento de Recompensas y Prevención de Fuerza Bruta

Este plan detalla los pasos para aplicar seguridad bancaria (PCI-DSS inspired) en el flujo de canje de puntos, inyectando RAG-Level Security sin alterar la experiencia visual ni la base de datos actual.

## Respuesta a tu Consulta de Base de Datos
> "¿Ya está preparada la bd para soportar esa llave? (@script.sql)"

**¡Sí, está preparada estructuralmente al 100%!** 
He auditado `script.sql`. Tienes dos grandes ventajas:
1. Las recompensas nacen de `public.local_rewards`, por lo que ya tienen un `id` UUID definido.
2. Tu tabla `ledger_transactions` posee una columna `metadata JSONB`. 
Por lo tanto, no necesitamos migrar (alter table) la base de datos. Redis usará el `rewardId` como candado temporal y el Ledger documentará el `rewardId` canjeado en la columna `metadata`.

---

## User Review Required

> [!IMPORTANT]
> **Decisión de Arquitectura sobre el QR (Punto 3):**
> Integrar un escáner de cámara web en el POS de caja suele ser invasivo y problemático en navegadores web de escritorio por bloqueo de permisos. Para el híbrido, el QR generado en la App B2C debe ser legible mediante un **Lector Físico de Códigos de Barras/QR** enchufado vía USB. ¿Confirmas que los comercios podrían disponer de un lector USB físico o prefieres que integremos un escáner JS (como `html5-qrcode`) en la pantalla de la caja POS?

---

## Proposed Changes

A continuación, la estructura de código que modificaremos:

### 1. Redis Store Data Link (Auth & Rate Limiters)

#### [MODIFY] `src/lib/redis.ts`
- **Cambio:** Agregar un Rate Limiter estricto (3 intentos por 5 minutos) especializado en fallos de seguridad de PIN.
- **Razón:** Cortará de tajo cualquier intento de script malicioso en la terminal del POS.

#### [MODIFY] `src/app/actions/wallet.ts`
- **Cambio:** `generateSecurityToken` ahora acepta `rewardId: string` como argumento adicional.
- **Cambio de Entropía:** Extender de 4 a 6 caracteres alfanuméricos.
- **Cambio:** La Key de Redis evolucionará a: `b2b_token:${orgId}:${numericPhone}:${rewardId}`.

### 2. B2C App (Experiencia del Cliente Final)

#### [MODIFY] `src/app/wallet/page.tsx`
- **Cambio:** Inyectar el `rewardId` hacia el prop del `SecurityTokenGenerator`.

#### [MODIFY] `src/components/b2c/RedemptionSlider.tsx`
- **Híbrido Visual:** Usar la librería recomendada de códigos QR (`react-qr-code` o estándar SVG nativo) para pintar de un lado el PIN de 6 caracteres y del otro un cuadrado QR con la cadena de autorización.
- **Payload del QR:** `AYNI|{orgId}|{phone}|{rewardId}|{token_6_digitos}`. 

### 3. POS System (Caja de Comercio B2B)

#### [MODIFY] `src/app/actions/pos.ts`
- **Cambio:** Aplicar el `Ratelimit` antes de comprobar. Si falla, sumar +1 error. Si supera 3, lanzar excepción de `BLOQUEO_TEMPORAL`.
- **Cambio:** Actualizar la validación de la llave en Redis para obligar al cajero a enviar el `rewardId` exacto que seleccionó en la interfaz.

#### [MODIFY] `src/app/b2b/[slug]/pos/page.tsx`
- **Mejora Híbrida:** Configurar el input del "Token" para que escuche silenciosamente de fondo (*Keyboard Focus / Autofocus*). Si el comerciante dispara un Lector de Pistola QR, la pistola digitalizará toda la cadena del QR rapidísimo, autocompletando el campo y dándole a "Canjear" automáticamente.

## Open Questions

1. ¿Te parece correcto subir de 4 caracteres a 6 caracteres? (Ejemplo: en vez de `3A8S` pedir `3A8S-9X`).
2. ¿Qué modelo de escaneo QR deseas para la caja?: ¿Cámara Web integrada o asumes que conectarán una pistola USB lectora QR al dispositivo? 

## Verification Plan

### Automated Tests
- Forzar fallos de PIN en la red enviando el código 3 veces incorrectamente y verificar que Redis castigue por 5 minutos el endpoint devolviendo un 429 Too Many Requests.

### Manual Verification
1. Generar PIN para canjear "Corte de Pelo".
2. Como cajero malicioso, tratar de canjear el premio "Lavado Premium" introduciendo el código legítimo del cliente.
3. Verificar que el servidor deniegue la transacción porque el candado está atado al `rewardId` en específico de "Corte de Pelo".
