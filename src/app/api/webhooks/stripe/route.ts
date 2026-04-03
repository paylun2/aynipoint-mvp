import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
    try {
        const payload = await req.text();
        const signature = req.headers.get('stripe-signature');

        if (!signature || !webhookSecret) {
            return NextResponse.json({ error: 'Missing stripe signature or secret' }, { status: 400 });
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (err: any) {
            // ✅ S4-08 FIX: No exponer detalles de error de Stripe al exterior
            console.error('[Webhook: Stripe] Signature verification failed:', err.message);
            return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const orgId = session.client_reference_id;
            const metadata = session.metadata;

            if (orgId && metadata?.plan_tier === 'PRO') {
                const cycle = metadata.billing_cycle || 'MONTHLY';
                
                // Initialize Admin Supabase Client (bypassing RLS to write to subscription table safely)
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                const { error: subError } = await supabaseAdmin
                    .from('subscriptions')
                    .update({
                        plan_tier: 'PRO',
                        billing_cycle: cycle,
                        status: 'ACTIVE',
                        payment_gateway_subscription_id: session.id,
                        current_period_start: new Date().toISOString(),
                        current_period_end: new Date(new Date().setMonth(new Date().getMonth() + (cycle === 'ANNUAL' ? 12 : 1))).toISOString()
                    })
                    .eq('org_id', orgId);

                if (subError) console.error('Stripe update error (sub):', subError);

                const { error: historyError } = await supabaseAdmin
                    .from('billing_history')
                    .insert({
                        org_id: orgId,
                        amount_cents: session.amount_total || 0,
                        currency: session.currency?.toUpperCase() || 'USD',
                        status: 'PAID',
                        invoice_url: session.url || null
                    });
                if (historyError) console.error('Stripe update error (history):', historyError);
                
                // --- MÓDULO KYB: AUTO-VERIFICACIÓN PARA CLIENTES PRO ---
                const { error: orgError } = await supabaseAdmin
                    .from('organizations')
                    .update({ status: 'VERIFIED' })
                    .eq('id', orgId);
                    
                if (orgError) console.error('Stripe update error (org KYB):', orgError);
                
                console.log(`[Webhook: Stripe] Org ${orgId} upgraded to PRO (${cycle}) and VERIFIED.`);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (err: any) {
        console.error('Stripe Webhook Error:', err.message);
        return NextResponse.json({ error: 'Webhook Handler Failed' }, { status: 500 });
    }
}
