'use server'

import { createClient } from '@/utils/supabase/server'
import { sanitizeError } from '@/lib/error-sanitizer'

/**
 * Obtiene datos básicos de una organización por slug.
 * RLS: "Auth: Miembros ven su propia organizacion" (006) + public orgs
 */
export async function getOrganizationBySlug(slug: string) {
    const supabase = await createClient()

    try {
        const { data: org, error } = await supabase
            .from('organizations')
            .select(`
                commercial_name, 
                currency_symbol, 
                logo_url, 
                subscription_tier,
                country_phone_rules:country (
                    country_code,
                    country_name,
                    dial_code,
                    phone_length,
                    phone_regex,
                    example_number
                )
            `)
            .eq('slug', slug)
            .single()

        if (error) throw new Error('Organizacion no encontrada');

        const phoneRule = Array.isArray(org.country_phone_rules) ? org.country_phone_rules[0] : org.country_phone_rules;

        return {
            success: true,
            data: {
                name: org.commercial_name,
                currencySymbol: org.currency_symbol || 'pts',
                logo: org.logo_url,
                planTier: org.subscription_tier || 'FREE',
                phoneRule: phoneRule || null
            }
        }
    } catch (e: any) {
        return { success: false, error: sanitizeError(e, 'org') }
    }
}
