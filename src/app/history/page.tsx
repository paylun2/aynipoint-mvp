import { getUserLedger, getUserWallets } from "@/app/actions/wallet";
import Link from "next/link";
import { ArrowLeft, Coffee, Utensils, Scissors, Dumbbell, Store, ShoppingBag, Pill, CheckCircle2, Ticket } from "lucide-react";
import B2CLayout from "@/components/layout/B2CLayout";

export default async function HistoryPage() {
    const { data: transactions } = await getUserLedger();
    const { data: wallets } = await getUserWallets();
    
    const validTxs = transactions || [];
    const validWallets = wallets || [];

    // Calculate total balance from wallets
    const totalBalance = validWallets.reduce((acc, w) => acc + w.balance, 0);

    // Grouping by Date (Today, Yesterday, Specific Date)
    const groupedTxs: Record<string, typeof validTxs> = {};
    
    validTxs.forEach(tx => {
        const date = new Date(tx.created_at);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        let dateLabel = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
        
        if (date.toDateString() === today.toDateString()) {
            dateLabel = 'Hoy';
        } else if (date.toDateString() === yesterday.toDateString()) {
            dateLabel = 'Ayer';
        }

        if (!groupedTxs[dateLabel]) {
            groupedTxs[dateLabel] = [];
        }
        groupedTxs[dateLabel].push(tx);
    });

    // Icon helper
    const getIconForCategory = (category: string) => {
        switch (category) {
            case 'CAFE': return <Coffee className="w-6 h-6 text-orange-500" />;
            case 'RESTAURANT': return <Utensils className="w-6 h-6 text-orange-500" />;
            case 'BARBERSHOP': return <Scissors className="w-6 h-6 text-orange-500" />;
            case 'GYM': return <Dumbbell className="w-6 h-6 text-orange-500" />;
            case 'RETAIL': return <ShoppingBag className="w-6 h-6 text-orange-500" />;
            case 'PHARMACY': return <Pill className="w-6 h-6 text-orange-500" />;
            default: return <Store className="w-6 h-6 text-orange-500" />;
        }
    };

    return (
        <B2CLayout activeTab="wallet">
            <div className="flex flex-col w-full max-w-md mx-auto relative">
                {/* Header */}
                <header className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
                <Link href="/wallet" aria-label="Volver" className="flex size-12 shrink-0 items-center justify-center text-white/60 hover:text-orange-500 transition-colors rounded-full hover:bg-orange-500/10">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-bold leading-tight flex-1 text-center pr-12 text-white">Caja Fuerte</h1>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-24">
                {/* Summary Section */}
                <div className="px-6 py-8 flex flex-col items-center justify-center border-b border-white/5 bg-gradient-to-b from-orange-500/10 to-transparent relative overflow-hidden">
                    <div className="absolute top-0 right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
                    <div className="absolute bottom-0 left-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
                    
                    <p className="text-sm font-semibold text-white/50 mb-1 uppercase tracking-widest relative z-10">Balance Total</p>
                    <div className="flex items-baseline gap-1 relative z-10">
                        <span className="text-5xl font-black tracking-tighter text-white">{totalBalance.toLocaleString()}</span>
                        <span className="text-lg font-bold text-orange-500">pts</span>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="flex flex-col">
                    {Object.entries(groupedTxs).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <Ticket className="w-16 h-16 text-white/10 mb-4" />
                            <p className="text-white font-bold text-lg">Aún no hay transacciones</p>
                            <p className="text-white/40 text-sm mt-2">Visita un negocio afiliado y empieza a acumular puntos.</p>
                            <Link href="/explorar" className="mt-6 border border-orange-500 text-orange-500 font-bold px-6 py-2 rounded-xl text-sm hover:bg-orange-500/10 transition">
                                Explorar
                            </Link>
                        </div>
                    ) : (
                        Object.keys(groupedTxs).map(date => (
                            <div key={date}>
                                {/* Date Header */}
                                <div className="px-6 py-3 bg-[#111] sticky top-[72px] z-0 border-b border-t border-white/5 shadow-md">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{date}</p>
                                </div>
                                
                                {/* Mapping TXs */}
                                {groupedTxs[date].map(tx => {
                                    const isPositive = ['EARN', 'BONUS', 'MIGRATE', 'REFUND'].includes(tx.type);
                                    return (
                                        <div key={tx.id} className="flex items-center gap-4 px-6 min-h-[72px] py-3 justify-between hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="bg-[#1a1a1a] border border-white/10 rounded-full size-12 flex items-center justify-center shrink-0 overflow-hidden relative">
                                                    {tx.org_logo ? (
                                                        <img src={tx.org_logo} alt={tx.org_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        getIconForCategory(tx.org_category)
                                                    )}
                                                </div>
                                                <div className="flex flex-col justify-center min-w-0">
                                                    <p className="text-base font-bold leading-tight truncate text-white">{tx.org_name}</p>
                                                    <p className="text-sm font-medium text-white/40 truncate mt-0.5">{tx.description || (isPositive ? 'Puntos obtenidos' : 'AyniCanje validado')}</p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className={`text-base font-black ${isPositive ? 'text-green-500' : 'text-orange-500'}`}>
                                                    {isPositive ? '+' : '-'}{tx.amount}
                                                </p>
                                                {tx.multiplier != null && tx.multiplier > 1 ? (
                                                    <p className="text-[10px] font-bold text-purple-400 mt-0.5">
                                                        ✨ x{tx.multiplier} Bonus
                                                    </p>
                                                ) : (
                                                    <p className="text-xs font-semibold text-white/30 mt-0.5">
                                                        {new Date(tx.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    </B2CLayout>
    );
}
