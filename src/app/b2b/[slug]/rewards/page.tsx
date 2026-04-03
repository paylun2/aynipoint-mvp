"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getDiscounts, createDiscount, toggleDiscount, deleteDiscount } from "@/app/actions/discounts";
import { PlusCircle, Loader2, Percent, Lock, AlertTriangle, Package, ToggleLeft, ToggleRight, Clock, Trash2 } from "lucide-react";
import B2BTopNav from "@/components/b2b/B2BTopNav";

const FREE_PLAN_MAX_DISCOUNTS = 3;

export default function DiscountsManagementPage() {
    const params = useParams();
    const slug = typeof params?.slug === 'string' ? params.slug : '';

    const [discounts, setDiscounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [planType, setPlanType] = useState('FREE');

    const [orgName, setOrgName] = useState('');

    const activeDiscounts = discounts.filter(d => d.status === 'ACTIVE');
    const maxDiscounts = planType === 'PRO' ? Infinity : FREE_PLAN_MAX_DISCOUNTS;
    const limitReached = activeDiscounts.length >= maxDiscounts;

    async function loadDiscounts() {
        if (!slug) return;
        setIsLoading(true);
        const res = await getDiscounts(slug);
        if (res.success && res.data) {
            setDiscounts(res.data);
            if (res.planType) setPlanType(res.planType);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        loadDiscounts();
    }, [slug]);

    async function handleSubmit(formData: FormData) {
        if (limitReached) return;

        setIsSubmitting(true);
        setFeedback(null);
        formData.append('org_slug', slug);

        const res = await createDiscount(formData);

        if (res.success) {
            setFeedback({ type: 'success', message: '¡Descuento creado con éxito!' });
            (document.getElementById("discount-form") as HTMLFormElement).reset();
            loadDiscounts();
        } else {
            setFeedback({ type: 'error', message: res.error || 'Error al guardar el descuento.' });
        }
        setIsSubmitting(false);
    }

    async function handleToggle(discountId: string, currentStatus: string) {
        const newStatus = currentStatus === 'ACTIVE';
        const res = await toggleDiscount(discountId, slug, !newStatus);
        if (res.success) {
            loadDiscounts();
        } else {
            setFeedback({ type: 'error', message: res.error || 'Error al cambiar estado.' });
        }
    }

    async function handleDelete(discountId: string) {
        if (!confirm('¿Estás seguro de eliminar este descuento? Esta acción no se puede deshacer.')) return;
        const res = await deleteDiscount(discountId, slug);
        if (res.success) {
            setFeedback({ type: 'success', message: 'Descuento eliminado.' });
            loadDiscounts();
        } else {
            setFeedback({ type: 'error', message: res.error || 'Error al eliminar.' });
        }
    }

    return (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0F172A] relative text-slate-100 font-sans">
            <B2BTopNav title="Descuentos" orgName={orgName} />

            <main className="p-4 md:p-8 flex flex-col gap-6 pb-24 relative max-w-6xl mx-auto w-full">

                {/* Plan Limit Indicator */}
                {planType === 'FREE' && !isLoading && (
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${
                        limitReached 
                            ? 'bg-amber-900/10 border-amber-800'
                            : 'bg-[#1E293B] border-[#334155]'
                    }`}>
                        <div className="flex items-center gap-3">
                            {limitReached ? (
                                <Lock className="w-5 h-5 text-amber-500" />
                            ) : (
                                <Percent className="w-5 h-5 text-amber-500" />
                            )}
                            <div>
                                <p className="text-sm font-bold text-white">
                                    Plan FREE — {activeDiscounts.length}/{FREE_PLAN_MAX_DISCOUNTS} descuentos activos
                                </p>
                                <p className="text-xs text-slate-400">
                                    {limitReached 
                                        ? 'Has alcanzado el límite. Desactiva un descuento o actualiza a Plan PRO.'
                                        : `Puedes crear ${FREE_PLAN_MAX_DISCOUNTS - activeDiscounts.length} descuento(s) más.`
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-1 hidden sm:flex">
                            {[...Array(FREE_PLAN_MAX_DISCOUNTS)].map((_, i) => (
                                <div key={i} className={`w-3 h-3 rounded-full ${i < activeDiscounts.length ? 'bg-[#f69f09]' : 'bg-[#334155]'}`} />
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Crear Descuento Form */}
                    <div className={`lg:col-span-1 bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#334155] h-fit ${limitReached ? 'opacity-60' : ''}`}>
                        <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-[#f69f09]" />
                            Nuevo Descuento
                        </h3>

                        {limitReached && (
                            <div className="mb-4 p-3 rounded-lg text-sm border bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Límite de {FREE_PLAN_MAX_DISCOUNTS} descuentos activos alcanzado (Plan FREE).</span>
                            </div>
                        )}

                        {feedback && (
                            <div className={`mb-4 p-3 rounded-lg text-sm border ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                                {feedback.message}
                            </div>
                        )}

                        <form id="discount-form" action={handleSubmit} className="flex flex-col gap-4">
                            {/* Descripción (Obligatorio) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Descripción del Descuento *
                                </label>
                                <textarea 
                                    name="description" 
                                    required 
                                    placeholder="Ej: 90% de descuento en lácteos" 
                                    maxLength={300} 
                                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 resize-none h-20" 
                                    disabled={isSubmitting || limitReached} 
                                // eslint-disable-next-line react/jsx-no-comment-textnodes
                                />
                            </div>

                            {/* % de Descuento y Límite */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        % Descuento *
                                    </label>
                                    <input 
                                        type="number" 
                                        name="discount_percentage" 
                                        required 
                                        placeholder="90" 
                                        min="1" 
                                        max="100" 
                                        className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50" 
                                        disabled={isSubmitting || limitReached} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Límite (moneda) *
                                    </label>
                                    <input 
                                        type="number" 
                                        name="max_discount_amount" 
                                        required 
                                        placeholder="20.00" 
                                        min="0.01" 
                                        step="0.01" 
                                        className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50" 
                                        disabled={isSubmitting || limitReached} 
                                    />
                                </div>
                            </div>

                            {/* Cantidad Mínima y Stock */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Mínimo tickets *
                                    </label>
                                    <input 
                                        type="number" 
                                        name="min_quantity" 
                                        required 
                                        placeholder="30" 
                                        min="1" 
                                        className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50" 
                                        disabled={isSubmitting || limitReached} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Costo (Pts) *
                                    </label>
                                    <input 
                                        type="number" 
                                        name="points_cost" 
                                        required
                                        placeholder="100" 
                                        min="1" 
                                        className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50" 
                                        disabled={isSubmitting || limitReached} 
                                    />
                                </div>
                            </div>

                            {/* Restricciones */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Restricciones
                                </label>
                                <textarea 
                                    name="restrictions" 
                                    placeholder="Ej: Solo lácteos" 
                                    maxLength={1000} 
                                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 resize-none h-20" 
                                    disabled={isSubmitting || limitReached} 
                                />
                            </div>

                            {/* Fecha de expiración */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Fecha de Expiración (Opcional)
                                </label>
                                <input 
                                    type="datetime-local" 
                                    name="expires_at" 
                                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50" 
                                    disabled={isSubmitting || limitReached} 
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting || limitReached} 
                                className="w-full mt-2 bg-[#f69f09] hover:bg-[#d98b08] text-[#0F172A] font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (limitReached ? <><Lock className="w-4 h-4" /> Límite alcanzado</> : 'Crear Descuento')}
                            </button>
                        </form>
                    </div>

                    {/* Lista de Descuentos */}
                    <div className="lg:col-span-2 bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#334155]">
                        <h3 className="font-bold text-lg mb-6 text-white flex items-center gap-2">
                            <Percent className="w-5 h-5 text-[#f69f09]" />
                            Mis Descuentos
                        </h3>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#f69f09]" />
                                <p>Cargando descuentos...</p>
                            </div>
                        ) : discounts.length === 0 ? (
                            <div className="text-center p-12 border-2 border-dashed border-[#334155] rounded-xl">
                                <Percent className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold">No has creado ningún descuento todavía.</p>
                                <p className="text-sm text-slate-500 mt-1">Usa el formulario de la izquierda para empezar.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {discounts.map(discount => {
                                    const remaining = discount.total_inventory - discount.redeemed_count;
                                    const isExpired = discount.expires_at && new Date(discount.expires_at) < new Date();
                                    
                                    return (
                                        <div key={discount.id} className={`bg-[#0F172A] p-4 rounded-xl border border-[#334155] flex flex-col justify-between group ${discount.status !== 'ACTIVE' || isExpired ? 'opacity-60' : ''}`}>
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-gradient-to-r from-amber-400 to-[#f69f09] text-[#0F172A] text-lg font-black px-3 py-1 rounded-lg shrink-0">
                                                            {discount.discount_percentage}%
                                                        </span>
                                                    </div>
                                                    {planType !== 'FREE' ? (
                                                        <button 
                                                            onClick={() => handleToggle(discount.id, discount.status)}
                                                            className="text-slate-400 hover:text-white transition-colors"
                                                            title={discount.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                                                        >
                                                            {discount.status === 'ACTIVE' ? (
                                                                <ToggleRight className="w-7 h-7 text-emerald-500" />
                                                            ) : (
                                                                <ToggleLeft className="w-7 h-7 text-slate-500" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <div className="relative cursor-not-allowed group/pro" title="Actualiza a PRO para activar/desactivar descuentos">
                                                            {/* Toggle deshabilitado visible detrás */}
                                                            <ToggleRight className="w-8 h-8 text-slate-700" />
                                                            {/* Overlay con candado + PRO encima */}
                                                            <div className="absolute inset-0 flex items-center justify-center bg-[#1E293B]/60 rounded-lg">
                                                                <span className="text-[9px] bg-gradient-to-r from-amber-500 to-[#f69f09] text-[#0F172A] px-2 py-1 rounded-full font-black uppercase flex items-center gap-1 shadow-md">
                                                                    <Lock className="w-3 h-3" /> PRO
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="font-bold text-white text-sm mt-2">{discount.description}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-bold">
                                                        Máx: {Number(discount.max_discount_amount).toFixed(2)}
                                                    </span>
                                                    {discount.points_cost > 0 && (
                                                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">
                                                            {discount.points_cost} pts
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                                        <Package className="w-3 h-3" /> {remaining}/{discount.total_inventory}
                                                    </span>
                                                </div>
                                                {discount.restrictions && (
                                                    <p className="text-[11px] text-slate-400 mt-2 italic border-l-2 border-[#334155] pl-2">
                                                        {discount.restrictions}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="pt-3 mt-3 border-t border-[#334155] flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-sm ${
                                                        isExpired 
                                                            ? 'text-rose-400 bg-rose-500/10' 
                                                            : discount.status === 'ACTIVE' 
                                                                ? 'text-emerald-400 bg-emerald-500/10' 
                                                                : 'text-slate-500 bg-[#1E293B]'
                                                    }`}>
                                                        {isExpired ? 'Expirado' : discount.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                    {discount.expires_at && (
                                                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(discount.expires_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(discount.id)}
                                                    className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-500/10"
                                                    title="Eliminar descuento"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
