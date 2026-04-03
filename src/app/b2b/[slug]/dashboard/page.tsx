"use client"
import React, { useEffect, useState } from 'react';
import { Target, TrendingUp, ShieldAlert, MonitorSmartphone, Coins, Gift, Rocket, ChevronRight, Loader2, AlertCircle, PlusCircle, MinusCircle, ShieldCheck, AlertTriangle, Monitor, Users, BarChart3, Activity } from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getDashboardMetrics } from '@/app/actions/dashboard';
import B2BTopNav from '@/components/b2b/B2BTopNav';
import DashboardChart from './DashboardChart';

export default function B2BDashboard() {
    const params = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState<any>(null);

    useEffect(() => {
        async function fetchMetrics() {
            const slug = typeof params?.slug === 'string' ? params.slug : null;
            if (!slug) return;
            const res = await getDashboardMetrics(slug);
            if (res.success) setMetrics(res.data);
            setIsLoading(false);
        }
        fetchMetrics();
    }, [params]);

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ahora';
        if (mins < 60) return `Hace ${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `Hace ${hrs}h`;
        return `Hace ${Math.floor(hrs / 24)}d`;
    };

    return (
        <div className="flex flex-col min-h-full font-sans text-slate-100 w-full">
            <B2BTopNav title="Dashboard" orgName={metrics?.orgName || ''} />

            <div className="max-w-6xl mx-auto w-full px-4 md:px-8 pt-6 pb-24 md:pb-8">

                {/* ======= KPI CARDS GRID ======= */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-6">
                    <div className="bg-[#1E293B] p-5 rounded-xl border border-[#334155] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#f69f09]/5 rounded-full blur-xl pointer-events-none" />
                        <Coins className="w-5 h-5 text-[#f69f09] mb-2" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Masa Monetaria</p>
                        <p className="text-xl font-black text-white font-mono mt-1">{isLoading ? '...' : (metrics?.masaMonetaria || 0).toLocaleString()}</p>
                        {!isLoading && (metrics?.bonusMultiplicador || 0) > 0 ? (
                            <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                <span className="text-[#f69f09]">{(metrics?.puntosBase || 0).toLocaleString()} base</span>
                                {' + '}
                                <span className="text-purple-400">{(metrics?.bonusMultiplicador || 0).toLocaleString()} bonus</span>
                            </p>
                        ) : (
                            <p className="text-[10px] text-slate-500 mt-1 font-medium">pts emitidos este mes</p>
                        )}
                    </div>

                    <div className="bg-[#1E293B] p-5 rounded-xl border border-[#334155] shadow-sm relative overflow-hidden">
                        <Gift className="w-5 h-5 text-emerald-500 mb-2" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Canjes del Mes</p>
                        <p className="text-xl font-black text-white font-mono mt-1">{isLoading ? '...' : (metrics?.canjesMes || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">descuentos activados</p>
                    </div>

                    <div className="bg-[#1E293B] p-5 rounded-xl border border-[#334155] shadow-sm relative overflow-hidden">
                        <Users className="w-5 h-5 text-sky-400 mb-2" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clientes Totales</p>
                        <p className="text-xl font-black text-white font-mono mt-1">{isLoading ? '...' : (metrics?.totalCustomers || 0)}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">{metrics?.ghostUsers || 0} fantasmas</p>
                    </div>

                    <div className="bg-[#1E293B] p-5 rounded-xl border border-[#334155] shadow-sm relative overflow-hidden">
                        <Target className="w-5 h-5 text-violet-400 mb-2" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conversión PLG</p>
                        <p className="text-xl font-black text-white font-mono mt-1">{isLoading ? '...' : `${metrics?.conversionRate || 0}%`}</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">fantasmas → registrados</p>
                    </div>
                </div>

                {/* ======= PLG Widget: Plan Status ======= */}
                <div className="pb-6">
                    <div className="bg-[#1E293B] rounded-xl p-5 border border-[#334155] shadow-sm relative overflow-hidden">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="relative w-16 h-16 flex shrink-0 items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle className="text-[#334155]" cx="32" cy="32" fill="transparent" r="26" stroke="currentColor" strokeWidth="6"></circle>
                                        <circle className="text-[#f69f09] transition-all duration-1000 ease-out" cx="32" cy="32" fill="transparent" r="26" stroke="currentColor" strokeDasharray="163" strokeDashoffset={`${163 - (163 * Math.min(metrics?.ghostUsers || 0, 100)) / 100}`} strokeWidth="6" strokeLinecap="round"></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-sm font-black text-white">{Math.min(metrics?.ghostUsers || 0, 100)}%</span>
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white">Cupo Fantasmas: <span className="font-mono">{metrics?.ghostUsers || 0} / 100</span></p>
                                    <p className="text-xs text-slate-400 truncate">Plan {metrics?.planTier === 'ENTERPRISE' ? 'Empresarial' : (metrics?.planTier || 'FREE')}</p>
                                </div>
                            </div>
                            <Link href={`/b2b/${params.slug}/billing`} className="bg-[#f69f09] hover:bg-[#d98b08] text-[#0F172A] font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-colors text-sm shrink-0 active:scale-95">
                                <Rocket className="w-4 h-4" /> PRO
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ======= TREND CHART (7 días) ======= */}
                <div className="pb-6">
                    <div className="bg-[#1E293B] rounded-xl border border-[#334155] shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#334155] flex justify-between items-center">
                            <div>
                                <h2 className="font-bold text-sm text-white">Actividad Semanal</h2>
                                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Últimos 7 días</p>
                            </div>
                            <BarChart3 className="w-5 h-5 text-[#f69f09]" />
                        </div>
                        <div className="p-4 h-52">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                                </div>
                            ) : (
                                <DashboardChart data={metrics?.dailyTrend || []} />
                            )}
                        </div>
                    </div>
                </div>

                {/* ======= MINILIBRO + FRAUD RADAR (Side by Side) ======= */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                    {/* Minilibro Mayor */}
                    <section className="bg-[#1E293B] rounded-xl border border-[#334155] shadow-sm overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-[#334155] flex justify-between items-center">
                            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-300">Minilibro Mayor</h2>
                            <TrendingUp className="w-5 h-5 text-[#f69f09] animate-pulse" />
                        </div>
                        <div className="divide-y divide-[#334155] flex-1">
                            {isLoading ? (
                                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                            ) : metrics?.recentTransactions?.length > 0 ? (
                                <>
                                    {/* Header de columnas */}
                                    <div className="flex items-center px-4 py-2 bg-[#0F172A]/70 gap-2">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider w-20">Cliente</span>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider w-12 text-right">Base</span>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider w-10 text-center">Mult.</span>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider w-14 text-right">Total</span>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex-1 text-right">Operador</span>
                                    </div>
                                    {metrics.recentTransactions.slice(0, 6).map((tx: any) => {
                                        const isEarn = tx.type === 'EARN';
                                        const hasMultiplier = isEarn && tx.metadata?.multiplier > 1;
                                        const baseAmount = tx.metadata?.base_amount ?? tx.amount;
                                        const cashierName = tx.organization_members?.users?.full_name 
                                            || tx.organization_members?.users?.email?.split('@')[0] 
                                            || 'Sistema';
                                        return (
                                            <div key={tx.id} className="flex items-center px-4 py-3 gap-2">
                                                {/* Col 1: Cliente (teléfono enmascarado) */}
                                                <div className="w-20">
                                                    <p className="text-xs text-slate-300 font-mono truncate">{tx.masked_phone || '—'}</p>
                                                </div>
                                                {/* Col 2: Base */}
                                                <div className="w-12 text-right">
                                                    <p className={`text-sm font-bold font-mono ${isEarn ? 'text-slate-300' : 'text-red-400'}`}>
                                                        {isEarn ? baseAmount : tx.amount}
                                                    </p>
                                                </div>
                                                {/* Col 3: Multiplicador */}
                                                <div className="w-10 text-center">
                                                    {hasMultiplier ? (
                                                        <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                                                            x{tx.metadata.multiplier}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-600">—</span>
                                                    )}
                                                </div>
                                                {/* Col 4: Total entregado */}
                                                <div className="w-14 text-right">
                                                    <span className={`font-bold font-mono ${isEarn ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {isEarn && tx.amount > 0 ? '+' : ''}{tx.amount}
                                                    </span>
                                                </div>
                                                {/* Col 5: Operador */}
                                                <div className="flex-1 text-right min-w-0">
                                                    <p className="text-[11px] text-slate-400 font-medium truncate">{cashierName}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </>
                            ) : (
                                <div className="py-8 text-center text-sm text-slate-500">No hay transacciones recientes</div>
                            )}
                        </div>
                        <div className="p-3 bg-[#0F172A]/50 text-center border-t border-[#334155] mt-auto">
                            <Link href={`/b2b/${params.slug}/transactions`} className="text-[#f69f09] text-xs font-bold uppercase tracking-widest hover:text-amber-400 transition-colors inline-block w-full py-1">Ver Todo el Historial</Link>
                        </div>
                    </section>

                    {/* Radar de Fraude (DATOS REALES desde security_logs) */}
                    <section className="bg-[#1E293B] rounded-xl border border-[#334155] shadow-sm flex flex-col">
                        <div className="px-4 py-3 border-b border-[#334155] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-300">Radar de Fraude</h2>
                                {(metrics?.totalFraudAlerts || 0) > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                                        {metrics?.totalFraudAlerts}
                                    </span>
                                )}
                            </div>
                            <ShieldCheck className="w-5 h-5 text-[#f69f09]" />
                        </div>
                        <div className="p-4 space-y-3 flex-1">
                            {isLoading ? (
                                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                            ) : metrics?.fraudAlerts?.length > 0 ? (
                                metrics.fraudAlerts.map((alert: any) => {
                                    const isCritical = alert.severity === 'CRITICAL';
                                    return (
                                        <div key={alert.id} className={`flex gap-3 items-start p-3 rounded-lg border ${isCritical ? 'bg-red-500/5 border-red-500/20' : 'bg-[#f69f09]/5 border-[#f69f09]/10'}`}>
                                            {isCritical ? <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-[#f69f09] shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{alert.event_type?.replace(/_/g, ' ')}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                                                    {alert.metadata?.source || alert.metadata?.type || 'Evento detectado'}
                                                </p>
                                                <p className={`text-[10px] mt-1 font-bold font-mono ${isCritical ? 'text-red-400' : 'text-[#f69f09]'}`}>
                                                    {formatTimeAgo(alert.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-8 text-center flex flex-col items-center gap-3 opacity-60">
                                    <ShieldCheck className="w-10 h-10 text-emerald-500" />
                                    <div>
                                        <p className="text-sm font-bold text-white">Sin Alertas</p>
                                        <p className="text-xs text-slate-500 mt-1">Tu negocio está operando limpio.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
