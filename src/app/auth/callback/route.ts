import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // ✅ S4-03 FIX: Validar `next` para prevenir open redirect
    // Solo permitir rutas relativas (empiezan con /) sin protocol markers
    const rawNext = searchParams.get('next') ?? '/wallet'
    const next = (rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\') && !rawNext.toLowerCase().includes('http'))
        ? rawNext
        : '/wallet'
    const intent = searchParams.get('intent')
    const redirectPath = intent ? `${next}?intent=${intent}` : next

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${redirectPath}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
            } else {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
