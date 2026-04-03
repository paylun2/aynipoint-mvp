"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Search, ChevronLeft, ChevronRight, Loader2, AlertTriangle, X, Lock, ArrowDownUp, Filter, RotateCcw } from 'lucide-react';
import { useParams } from 'next/navigation';
import B2BTopNav from '@/components/b2b/B2BTopNav';
import { getAuditLedger, refundTransaction } from '@/app/actions/audit';

interface Transaction {
    id: string;
    type: string;
    amount: number;
    baseAmount: number | null;
    multiplier: number | null;
    description: string | null;
    created_at: string;
    cashierName: string;
    cashierRole: string;
    clientPhone: string;
}

export default function AuditPage() {
    const params = useParams();
    const slug = typeof params?.slug === 'string' ? params.slug : '';
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [filterType, setFilterType] = useState<string>('ALL');

    // Refund modal state
    const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
    const [refundReason, setRefundReason] = useState('');
    const [refundPin, setRefundPin] = useState('');
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundError, setRefundError] = useState('');
    const [refundSuccess, setRefundSuccess] = useState(false);

    const fetchData = useCallback(async () => {
        if (!slug) return;
        setIsLoading(true);
        const res = await getAuditLedger(slug, page, 25, {
            type: filterType as any,
        });
        if (res.success && res.data) {
            setTransactions(res.data.transactions);
            setTotalPages(res.data.totalPages);
            setTotalCount(res.data.totalCount);
        }
        setIsLoading(false);
    }, [slug, page, filterType]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRefund = async () => {
        if (!refundTarget || !refundReason.trim() || !refundPin.trim()) return;
        setRefundLoading(true);
        setRefundError('');
        const res = await refundTransaction(slug, refundTarget.id, refundReason, refundPin);
        if (res.success) {
            setRefundSuccess(true);
            setTimeout(() => {
                setRefundTarget(null);
                setRefundSuccess(false);
                setRefundReason('');
                setRefundPin('');
                fetchData();
            }, 1500);
        } else {
            setRefundError(res.error || 'Error desconocido.');
        }
        setRefundLoading(false);
    };

    const formatDate = (d: string) => {
        const date = new Date(d);
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' + date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    };

    const typeColors: Record<string, string> = {
        EARN: 'text-emerald-400 bg-emerald-500/10',
        REDEEM: 'text-red-400 bg-red-500/10',
        REFUND: 'text-amber-400 bg-amber-500/10',
    };

    return (
        <div className="flex flex-col min-h-full font-sans text-slate-100 w-full">
            <B2BTopNav title="Auditoría" orgName="" />

            <div className="max-w-6xl mx-auto w-full px-4 md:px-8 pt-6 pb-24 md:pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight">Terminal de Auditoría Financiera</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Ledger inmutable · {totalCount.toLocaleString()} registros</p>
                    </div>
                    <ShieldAlert className="w-6 h-6 text-[#f69f09]" />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="font-bold uppercase tracking-wider">Tipo:</span>
                    </div>
                    {['ALL', 'EARN', 'REDEEM', 'REFUND'].map(t => (
                        <button
                            key={t}
                            onClick={() => { setFilterType(t); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                ${filterType === t
                                    ? 'bg-[#f69f09] text-[#0F172A] shadow-md shadow-[#f69f09]/20'
                                    : 'bg-[#1E293B] text-slate-400 hover:bg-[#334155] border border-[#334155]'
                                }`}
                        >
                            {t === 'ALL' ? 'Todos' : t}
                        </button>
                    ))}
                </div>

                {/* DataGrid Table */}
                <div className="bg-[#1E293B] rounded-xl border border-[#334155] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[#334155] bg-[#0F172A]/50">
                                    <th className="px-4 py-3 text-[10px] text-slate-400 font-black uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-3 text-[10px] text-slate-400 font-black uppercase tracking-wider">Tipo</th>
                                    <th className="px-4 py-3 text-[10px] text-slate-400 font-black uppercase tracking-wider">Monto</th>
                                    <th className="px-4 py-3 text-[10px] text-slate-400 font-black uppercase tracking-wider hidden lg:table-cell">Detalle</th>
                                    <th className="px-4 py-3 text-[10px] text-slate-400 font-black uppercase tracking-wider hidden md:table-cell">Cliente</th>
                                    <th className="px-4 py-3 text-[10px] text-slate-400 font-black uppercase tracking-wider hidden lg:table-cell">Cajero</th>
                                    <th className="px-4 py-3 text-[10px] text-slate-400 font-black uppercase tracking-wider">Fecha</th>
                                    <th className="px-4 py-3 text-[10px] text-slate-400 font-black uppercase tracking-wider text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto" /></td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-500">No hay registros para los filtros seleccionados.</td></tr>
                                ) : transactions.map((tx) => (
                                    <tr key={tx.id} className="border-b border-[#334155]/50 hover:bg-[#0F172A]/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-mono text-slate-300 font-bold">{tx.id.split('-')[0].toUpperCase()}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${typeColors[tx.type] || 'text-slate-400 bg-slate-500/10'}`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-sm font-bold font-mono ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            {tx.type === 'EARN' && tx.multiplier != null && tx.multiplier > 1 ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-mono text-slate-400">{tx.baseAmount}</span>
                                                    <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">x{tx.multiplier}</span>
                                                    <span className="text-xs font-mono text-slate-500">=</span>
                                                    <span className="text-xs font-mono font-bold text-white">{tx.amount}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className="text-xs text-slate-400 font-mono">{tx.clientPhone}</span>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <div>
                                                <p className="text-xs text-slate-300 font-medium truncate max-w-[120px]">{tx.cashierName}</p>
                                                <p className="text-[10px] text-slate-500 uppercase">{tx.cashierRole}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{formatDate(tx.created_at)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {tx.type !== 'REFUND' ? (
                                                <button
                                                    onClick={() => { setRefundTarget(tx); setRefundError(''); setRefundSuccess(false); }}
                                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                                >
                                                    Anular
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-amber-500/50 font-bold uppercase">Extornado</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-4 py-3 border-t border-[#334155] flex items-center justify-between bg-[#0F172A]/30">
                        <p className="text-xs text-slate-500 font-medium">
                            Pág. {page} de {totalPages} · {totalCount} registros
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 rounded-lg bg-[#1E293B] border border-[#334155] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 rounded-lg bg-[#1E293B] border border-[#334155] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======= REFUND MODAL (Estricto) ======= */}
            {refundTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={() => !refundLoading && setRefundTarget(null)}>
                    <div className="bg-[#0F172A] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-[0_0_60px_-15px_rgba(239,68,68,0.3)] relative" onClick={e => e.stopPropagation()}>
                        {/* Close */}
                        <button onClick={() => !refundLoading && setRefundTarget(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <RotateCcw className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Anular Transacción</h3>
                                <p className="text-xs text-slate-500">Extorno contable irreversible</p>
                            </div>
                        </div>

                        {/* Transaction Summary */}
                        <div className="bg-[#1E293B] rounded-xl p-4 mb-5 border border-[#334155]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Transacción Original</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${typeColors[refundTarget.type]}`}>{refundTarget.type}</span>
                            </div>
                            <p className="text-xl font-black font-mono text-white">{refundTarget.amount > 0 ? '+' : ''}{refundTarget.amount.toLocaleString()} pts</p>
                            <p className="text-xs text-slate-400 mt-1">ID: <span className="font-mono">{refundTarget.id.split('-')[0].toUpperCase()}</span> · {refundTarget.clientPhone}</p>
                        </div>

                        {refundSuccess ? (
                            <div className="text-center py-6">
                                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
                                    <RotateCcw className="w-7 h-7 text-emerald-500" />
                                </div>
                                <p className="text-emerald-400 font-bold">Extorno registrado con éxito</p>
                                <p className="text-xs text-slate-500 mt-1">El saldo fue ajustado y el evento fue registrado en la auditoría forense.</p>
                            </div>
                        ) : (
                            <>
                                {/* Reason */}
                                <div className="mb-4">
                                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Motivo del Extorno *</label>
                                    <textarea
                                        value={refundReason}
                                        onChange={e => setRefundReason(e.target.value)}
                                        placeholder="Ej: Error de cajero, monto incorrecto..."
                                        className="w-full bg-[#1E293B] text-white text-sm rounded-xl p-3 border border-[#334155] focus:border-red-500/50 focus:outline-none resize-none h-20 placeholder:text-slate-600"
                                    />
                                </div>

                                {/* PIN */}
                                <div className="mb-5">
                                    <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Lock className="w-3 h-3" /> PIN de Autorización *
                                    </label>
                                    <input
                                        type="password"
                                        value={refundPin}
                                        onChange={e => setRefundPin(e.target.value)}
                                        placeholder="••••"
                                        maxLength={8}
                                        className="w-full bg-[#1E293B] text-white text-sm rounded-xl p-3 border border-[#334155] focus:border-red-500/50 focus:outline-none text-center tracking-[0.5em] font-mono text-lg placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-sm"
                                    />
                                </div>

                                {refundError && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                        <p className="text-xs text-red-400 font-medium">{refundError}</p>
                                    </div>
                                )}

                                {/* CTA */}
                                <button
                                    onClick={handleRefund}
                                    disabled={refundLoading || !refundReason.trim() || !refundPin.trim()}
                                    className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                                >
                                    {refundLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                    {refundLoading ? 'Procesando Extorno...' : 'Confirmar Extorno Irreversible'}
                                </button>

                                <p className="text-[10px] text-slate-600 text-center mt-3">Este evento será registrado en la auditoría forense inmutable.</p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
