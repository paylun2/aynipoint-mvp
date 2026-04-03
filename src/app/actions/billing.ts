"use server"

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import Stripe from 'stripe';
import { sanitizeError } from '@/lib/error-sanitizer';

type ActionResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Fetch the current subscription state for an organization.
 * RLS: "Auth: Miembros ven suscripcion de su org" (006)
 */
export async function getSubscription(slug: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        // Validate org — RLS: members see their own org (006)
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', slug)
            .single();

        if (orgError || !org) return { success: false, error: 'Organization not found' };

        // Verify membership — RLS: self-read (006)
        const { data: membership, error: memError } = await supabase
            .from('organization_members')
            .select('role_code')
            .eq('user_id', user.id)
            .eq('org_id', org.id)
            .single();

        if (memError || !membership) return { success: false, error: 'Not a member' };

        // Fetch subscription — RLS: OWNER/ADMIN (006)
        const { data: sub, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('org_id', org.id)
            .single();

        if (subError && subError.code !== 'PGRST116') {
            return { success: false, error: 'Failed to fetch subscription details' };
        }

        return { success: true, data: sub || null };

    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'billing') };
    }
}

/**
 * Initiate PRO Plan Upgrade (Payment Integration Pending)
 */
export async function upgradeToPro(slug: string, isAnnual: boolean): Promise<ActionResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, commercial_name')
            .eq('slug', slug)
            .single();

        if (orgError || !org) return { success: false, error: 'Organization not found' };

        // Security: Only OWNER can upgrade
        const { data: membership, error: memError } = await supabase
            .from('organization_members')
            .select('role_code')
            .eq('user_id', user.id)
            .eq('org_id', org.id)
            .single();

        if (memError || !membership || membership.role_code !== 'OWNER') {
            return { success: false, error: 'Only the Owner can upgrade the plan' };
        }

        // ✅ M-04 FIX: En producción, NEXT_PUBLIC_SITE_URL DEBE existir.
        // Un fallback a localhost rompería silenciosamente los callbacks de pago.
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (!siteUrl) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Configuración de servidor incompleta. Contacta al administrador.');
            }
            // Solo en desarrollo permitimos localhost
            console.warn('[Billing] NEXT_PUBLIC_SITE_URL no definido. Usando localhost para desarrollo.');
        }
        const effectiveSiteUrl = siteUrl || 'http://localhost:3000';
        
        let targetGateway = process.env.PREFER_STRIPE === 'true' ? 'stripe' : 'mercadopago';

        // Stripe Initiation
        if (targetGateway === 'stripe') {
            if (!process.env.STRIPE_SECRET_KEY) {
                return { success: false, error: 'Stripe no configurado por el administrador.' };
            }
            const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' as any });
            const title = `AyniPoint PRO - ${org.commercial_name} ${isAnnual ? '(Anual)' : '(Mensual)'}`;
            
            const session = await stripeClient.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: { name: title },
                            unit_amount: isAnnual ? 28800 : 2900, // $288 / $29
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                client_reference_id: org.id,
                metadata: {
                    plan_tier: 'PRO',
                    billing_cycle: isAnnual ? 'ANNUAL' : 'MONTHLY'
                },
                success_url: `${effectiveSiteUrl}/b2b/${slug}/billing?payment=success`,
                cancel_url: `${effectiveSiteUrl}/b2b/${slug}/billing?payment=canceled`,
            });
            
            return { success: true, data: { checkoutUrl: session.url } };

        } else {
            // Mercado Pago Initiation
            if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
                return { success: false, error: 'MercadoPago no configurado por el administrador.' };
            }

            const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
            const preference = new Preference(client);

            const price = isAnnual ? 990 : 99; // 99 PEN/month
            const title = `AyniPoint PRO - ${org.commercial_name} ${isAnnual ? '(Anual)' : '(Mensual)'}`;

            const response = await preference.create({
                body: {
                    items: [
                        {
                            id: isAnnual ? 'pro_annual' : 'pro_monthly',
                            title: title,
                            quantity: 1,
                            unit_price: price,
                            currency_id: 'PEN',
                        }
                    ],
                    external_reference: org.id, // Link payment to the Organization ID
                    back_urls: {
                        success: `${effectiveSiteUrl}/b2b/${slug}/billing?payment=success`,
                        failure: `${effectiveSiteUrl}/b2b/${slug}/billing?payment=failure`,
                        pending: `${effectiveSiteUrl}/b2b/${slug}/billing?payment=pending`,
                    },
                    auto_return: 'approved',
                    notification_url: `${effectiveSiteUrl}/api/webhooks/mercadopago`, // Server webhook
                }
            });

            if (!response.init_point) {
                throw new Error('No se pudo generar el enlace de pago de MercadoPago.');
            }

            return { success: true, data: { checkoutUrl: response.init_point } };
        }

    } catch (e: any) {
        console.error("Upgrade error:", e);
        return { success: false, error: sanitizeError(e, 'billing') };
    }
}
