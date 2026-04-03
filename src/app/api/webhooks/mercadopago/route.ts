import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Webhook payload typings based on Mercado Pago docs
type WebhookEvent = {
    action: string;
    api_version: string;
    data: { id: string };
    date_created: string;
    id: number;
    live_mode: boolean;
    type: string;
    user_id: string;
};

// Secret defined in MP dashboard to verify webhook authenticity
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET;

export async function POST(request: Request) {
    try {
        // ✅ C-02 FIX: Verificación HMAC-SHA256 de firma de MercadoPago
        // Sin esto, cualquier atacante podría enviar un POST falso y ascender una org a PRO gratis.
        const rawBody = await request.text();

        if (WEBHOOK_SECRET) {
            const xSignature = request.headers.get('x-signature');
            const xRequestId = request.headers.get('x-request-id');

            if (!xSignature || !xRequestId) {
                console.error('[Webhook: MP] Missing x-signature or x-request-id headers');
                return NextResponse.json({ error: 'Missing security headers' }, { status: 401 });
            }

            // MercadoPago firma: ts=<timestamp>,v1=<hash>
            const parts = xSignature.split(',');
            const tsHeader = parts.find(p => p.trim().startsWith('ts='))?.split('=')[1];
            const v1Header = parts.find(p => p.trim().startsWith('v1='))?.split('=')[1];

            if (!tsHeader || !v1Header) {
                console.error('[Webhook: MP] Malformed x-signature header');
                return NextResponse.json({ error: 'Malformed signature' }, { status: 401 });
            }

            // Obtener el data.id del JSON para la validación
            const parsedForId = JSON.parse(rawBody);
            const dataId = parsedForId?.data?.id;

            // Construir el manifest como lo documenta MercadoPago
            const manifest = `id:${dataId};request-id:${xRequestId};ts:${tsHeader};`;
            const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
            const computedHash = hmac.update(manifest).digest('hex');

            if (computedHash !== v1Header) {
                console.error('[Webhook: MP] Firma HMAC inválida — posible ataque');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        } else {
            console.warn('[Webhook: MP] ⚠️ MERCADOPAGO_WEBHOOK_SECRET no definido. Webhook NO verificado.');
        }

        const payload: WebhookEvent = JSON.parse(rawBody);
        
        // We only care about payment updates
        if (payload.type === 'payment') {
            const paymentId = payload.data.id;
            
            // 2. Fetch actual payment data from Mercado Pago securely
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
                }
            });

            if (!mpResponse.ok) {
                console.error('Failed to fetch payment details from MP', await mpResponse.text());
                return NextResponse.json({ error: 'Failed to verify payment' }, { status: 400 });
            }

            const paymentData = await mpResponse.json();
            
            // paymentData.external_reference holds the org.id
            const orgId = paymentData.external_reference;

            // 3. If the payment was approved
            if (paymentData.status === 'approved' && orgId) {
                // Determine plan tier (monthly or annual from item description)
                const item = paymentData.additional_info?.items?.[0];
                const cycle = item?.id === 'pro_annual' ? 'ANNUAL' : 'MONTHLY';
                
                // Initialize Admin Supabase Client (bypassing RLS to write to subscription table safely)
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                // Update the subscription layer
                const { error: subError } = await supabaseAdmin
                    .from('subscriptions')
                    .update({
                        plan_tier: 'PRO',
                        billing_cycle: cycle,
                        status: 'ACTIVE',
                        payment_gateway_subscription_id: `mp_${paymentId}`,
                        current_period_start: new Date().toISOString(),
                        // Add 1 month or 1 year exactly to the current date
                        current_period_end: new Date(new Date().setMonth(new Date().getMonth() + (cycle === 'ANNUAL' ? 12 : 1))).toISOString()
                    })
                    .eq('org_id', orgId);

                if (subError) {
                    console.error('Database Error upgrading subscription:', subError);
                    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
                }

                // Add immutable record to billing_history
                const { error: historyError } = await supabaseAdmin
                    .from('billing_history')
                    .insert({
                        org_id: orgId,
                        amount_cents: paymentData.transaction_amount * 100, // store in cents
                        currency: paymentData.currency_id,
                        status: 'PAID',
                        invoice_url: paymentData.transaction_details?.external_resource_url || null
                    });
                
                if (historyError) console.error("Could not insert billing summary history:", historyError);
                
                console.log(`[Webhook: MP] Org ${orgId} upgraded to PRO (${cycle}).`);
            }
        }
        
        return NextResponse.json({ received: true }, { status: 200 });

    } catch (err: any) {
        console.error('Webhook Error:', err.message);
        return NextResponse.json({ error: 'Webhook Handler Failed' }, { status: 500 });
    }
}
