"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Database, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";

export default function EnterpriseLandingPage() {
    return (
        <div className="bg-[#0B1121] text-slate-100 min-h-screen font-sans selection:bg-accent/30 selection:text-amber-400 overflow-x-hidden">

            {/* Navigation */}
            <Navigation />

            {/* Hero Section with Heatmap Background */}
            <section className="relative pt-40 pb-32 sm:pt-48 sm:pb-40 px-6 overflow-hidden">
                {/* Simulated Heatmap Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-screen max-w-[1200px] h-full pointer-events-none opacity-40 mix-blend-screen">
                    <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-red-600/30 rounded-full blur-[100px]" />
                    <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[10%] left-[30%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[150px]" />
                </div>

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8">
                        <Zap className="w-4 h-4" /> B2B Sponsors
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-[1.1]">
                        Convierte el <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">Share of Basket</span><br />
                        en Inteligencia Accionable
                    </h1>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
                        La primera plataforma de lealtad Zero-PII que conecta a marcas corporativas con bodegueros y consumidores finales midiendo la rotación de sku's en tiempo real.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="#demo" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-[#0B1121] px-8 py-4 rounded-full font-bold text-sm transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2">
                            Agendar Demo Enterprise <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button className="w-full sm:w-auto bg-[#1E293B] hover:bg-slate-800 text-white border border-slate-700 px-8 py-4 rounded-full font-bold text-sm transition-all">
                            Ver Documentación API
                        </button>
                    </div>
                </div>
            </section>

            {/* Core Features */}
            <section className="py-24 bg-[#0F172A] border-y border-slate-800 relative z-10" id="analytics">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Arquitectura de Datos Corporativa</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-8 hover:border-emerald-500/50 transition-colors group">
                            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BarChart3 className="w-7 h-7 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Data Analytics (Real-Time)</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Dashboards de rotación de SKUs por territorio, ticket cruzado y efectividad de "Canastas Inteligentes" en los POS afiliados a nivel nacional.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-8 hover:border-amber-500/50 transition-colors group">
                            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-7 h-7 text-amber-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">AI Chat con pgvector</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Interactúa con tus métricas usando lenguaje natural. Nuestra IA cruza datos de ventas y te ayuda a definir qué bodegas necesitan incentivos.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-8 hover:border-blue-500/50 transition-colors group">
                            <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-7 h-7 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Zero-PII Compliance</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                AyniPoint no comparte datos personales de usuarios (PII). Analizas Share of Basket garantizando el cumplimiento estricto con la ley de protección de datos.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Dashboard Preview / Code Snippet */}
            <section className="py-24 px-6 relative overflow-hidden" id="ai">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <div className="inline-flex flex-col gap-2">
                            <Database className="w-8 h-8 text-emerald-500" />
                            <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">
                                Integración Transparente <br /> con tu Stack Actual
                            </h2>
                        </div>
                        <p className="text-lg text-slate-400 leading-relaxed">
                            Crea recompensas en formato de "Canastas Inteligentes" directamente desde nuestro portal web. Los cajeros visualizarán y validarán tus SKUs corporativos al instante en el punto de venta usando Supabase Sync.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-slate-300">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Exportación en CSV / JSON
                            </li>
                            <li className="flex items-center gap-3 text-slate-300">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Webhooks en tiempo real
                            </li>
                            <li className="flex items-center gap-3 text-slate-300">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Soporte SSO dedicado
                            </li>
                        </ul>
                    </div>

                    <div className="flex-1 w-full bg-[#1E293B] rounded-[2rem] border border-slate-700 p-2 shadow-2xl relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[50px]" />
                        <div className="bg-[#0F172A] rounded-[1.5rem] border border-slate-800 p-6 overflow-hidden">
                            <div className="flex gap-2 mb-6">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            </div>
                            <div className="space-y-4 font-mono text-sm leading-relaxed">
                                <p className="text-emerald-400">// IA Natural Language Query (pgvector)</p>
                                <p className="text-slate-300">
                                    <span className="text-purple-400">SELECT</span> sku_name, sum(amount) as sales<br />
                                    <span className="text-purple-400">FROM</span> sponsor_transactions<br />
                                    <span className="text-purple-400">WHERE</span> is_valid_math_shield = <span className="text-amber-300">true</span><br />
                                    <span className="text-purple-400">GROUP BY</span> sku_name<br />
                                    <span className="text-purple-400">ORDER BY</span> sales <span className="text-purple-400">DESC</span>;
                                </p>
                                <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 mt-4 text-emerald-400">
                                    {`> "Leche Evaporada 400g" es el SKU de mayor rotación esta semana.`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA App (Demo) */}
            <section className="py-24 bg-gradient-to-t from-[#0B1121] to-[#0F172A] px-6 border-t border-slate-800" id="demo">
                <div className="max-w-4xl mx-auto bg-emerald-500 rounded-[2rem] p-12 text-center text-[#0F172A] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full blur-[80px]" />
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-[#0F172A]">
                            Comienza a patrocinar <br /> bodegas hoy mismo.
                        </h2>
                        <p className="text-emerald-950 font-medium text-lg mb-10 max-w-lg mx-auto">
                            Aumenta tus ventas y fideliza al consumidor final entendiendo el comportamiento real de compra.
                        </p>
                        <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                            <input
                                type="email"
                                placeholder="tu@empresa.com"
                                className="flex-1 bg-white border-2 border-transparent focus:border-emerald-600 rounded-xl px-5 py-4 font-bold text-slate-800 outline-none"
                            />
                            <button className="bg-[#0F172A] text-white hover:bg-slate-800 px-8 py-4 rounded-xl font-bold transition-colors">
                                Solicitar Demo
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
