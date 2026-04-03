import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// ✅ C-03 FIX: Eliminar TODOS los fallbacks hardcodeados.
// En producción, si estas variables no existen, el webhook debe fallar ruidosamente.
const META_WHATSAPP_TOKEN = process.env.META_WHATSAPP_TOKEN;
const META_APP_SECRET = process.env.META_APP_SECRET;
const JWT_PRIVATE_KEY = process.env.JWT_SECRET;

export async function GET(req: NextRequest) {
    // Verificación del Webhook (Handshake de Meta)
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (!META_WHATSAPP_TOKEN) {
        console.error("[Webhook: WhatsApp] META_WHATSAPP_TOKEN no configurado");
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (mode === "subscribe" && token === META_WHATSAPP_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
}

export async function POST(req: NextRequest) {
    try {
        // ✅ C-03 FIX: Validar que los secretos existan ANTES de procesar
        if (!META_APP_SECRET || !JWT_PRIVATE_KEY) {
            console.error("[Webhook: WhatsApp] META_APP_SECRET o JWT_SECRET no configurado");
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }

        // 1. Validar la firma de Meta (Seguridad) — ✅ C-03 FIX: SIEMPRE validar, no solo en producción
        const signature = req.headers.get("x-hub-signature-256");
        const bodyText = await req.text();

        if (!signature) {
            console.error("[Webhook: WhatsApp] Firma de Meta ausente");
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
        }

        const hmac = crypto.createHmac("sha256", META_APP_SECRET);
        const digest = "sha256=" + hmac.update(bodyText).digest("hex");

        // Comparación en tiempo constante para prevenir timing attacks
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
            console.error("[Webhook: WhatsApp] Firma de Meta inválida — posible ataque");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const body = JSON.parse(bodyText);

        // 2. Extraer datos del mensaje
        if (body.object === "whatsapp_business_account") {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            if (value?.messages && value.messages.length > 0) {
                const message = value.messages[0];
                const fromPhone = message.from;
                const textBody = message.text?.body || "";

                console.debug(`[Webhook: WhatsApp] Mensaje recibido de ***${fromPhone.slice(-3)}`);

                // 3. Lógica de Parseo (Buscar el short_code "BRV-8X2")
                const match = textBody.match(/validate in ([A-Z0-9-]{7})/i) || textBody.match(/validar cuenta en ([A-Z0-9-]{7})/i);

                if (match && match[1]) {
                    const shortCode = match[1];
                    console.debug(`[Webhook: WhatsApp] Validación solicitada para comercio: ${shortCode}`);

                    // 4. Generar JWT (Enlace Mágico) — usando clave verificada del .env
                    const payload = {
                        scope: "identity_merge",
                        target_phone: fromPhone,
                        origin_org_code: shortCode,
                        nonce: crypto.randomBytes(16).toString("hex"),
                    };

                    const magicToken = jwt.sign(payload, JWT_PRIVATE_KEY, { expiresIn: '15m' });

                    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
                    if (!appUrl && process.env.NODE_ENV === 'production') {
                        console.error('[Webhook: WhatsApp] NEXT_PUBLIC_APP_URL no configurado en producción');
                        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
                    }
                    const effectiveUrl = appUrl || 'http://localhost:3000';
                    const magicLink = `${effectiveUrl}/auth/claim?token=${magicToken}`;

                    console.debug('[Webhook: WhatsApp] Magic link generado correctamente');

                    // 5. Responder al cliente vía Meta WhatsApp API
                    // await sendWhatsAppMessage(fromPhone, `...`);
                }
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error("Error procesando webhook de WhatsApp:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
