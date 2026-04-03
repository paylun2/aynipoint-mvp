import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getLoyaltyRules } from '@/app/actions/marketing'
import MarketingTabs from './MarketingTabs'
import { Rocket, ShieldAlert } from 'lucide-react'
import B2BTopNav from '@/components/b2b/B2BTopNav'

export default async function MarketingPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
    const resolvedParams = await Promise.resolve(params);
    const orgSlug = resolvedParams.slug;
    
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // 2. Org lookup — RLS: "Auth: Miembros ven su propia organizacion" (006)
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, slug, commercial_name')
        .eq('slug', orgSlug)
        .single()

    if (orgError || !org) redirect('/b2b')

    // 3. Role verification — RLS: "Auth: Usuarios ven sus propias membresias" (006)
    const { data: membership } = await supabase
        .from('organization_members')
        .select('role_code')
        .eq('org_id', org.id)
        .eq('user_id', user.id)
        .single()

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role_code)) {
        return (
            <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0F172A] relative text-slate-100 font-sans">
                <B2BTopNav title="Marketing" orgName={org.commercial_name} />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="text-center bg-[#1E293B] border border-[#334155] p-12 rounded-2xl shadow-sm">
                        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white tracking-tight">Acceso Restringido</h2>
                        <p className="text-slate-400 mt-2">Solo los dueños de este negocio pueden configurar el motor de marketing.</p>
                    </div>
                </div>
            </div>
        )
    }

    // 4. Obtener Configuración de Marketing y Reglas
    const res = await getLoyaltyRules(org.id);
    const initialRules = res.success && res.data ? res.data : null;

    if (!initialRules) {
        return (
            <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0F172A] relative text-slate-100 font-sans">
                <B2BTopNav title="Marketing" orgName={org.commercial_name} />
                <div className="flex-1 p-8 flex items-center justify-center">
                    <div className="text-slate-400 text-center flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-[#f69f09] border-t-transparent rounded-full animate-spin" />
                        Módulo de Marketing cargando...
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0F172A] relative text-slate-100 font-sans">
            <B2BTopNav title="Marketing" orgName={org.commercial_name} />
            
            <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full pb-24">
                <header className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 border border-indigo-500/20">
                            <Rocket className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Motor de Marketing & Anti-Fraude</h1>
                            <p className="text-slate-400 text-sm">Escala tus ventas, conoce a tus clientes y automatiza campañas.</p>
                        </div>
                    </div>
                </header>

                <main>
                    <MarketingTabs orgId={org.id} orgSlug={org.slug} initialRules={initialRules} />
                </main>
            </div>
        </div>
    )
}
