import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ShieldAlert, ShieldCheck, ToggleRight, ToggleLeft, AlertTriangle } from 'lucide-react'
import AdminToggleClient from './AdminToggleClient'

export const metadata = {
    title: 'Super-Admin | AyniPoint Zero-Trust Core',
}

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    // ✅ SEGURIDAD BANCARIA: getUser() valida el JWT contra el servidor de Supabase.
    const { data: { user } } = await supabase.auth.getUser()

    // 0. Autenticación Base
    if (!user) {
        redirect('/login')
    }

    // 1. Zero-Trust Domain Gatekeeper
    const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || '@aynipoint.com'
    const userEmail = user.email || ''

    if (!userEmail.endsWith(ADMIN_DOMAIN)) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
                <div className="max-w-md p-8 bg-[#0a0a0a] rounded-3xl border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Acceso Bloqueado</h1>
                    <p className="text-white/50 text-sm mb-6 leading-relaxed">
                        El portal Super-Admin está bajo arquitectura Zero-Trust. Tu cuenta <strong>{userEmail}</strong> no pertenece al dominio corporativo autorizado.
                    </p>
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                        <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Incidente Reportado al SOC</p>
                    </div>
                </div>
            </div>
        )
    }

    // 2. Fetch Master Feature Flags
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'require_kyb_verification')
        .single()

    const kybRequired = data?.value === true || data?.value === 'true'

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-6 pt-12 pb-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                                Zero-Trust Core Activo
                            </p>
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter">Panel Maestro</h1>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-medium text-white/40 mb-0.5">Operador Administrador</p>
                        <p className="text-sm font-bold text-white/80">{userEmail}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-10">
                <div className="mb-12">
                    <h2 className="text-lg font-bold mb-6">Políticas de Anti-Fraude & Growth</h2>
                    
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
                        {/* Glow ambient */}
                        <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-[0.15] transition-colors duration-1000 ${kybRequired ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                            <div className="max-w-xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-black text-white">Motor de Verificación KYB</h3>
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${kybRequired ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                        {kybRequired ? 'Strict Mode' : 'Growth Mode'}
                                    </span>
                                </div>
                                <p className="text-sm text-white/50 leading-relaxed mb-4">
                                    Cuando está APAGADO (Growth), todos los nuevos comercios son confiados ciegamente para acelerar la adopción. Cuando está ENCENDIDO (Strict), exigiremos DNI y Vigencia de Poder (Insignia Verificada) para operar.
                                </p>
                                
                                {kybRequired ? (
                                    <div className="flex items-start gap-2 text-orange-400 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p className="text-xs font-medium">Atención: Habilitar esto podría generar fricción en nuevos registros. Recomendado solo si se detecta un pico de usuarios farmeando.</p>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p className="text-xs font-medium">Growth Activo: Los cajeros pueden emitir puntos libremente y los negocios aparecen en Explorar, enfocándonos 100% en expansión masiva B2B.</p>
                                    </div>
                                )}
                            </div>

                            {/* Toggler interactivo que llama al Server Action */}
                            <div className="shrink-0 flex items-center justify-start sm:justify-end">
                                <AdminToggleClient initialValue={kybRequired} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="opacity-40">
                    <h2 className="text-lg font-bold mb-6">Auditoría Financiera Forense</h2>
                    <div className="bg-[#0a0a0a] border border-dashed border-white/10 rounded-[2rem] p-8 flex items-center justify-center">
                        <p className="text-sm font-medium">Esta bóveda será activada en la Fase Institucional.</p>
                    </div>
                </div>
            </main>
        </div>
    )
}
