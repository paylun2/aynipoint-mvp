"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { getOrganizationCustomers } from '@/app/actions/marketing';
import { Search, Download, Loader2, User, Phone, Mail, Award, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerData {
    walletId: string;
    points: number;
    lastActivity: string;
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    isRegistered: boolean;
}

export default function CustomerDirectory({ orgId }: { orgId: string }) {
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchCustomers = useCallback(async () => {
        setIsLoading(true);
        const res = await getOrganizationCustomers(orgId, debouncedSearchTerm, page, 20); // 20 per page
        if (res.success && res.data) {
            setCustomers(res.data.customers);
            setTotalPages(res.data.totalPages);
            setTotalCount(res.data.totalCount);
        }
        setIsLoading(false);
    }, [orgId, debouncedSearchTerm, page]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const handleExportCSV = () => {
        if (customers.length === 0) return;

        const headers = ["ID", "Nombre", "Email", "Teléfono", "Puntos", "Registrado", "Última Actividad"];
        const rows = customers.map(c => [
            c.walletId,
            c.fullName || 'No definido',
            c.email || 'No definido',
            c.phone || 'No definido',
            c.points.toString(),
            c.isRegistered ? 'Sí' : 'No',
            new Date(c.lastActivity).toLocaleString()
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(e => e.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `clientes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#334155]">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-[#f69f09]" />
                        Directorio de Clientes
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {totalCount} clientes totales han interactuado con tu negocio.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por teléfono o nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-sm focus:ring-1 focus:ring-[#f69f09]/50 focus:border-[#f69f09]/50 outline-none text-white placeholder-slate-500"
                        />
                    </div>
                    <button
                        onClick={handleExportCSV}
                        disabled={isLoading || customers.length === 0}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0F172A] border border-[#334155] hover:bg-[#1E293B] text-slate-300 hover:text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Exportar a CSV
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-xl border border-[#334155]">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-[#0F172A]/80 border-b border-[#334155] text-xs text-slate-400 uppercase tracking-wider">
                            <th className="py-4 px-4 font-bold">Cliente</th>
                            <th className="py-4 px-4 font-bold">Contacto</th>
                            <th className="py-4 px-4 font-bold text-center">Puntos</th>
                            <th className="py-4 px-4 font-bold">Última Actividad</th>
                            <th className="py-4 px-4 font-bold">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-[#334155]/50">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#f69f09]" />
                                    Cargando clientes...
                                </td>
                            </tr>
                        ) : customers.length > 0 ? (
                            customers.map((customer) => (
                                <tr key={customer.walletId} className="hover:bg-[#0F172A]/50 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="font-bold text-white">
                                            {customer.fullName || 'Anónimo'}
                                        </div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                                            {customer.walletId.split('-')[0]}...
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex flex-col gap-1.5">
                                            {customer.phone && (
                                                <span className="flex items-center gap-2 text-slate-300 font-mono text-xs">
                                                    <Phone className="w-3.5 h-3.5 text-slate-500" /> {customer.phone}
                                                </span>
                                            )}
                                            {customer.email && (
                                                <span className="flex items-center gap-2 text-slate-300 text-xs">
                                                    <Mail className="w-3.5 h-3.5 text-slate-500" /> {customer.email}
                                                </span>
                                            )}
                                            {!customer.phone && !customer.email && (
                                                <span className="text-slate-500 text-xs italic">Sin contacto</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm border border-[#f69f09]/20 bg-[#f69f09]/10 text-[#f69f09] font-bold font-mono text-sm shadow-sm">
                                            <Award className="w-3.5 h-3.5" />
                                            {customer.points}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-slate-400 text-xs font-medium">
                                            {formatDistanceToNow(new Date(customer.lastActivity), { addSuffix: true, locale: es })}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        {customer.isRegistered ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                                                Registrado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-[#0F172A] text-slate-500 text-[10px] font-bold uppercase tracking-wider border border-[#334155]">
                                                Fantasma
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-3 text-slate-500" />
                                    No se encontraron clientes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 border-t border-[#334155] pt-4">
                    <p className="text-sm text-slate-400">
                        Mostrando página <span className="font-bold text-white">{page}</span> de <span className="font-bold text-white">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 bg-[#0F172A] border border-[#334155] hover:border-[#f69f09]/50 hover:bg-[#f69f09]/10 rounded-lg text-sm font-bold text-slate-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 bg-[#0F172A] border border-[#334155] hover:border-[#f69f09]/50 hover:bg-[#f69f09]/10 rounded-lg text-sm font-bold text-slate-300 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
