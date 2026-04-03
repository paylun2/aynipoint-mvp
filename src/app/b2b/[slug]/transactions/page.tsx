import { Suspense } from "react"
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import Link from 'next/link'
import { getAllTransactions } from "@/app/actions/dashboard"
import TransactionFilters from "./TransactionFilters"
import B2BTopNav from "@/components/b2b/B2BTopNav"

export const metadata = {
    title: 'Transacciones',
    description: 'Historial completo del libro mayor',
}

interface PageProps {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ page?: string; type?: string; phone?: string; cashierId?: string; dateFrom?: string; dateTo?: string }>
}

export default async function TransactionsPage({ params, searchParams }: PageProps) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const currentPage = parseInt(resolvedSearchParams.page || '1', 10);

    return (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0F172A] relative w-full text-slate-100 font-sans">
            <B2BTopNav title="Transacciones" orgName="" />

            <div className="bg-[#0F172A] border-b border-[#1E293B] px-6 py-4 flex items-center gap-4 shrink-0">
                <Link href={`/b2b/${resolvedParams.slug}/dashboard`} className="p-2 hover:bg-[#1E293B] rounded-lg transition-colors text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Todas las Transacciones</h1>
                    <p className="text-sm text-slate-400">Historial completo del libro mayor</p>
                </div>
            </div>

            <main className="p-4 md:p-6 pb-24">
                <div className="max-w-6xl mx-auto w-full">
                    <TransactionFilters slug={resolvedParams.slug} />

                    <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#f69f09]" /></div>}>
                        <TransactionsTable slug={resolvedParams.slug} page={currentPage} searchParams={resolvedSearchParams} />
                    </Suspense>
                </div>
            </main>
        </div>
    )
}

async function TransactionsTable({ slug, page, searchParams }: { slug: string, page: number, searchParams: any }) {
    const filters = {
        type: searchParams.type !== 'ALL' ? (searchParams.type as 'EARN' | 'REDEEM' | 'ALL') : undefined,
        phone: searchParams.phone || undefined,
        cashierId: searchParams.cashierId || undefined,
        dateFrom: searchParams.dateFrom || undefined,
        dateTo: searchParams.dateTo || undefined,
    }

    const response = await getAllTransactions(slug, page, 50, filters);

    if (!response.success || !response.data) {
        return (
            <div className="bg-[#1E293B] rounded-xl border border-[#334155] p-8 text-center shadow-sm">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3 opacity-80" />
                <p className="text-rose-400 font-bold mb-1">Error al cargar las transacciones.</p>
                <p className="text-slate-400 text-sm">{response.error}</p>
            </div>
        )
    }

    const { transactions, totalCount, totalPages } = response.data;

    // Calculate frequency of each masked_phone for fraud detection in this view
    const phoneFrequencies = transactions.reduce((acc: any, tx: any) => {
        if (tx.masked_phone && tx.type === 'EARN') {
            acc[tx.masked_phone] = (acc[tx.masked_phone] || 0) + 1;
        }
        return acc;
    }, {});

    return (
        <div className="bg-[#1E293B] rounded-xl border border-[#334155] overflow-hidden shadow-sm flex flex-col mb-8">
            <div className="p-4 border-b border-[#334155] bg-[#0F172A]/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Total: {totalCount} registros</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#334155] text-xs text-slate-400 uppercase tracking-wider bg-[#0F172A]/80">
                            <th className="py-4 px-4 sm:px-6 font-bold">Fecha / Hora</th>
                            <th className="py-4 px-4 sm:px-6 font-bold hidden sm:table-cell">ID Transacción</th>
                            <th className="py-4 px-4 sm:px-6 font-bold">Cliente / Tipo</th>
                            <th className="py-4 px-4 sm:px-6 font-bold text-right">Monto</th>
                            <th className="py-4 px-4 sm:px-6 font-bold hidden lg:table-cell">Detalle</th>
                            <th className="py-4 px-4 sm:px-6 font-bold hidden md:table-cell">Cajero</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {transactions.length > 0 ? (
                            transactions.map((tx: any) => {
                                // Simple heuristic 1: If an EARN is >= 500 points, flag it.
                                const isHighValue = tx.type === 'EARN' && tx.amount >= 500;

                                // Simple heuristic 2: If this masked phone has 3 or more EARNS in this paginated batch, flag it.
                                const isRepeated = tx.type === 'EARN' && tx.masked_phone && phoneFrequencies[tx.masked_phone] >= 3;

                                const isFlagged = isHighValue || isRepeated;
                                const alertTitle = isHighValue && isRepeated ? "Monto alto y frecuente" : isHighValue ? "Monto inusualmente alto" : "Transacciones frecuentes";

                                return (
                                    <tr key={tx.id} className={`border-b border-[#334155]/50 hover:bg-[#0F172A]/50 transition-colors ${isFlagged ? 'bg-rose-500/10' : ''}`}>
                                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                                            <div className="text-white font-medium">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 sm:px-6 hidden sm:table-cell">
                                            <div className="font-mono text-slate-400 text-xs truncate max-w-[120px] lg:max-w-[200px]" title={tx.id}>
                                                {tx.id}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 sm:px-6">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={`text-xs font-mono px-2 py-1 rounded-sm ${isRepeated ? 'bg-rose-500/20 text-rose-400' : 'bg-[#0F172A] text-slate-300 border border-[#334155]'}`}>
                                                    {tx.masked_phone}
                                                </span>
                                                <span className={tx.type === 'EARN' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase" : "bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase"}>
                                                    {tx.type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`py-4 px-4 sm:px-6 text-right font-mono font-bold text-lg ${tx.type === 'EARN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            <div className="flex items-center justify-end gap-2">
                                                <span>{tx.amount > 0 && tx.type === 'EARN' ? '+' : ''}{tx.amount}</span>
                                                {isFlagged && (
                                                    <span title={alertTitle}>
                                                        <AlertCircle className="w-4 h-4 text-rose-400" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 sm:px-6 hidden lg:table-cell">
                                            {tx.type === 'EARN' && tx.metadata?.multiplier > 1 ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-mono text-slate-400">{tx.metadata.base_amount}</span>
                                                    <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">x{tx.metadata.multiplier}</span>
                                                    <span className="text-xs font-mono text-slate-500">=</span>
                                                    <span className="text-xs font-mono font-bold text-white">{tx.amount}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 sm:px-6 text-slate-300 text-sm hidden md:table-cell">
                                            {tx.organization_members?.users?.full_name || tx.organization_members?.users?.email || 'App System'}
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                                    No se encontraron transacciones en esta vista.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="p-4 border-t border-[#334155] flex items-center justify-between bg-[#0F172A]/50">
                    <p className="text-sm text-slate-400">
                        Mostrando página <span className="font-bold text-white">{page}</span> de <span className="font-bold text-white">{totalPages}</span>
                    </p>
                    <div className="flex space-x-2">
                        {page > 1 ? (
                            <Link href={`/b2b/${slug}/transactions?page=${page - 1}`} className="p-2 border border-[#334155] rounded-lg hover:bg-[#1E293B] transition-colors text-slate-400 hover:text-white bg-[#0F172A]">
                                <ChevronLeft className="w-5 h-5" />
                            </Link>
                        ) : (
                            <button disabled className="p-2 border border-[#334155]/50 rounded-lg opacity-50 cursor-not-allowed text-slate-500 bg-[#0F172A]">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        {page < totalPages ? (
                            <Link href={`/b2b/${slug}/transactions?page=${page + 1}`} className="p-2 border border-[#334155] rounded-lg hover:bg-[#1E293B] transition-colors text-slate-400 hover:text-white bg-[#0F172A]">
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                        ) : (
                            <button disabled className="p-2 border border-[#334155]/50 rounded-lg opacity-50 cursor-not-allowed text-slate-500 bg-[#0F172A]">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
