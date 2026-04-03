"use client"
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Check, ExternalLink, Sparkles, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react';
import B2BTopNav from '@/components/b2b/B2BTopNav';
import { getSubscription, upgradeToPro } from '@/app/actions/billing';

export default function B2BBillingPage() {
    const params = useParams();
    const router = useRouter();
    const slug = typeof params?.slug === 'string' ? params.slug : '';
    
    const [isAnnual, setIsAnnual] = useState(false);
    const [subscription, setSubscription] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpgrading, setIsUpgrading] = useState(false);

    useEffect(() => {
        async function fetchSub() {
            if (!slug) return;
            const res = await getSubscription(slug);
            if (res.success && res.data) {
                setSubscription(res.data);
                if (res.data.billing_cycle === 'ANNUAL') setIsAnnual(true);
            }
            setIsLoading(false);
        }
        fetchSub();
    }, [slug]);

    const handleUpgradePro = async () => {
        setIsUpgrading(true);
        const res = await upgradeToPro(slug, isAnnual);
        if (res.success && res.data?.checkoutUrl) {
            // Redirect user securely to MercadoPago / Stripe
            window.location.href = res.data.checkoutUrl;
        } else {
            alert('Aviso: ' + (res.error || 'Ocurrió un error inesperado al procesar el pago.'));
            setIsUpgrading(false);
        }
    };

    const currentTier = subscription?.plan_tier || 'FREE';

    return (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0F172A] relative font-sans text-slate-100">
            <B2BTopNav title="Planes y Suscripción" />

            <main className="p-4 md:p-8 pb-24 max-w-7xl mx-auto w-full">
                
                {/* Header Section */}
                <div className="text-center mb-12 relative z-10">
                    <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                        Escala tu <span className="text-[#f69f09] relative whitespace-nowrap">
                            <span className="relative z-10">fidelización</span>
                            <span className="absolute bottom-0 left-0 w-full h-3 bg-[#f69f09]/20 -rotate-1 z-0"></span>
                        </span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Elige el plan ideal para el crecimiento de tu negocio. Sin contratos forzosos.
                    </p>

                    {/* Toggle */}
                    <div className="flex items-center justify-center mt-8">
                        <div className="bg-[#0F172A] p-1.5 rounded-full flex items-center relative border border-[#334155] shadow-inner">
                            <button 
                                onClick={() => setIsAnnual(false)}
                                disabled={currentTier !== 'FREE'}
                                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all z-10 ${!isAnnual ? 'bg-[#1E293B] text-white shadow-md border border-[#334155]' : 'text-slate-500 hover:text-white'} disabled:opacity-50`}
                            >
                                Mensual
                            </button>
                            <button 
                                onClick={() => setIsAnnual(true)}
                                disabled={currentTier !== 'FREE'}
                                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all z-10 flex items-center gap-2 ${isAnnual ? 'bg-[#f69f09] text-[#0F172A] shadow-md border border-[#f69f09]' : 'text-slate-500 hover:text-white'} disabled:opacity-50`}
                            >
                                Anual <span className={`text-[10px] px-2 py-0.5 rounded-full ${isAnnual ? 'bg-[#0F172A]/20 text-[#0F172A]' : 'bg-[#f69f09]/20 text-[#f69f09]'} uppercase`}>Ahorra 20%</span>
                            </button>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                         <Loader2 className="w-12 h-12 animate-spin text-[#f69f09]" />
                    </div>
                ) : (
                    <>
                        {/* Pricing Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto relative z-10">
                            
                            {/* PLAN FREE */}
                            <div className="bg-[#1E293B] rounded-3xl p-8 border border-[#334155] shadow-sm flex flex-col hover:border-slate-500 transition-colors">
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Plan Free</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white">$0</span>
                                        <span className="text-slate-500 font-medium">/mes</span>
                                    </div>
                                </div>

                                <button disabled className="w-full bg-[#0F172A] text-slate-500 font-bold py-3 px-4 rounded-xl border border-[#334155] mb-8 cursor-not-allowed">
                                    {currentTier === 'FREE' ? 'Tu Plan Actual' : 'Plan Básico'}
                                </button>

                                <div className="flex-1">
                                    <ul className="space-y-4">
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <Check className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                                            Hasta 100 clientes (fantasmas)
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <Check className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                                            1 Sucursal
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <Check className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                                            Perfil público básico
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <Check className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                                            Soporte comunitario
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* PLAN PRO (Destacado) */}
                            <div className="bg-[#1E293B] rounded-3xl p-8 border-2 border-[#f69f09] shadow-[0_0_40px_-10px_rgba(246,159,9,0.15)] flex flex-col relative transform md:-translate-y-4 hover:shadow-[0_0_50px_-10px_rgba(246,159,9,0.25)] transition-all z-20">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#f69f09]/10 rounded-full blur-[50px] pointer-events-none"></div>
                                
                                {currentTier !== 'PRO' && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#f69f09] text-[#0F172A] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> MáS POPULAR
                                    </div>
                                )}

                                <div className="mb-6 relative z-10">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#f69f09] mb-2">Plan PRO</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-black text-white">${isAnnual ? '24' : '29'}</span>
                                        <span className="text-slate-400 font-medium tracking-wide">/mes</span>
                                    </div>
                                    {isAnnual && <p className="text-xs text-[#f69f09] mt-2 font-medium">Facturado anualmente ($288)</p>}
                                </div>

                                {currentTier === 'PRO' ? (
                                    <button disabled className="w-full bg-[#0F172A] text-[#f69f09] font-black tracking-wide py-3.5 px-4 rounded-xl border border-[#f69f09]/50 mb-8 cursor-not-allowed">
                                        <span className="flex items-center justify-center gap-2">
                                            <Check className="w-5 h-5" /> Tu Plan Actual
                                        </span>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleUpgradePro}
                                        disabled={isUpgrading}
                                        className="w-full bg-[#f69f09] hover:bg-[#d98b08] text-[#0F172A] font-black tracking-wide py-3.5 px-4 rounded-xl shadow-[0_4px_14px_0_rgba(246,159,9,0.39)] hover:shadow-[0_6px_20px_rgba(246,159,9,0.23)] hover:-translate-y-0.5 transition-all mb-8 relative overflow-hidden group disabled:opacity-70 disabled:hover:translate-y-0"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {isUpgrading ? (
                                                <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                                            ) : (
                                                <>Mejorar a Plan PRO <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                            )}
                                        </span>
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                                    </button>
                                )}

                                <div className="flex-1 relative z-10">
                                    <p className="text-white font-bold text-sm border-b border-[#334155] pb-3 mb-4">Todo en Free, además:</p>
                                    <ul className="space-y-4">
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <div className="bg-[#f69f09]/10 p-1 rounded-full shrink-0 mt-0.5 text-[#f69f09]">
                                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                            </div>
                                            <span className="text-white font-bold">Usuarios ilimitados</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <div className="bg-[#f69f09]/10 p-1 rounded-full shrink-0 mt-0.5 text-[#f69f09]">
                                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                            </div>
                                            Hasta 3 sucursales
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <div className="bg-[#f69f09]/10 p-1 rounded-full shrink-0 mt-0.5 text-[#f69f09]">
                                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                            </div>
                                            Temas Premium B2C (Neón, Dark)
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <div className="bg-[#f69f09]/10 p-1 rounded-full shrink-0 mt-0.5 text-[#f69f09]">
                                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                            </div>
                                            Analíticas avanzadas y exportación
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <div className="bg-[#f69f09]/10 p-1 rounded-full shrink-0 mt-0.5 text-[#f69f09]">
                                                <Zap className="w-3.5 h-3.5" strokeWidth={3} />
                                            </div>
                                            Soporte prioritario 24/7
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* PLAN EMPRESARIAL */}
                            <div className="bg-[#1E293B] rounded-3xl p-8 border border-[#334155] shadow-sm flex flex-col hover:border-slate-500 transition-colors">
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-2">Empresarial</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white">A medida</span>
                                    </div>
                                </div>

                                <button className="w-full bg-[#0F172A] text-emerald-400 font-bold py-3 px-4 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors mb-8 flex items-center justify-center gap-2">
                                    Contactar Ventas <ExternalLink className="w-4 h-4" />
                                </button>

                                <div className="flex-1">
                                    <ul className="space-y-4">
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                            Subcuentas ilimitadas (White-label)
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                            API con acceso total
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                            Account Manager dedicado
                                        </li>
                                        <li className="flex items-start gap-3 text-slate-300 text-sm font-medium">
                                            <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                            SLA garantizado del 99.9%
                                        </li>
                                    </ul>
                                </div>
                            </div>

                        </div>

                        {/* FAQ Section */}
                        <div className="mt-20 max-w-3xl mx-auto">
                            <h2 className="text-2xl font-black text-center text-white mb-8">Preguntas Frecuentes</h2>
                            <div className="space-y-4">
                                {[
                                    { q: "¿Puedo cambiar de plan después?", a: "Sí, puedes subir o bajar de plan en cualquier momento. Los cambios se prorratearán en tu siguiente factura." },
                                    { q: "¿Qué sucede si excedo el límite de usuarios en el Plan Free?", a: "Tus clientes seguirán ganando puntos, pero no podrás ver sus datos en el módulo de marketing ni exportarlos hasta que actualices al Plan PRO o liberen cupos verificando su cuenta." },
                                    { q: "¿Ofrecen demos personalizadas?", a: "¡Por supuesto! Para el plan Empresarial ofrecemos sesiones 1 a 1 para mostrarte cómo Aynipoint puede integrarse con tus sistemas actuales mediante nuestra API." }
                                ].map((faq, i) => (
                                    <div key={i} className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 shadow-sm hover:bg-[#0F172A]/50 transition-colors">
                                        <h4 className="font-bold text-white mb-2">{faq.q}</h4>
                                        <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

            </main>
        </div>
    );
}
