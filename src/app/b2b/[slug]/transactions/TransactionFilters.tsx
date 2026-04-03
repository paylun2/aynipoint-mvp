"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, RotateCcw } from "lucide-react";

export default function TransactionFilters({ slug }: { slug: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Local state to store filter values before applying
    const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
    const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
    const [type, setType] = useState(searchParams.get("type") || "ALL");
    const [phone, setPhone] = useState(searchParams.get("phone") || "");

    // Auto-apply filters when they change, but debounce text input slightly
    useEffect(() => {
        const timer = setTimeout(() => {
            applyFilters();
        }, 300); // 300ms debounce for typing phone numbers
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo, type, phone]);

    const applyFilters = () => {
        const params = new URLSearchParams(searchParams.toString());

        // Reset page to 1 when filters change natively
        params.set("page", "1");

        if (dateFrom) params.set("dateFrom", dateFrom);
        else params.delete("dateFrom");

        if (dateTo) params.set("dateTo", dateTo);
        else params.delete("dateTo");

        if (type !== "ALL") params.set("type", type);
        else params.delete("type");

        if (phone) params.set("phone", phone);
        else params.delete("phone");

        // Avoid pushing identical URL manually to prevent history flooding if nothing changed
        const newUrl = `/b2b/${slug}/transactions?${params.toString()}`;
        if (newUrl !== `/b2b/${slug}/transactions?${searchParams.toString()}`) {
            router.push(newUrl, { scroll: false });
        }
    };

    const clearFilters = () => {
        setDateFrom("");
        setDateTo("");
        setType("ALL");
        setPhone("");
        router.push(`/b2b/${slug}/transactions`, { scroll: false });
    };

    const hasActiveFilters = dateFrom || dateTo || type !== "ALL" || phone;

    return (
        <div className="bg-[#1E293B] rounded-xl border border-[#334155] p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-[#f69f09]" />
                <h3 className="font-bold text-white">Filtros Avanzados</h3>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors bg-[#0F172A] border border-[#334155] px-3 py-1.5 rounded-lg"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Limpiar
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date From */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Desde el día</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#f69f09]/50 appearance-none"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>

                {/* Date To */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hasta el día</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#f69f09]/50 appearance-none"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>

                {/* Type Dropdown */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo Movimiento</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#f69f09]/50 appearance-none"
                    >
                        <option value="ALL">Mostrar Todos</option>
                        <option value="EARN">Solo Emisiones (+)</option>
                        <option value="REDEEM">Solo Canjes (-)</option>
                    </select>
                </div>

                {/* Phone Search */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teléfono de Cliente</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar dígitos..."
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f69f09]/50 text-white placeholder-slate-500"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
