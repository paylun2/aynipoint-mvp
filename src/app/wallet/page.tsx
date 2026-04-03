"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, X, Copy, CheckCircle2, QrCode, ShieldCheck, Phone, Percent, Loader2, Package, ChevronLeft, Store, Lock, Sparkles, History } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { getUserWallets } from "@/app/actions/wallet";
import { getUserProfile } from "@/app/actions/profile";
import { getDiscountsByOrgId } from "@/app/actions/discounts";
import B2CLayout from "@/components/layout/B2CLayout";
import StoreCardTemplate, { StoreCategory } from "@/components/b2c/StoreCardTemplate";
import RedemptionSlider from "@/components/b2c/RedemptionSlider";
import WelcomeBonus from "@/components/b2c/WelcomeBonus";

export default function WalletPage() {
    const [activeToken, setActiveToken] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [copied, setCopied] = useState(false);
    const [totpCode, setTotpCode] = useState("");

    // Auth State
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);

    // Verification status from DB
    const [isVerified, setIsVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Live Data
    const [stores, setStores] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'VERIFIED' | 'OTHER'>('VERIFIED');

    // Discounts browser (informational)
    const [discountsBrowser, setDiscountsBrowser] = useState<{ storeId: string; storeName: string; storePoints: number } | null>(null);
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [loadingDiscounts, setLoadingDiscounts] = useState(false);

    // Active Filter
    const [activeFilter, setActiveFilter] = useState<string>('ALL');

    // FASE 7: Redemption Slider & Welcome Bonus
    const [redemptionTarget, setRedemptionTarget] = useState<{ name: string; slug: string; points: number } | null>(null);
    const [showWelcomeBonus, setShowWelcomeBonus] = useState(false);
    const [welcomeBonusStore, setWelcomeBonusStore] = useState<{ name: string; points: number }>({ name: '', points: 0 });

    // Mapeo amigable de categorías para los filtros
    const CATEGORY_LABELS: Record<string, string> = {
        'ALL': 'Todas',
        'RESTAURANT': 'Restaurantes',
        'CAFE': 'Cafeterías',
        'BARBER_SHOP': 'Barberías',
        'BEAUTY_SALON': 'Salones',
        'GYM': 'Gimnasios',
        'BAKERY': 'Panaderías',
        'GROCERY': 'Minimarkets',
        'CLINIC': 'Salud',
        'OTHER': 'Otros'
    };

    // Extraer categorías únicas de las wallets del usuario
    const availableCategories = useMemo(() => {
        const cats = new Set(stores.map(s => s.category || 'OTHER'));
        return ['ALL', ...Array.from(cats)];
    }, [stores]);

    // OMITTING the is_public & VERIFIED filter entirely because if a store is in 'stores',
    // it means the getUserWallets() action returned a wallet row for this user.
    // If they have a wallet, they have points, and should be able to see them.
    const activeStores = stores;
    const displayedStores = activeStores.filter(s => activeFilter === 'ALL' || s.category === activeFilter);

    // Sumar todos los puntos de todas las tiendas en las que el usuario tiene saldo
    const totalPoints = activeStores.reduce((acc, store) => acc + store.points, 0);

    // Generate a cryptographically random 4-character TOTP code
    const generateTotp = useCallback(() => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        const array = new Uint8Array(4);
        crypto.getRandomValues(array);
        for (let i = 0; i < 4; i++) {
            code += chars[array[i] % chars.length];
        }
        return code;
    }, []);

    useEffect(() => {
        const fetchUserAndWallets = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);

                const profileRes = await getUserProfile();
                if (profileRes.success && profileRes.data) {
                    setIsVerified(
                        profileRes.data.is_registered === true && 
                        !!profileRes.data.phone
                    );
                }

                const res = await getUserWallets();
                if (res.success && res.data) {
                    const mappedStores = res.data.map((w: any) => ({
                        id: w.org_id,
                        name: w.shop_name,
                        points: w.balance,
                        slug: w.slug || 'store',
                        is_public: w.is_public,
                        status: w.status,
                        likes_count: w.likes_count,
                        category: w.category || 'OTHER',
                        logo_url: w.logo_url || null,
                        brand_color: w.brand_color || null,
                    }));
                    setStores(mappedStores);

                    // FASE 7: Welcome Bonus — mostrar solo una vez
                    if (mappedStores.length > 0) {
                        const bonusKey = `ayni_welcome_shown_${user.id}`;
                        if (!localStorage.getItem(bonusKey)) {
                            const firstStore = mappedStores[0];
                            setWelcomeBonusStore({ name: firstStore.name, points: firstStore.points });
                            setShowWelcomeBonus(true);
                            localStorage.setItem(bonusKey, 'true');
                        }
                    }
                }
            }
            setIsLoading(false);
        };
        fetchUserAndWallets();
    }, [supabase]);

    // Timer logic para el TOTP Modal
    useEffect(() => {
        if (!activeToken) return;
        setTotpCode(generateTotp());
        setTimeLeft(60);

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setTotpCode(generateTotp());
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [activeToken, generateTotp]);

    const handleCopy = () => {
        navigator.clipboard.writeText(totpCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Open discounts browser (informational only)
    const handleViewDiscounts = async (store: any) => {
        setDiscountsBrowser({ storeId: store.id, storeName: store.name, storePoints: store.points });
        setLoadingDiscounts(true);
        const res = await getDiscountsByOrgId(store.id);
        if (res.success && res.data) {
            setDiscounts(res.data);
        } else {
            setDiscounts([]);
        }
        setLoadingDiscounts(false);
    };

    // Generate TOTP directly (no reward selection needed)
    const handleCanjear = (storeName: string) => {
        setActiveToken(storeName);
    };

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario";

    if (isLoading) {
        return (
            <div className="bg-[#F8FAFC] dark:bg-[#0B1121] min-h-screen flex items-center justify-center">
                <div className="text-slate-500 font-medium animate-pulse">Cargando billetera...</div>
            </div>
        );
    }

    return (
        <B2CLayout activeTab="wallet" className="bg-[#0a0a0a] dark:bg-[#0a0a0a] text-white selection:bg-accent/30 selection:text-accent font-sans">

            {/* Header (B2C-2 Design) */}
            <header className="flex items-center justify-between p-5 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md z-30">
                <Link href="/profile" className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden shrink-0 flex items-center justify-center bg-white/10 hover:opacity-80 transition-opacity">
                    {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white font-bold text-sm">{userName.charAt(0).toUpperCase()}</span>
                    )}
                </Link>
                <h1 className="text-lg font-bold text-white tracking-tight">Mi Billetera</h1>
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors">
                    <Search className="w-5 h-5" />
                </button>
            </header>

            {/* Main */}
            <main className="flex-1 px-5 pt-2 max-w-lg mx-auto w-full">

                {!isVerified ? (
                    <div className="bg-amber-900/20 border border-amber-900/50 rounded-3xl p-6 mb-8 relative overflow-hidden backdrop-blur-sm">
                        <div className="relative z-10 text-center">
                            <div className="w-16 h-16 bg-amber-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500/30">
                                <Phone className="w-8 h-8 text-amber-400" />
                            </div>
                            <h2 className="text-xl font-bold text-amber-100 mb-2 tracking-tight">Vincula tu Cuenta</h2>
                            <p className="text-sm text-amber-200/70 mb-6 font-medium leading-relaxed">
                                Si ya dictaste tu celular en algún local afiliado, vincúlalo ahora para reclamar tus puntos.
                            </p>
                            <Link href="/vincular" className="w-full bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                Verificar mi Identidad
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Total Balance Card - ULTRA PREMIUM FINTECH CARD */}
                        <div 
                            className="relative rounded-[2.5rem] p-8 text-center overflow-hidden mb-6 shadow-[0_20px_50px_-20px_rgba(249,115,22,0.2)]"
                            style={{
                                backgroundColor: '#050505',
                                border: '1px solid rgba(255,255,255,0.06)'
                            }}
                        >
                            {/* Ambient Core Glows */}
                            <div className="absolute top-0 right-1/4 w-[200px] h-[200px] bg-orange-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30" />
                            <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-rose-500 rounded-full mix-blend-screen filter blur-[80px] opacity-10" />
                            
                            {/* Noise Texture */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

                            {/* Top Highlight Edge */}
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                            
                            <p className="text-[11px] uppercase font-black tracking-[0.2em] text-white/40 mb-3 relative z-10">Balance Global</p>
                            
                            <h2 className="text-6xl font-black text-white mb-1 relative z-10 tracking-tighter drop-shadow-md">
                                {totalPoints.toLocaleString()} <span className="text-2xl text-orange-400 font-bold ml-1 tracking-widest">PTS</span>
                            </h2>
                            
                            <p className="text-xs font-semibold text-white/30 mt-3 mb-6 relative z-10">
                                Acumulado en <span className="text-white/70">{activeStores.length} programas</span> activos
                            </p>

                            <Link href="/history" className="relative z-10 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold py-3 px-6 rounded-2xl border border-white/10 transition-colors mx-auto w-fit backdrop-blur-md">
                                <History className="w-4 h-4 text-orange-400" />
                                Historial de Movimientos
                            </Link>

                            {/* Bottom Edge Light */}
                            <div className="absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
                        </div>

                        {/* Category Filters Row (B2C-2 Design - Upgraded) */}
                        <div className="flex overflow-x-auto hide-scrollbar gap-3 mb-6 pb-2 -mx-5 px-5 snap-x">
                            {availableCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveFilter(cat as string)}
                                    className={`relative snap-start whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-black tracking-wider uppercase transition-all overflow-hidden ${
                                        activeFilter === cat 
                                            ? 'text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                                            : 'bg-white/5 border border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {activeFilter === cat && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500" />
                                    )}
                                    <span className="relative z-10">{CATEGORY_LABELS[cat as string] || cat}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                <div className="space-y-4">
                    {displayedStores.length === 0 && isVerified && (
                        <div className="text-center py-12 text-white/40 bg-white/5 rounded-3xl border border-white/5">
                            <Store className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">No hay tarjetas en esta categoría.</p>
                        </div>
                    )}

                    {displayedStores.map((store) => (
                        <StoreCardTemplate
                            key={store.id}
                            storeName={store.name}
                            category={(store.category as StoreCategory) || 'OTHER'}
                            points={store.points}
                            logoUrl={store.logo_url}
                            brandColor={store.brand_color}
                            onActionClick={() => handleCanjear(store.slug)}
                            onCardClick={() => handleViewDiscounts(store)}
                        />
                    ))}
                </div>
            </main>
            {/* ═══════ DISCOUNTS BROWSER (LOCAL REWARD CATALOG B2C-3) ═══════ */}
            {/* ═══════ DISCOUNTS BROWSER (LOCAL REWARD CATALOG B2C-3) ═══════ */}
            {discountsBrowser && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 sm:p-4">
                    <div 
                        className="w-full sm:max-w-md h-[95vh] sm:h-[85vh] bg-[#050505] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col relative overflow-hidden animate-in slide-in-from-bottom-full duration-500 shadow-2xl"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        {/* Ambient Core Glow */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500 rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none" />
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
                        
                        {/* Header */}
                        <div className="p-6 flex items-center justify-between relative z-10">
                            <button 
                                onClick={() => { setDiscountsBrowser(null); setDiscounts([]); }}
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-md shadow-lg"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-white font-bold text-lg absolute left-1/2 -translate-x-1/2 tracking-widest uppercase text-xs">
                                {discountsBrowser.storeName}
                            </h2>
                            <div className="w-10" />
                        </div>

                        {/* Hero Circular Progress (Restyled) */}
                        <div className="flex flex-col items-center pt-2 pb-10 relative z-10">
                            <div className="relative flex items-center justify-center">
                                {/* Next level simple logic */}
                                {(() => {
                                    const nextReward = [...discounts].sort((a, b) => a.points_cost - b.points_cost).find(d => d.points_cost > discountsBrowser.storePoints);
                                    const targetPoints = nextReward ? nextReward.points_cost : discountsBrowser.storePoints;
                                    const progressPct = targetPoints > 0 ? Math.min(100, (discountsBrowser.storePoints / targetPoints) * 100) : 100;
                                    const radius = 85;
                                    const circumference = 2 * Math.PI * radius;
                                    const strokeDashoffset = circumference - (progressPct / 100) * circumference;

                                    return (
                                        <>
                                            <svg className="w-[200px] h-[200px] -rotate-90 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                                <circle 
                                                    cx="100" cy="100" r={radius} 
                                                    stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" 
                                                />
                                                <circle 
                                                    cx="100" cy="100" r={radius} 
                                                    stroke="url(#orangeGlow)" strokeWidth="8" fill="transparent" 
                                                    strokeDasharray={circumference}
                                                    strokeDashoffset={strokeDashoffset}
                                                    strokeLinecap="round"
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                                <defs>
                                                    <linearGradient id="orangeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#f59e0b" />
                                                        <stop offset="100%" stopColor="#f97316" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <div className="w-[150px] h-[150px] rounded-full flex flex-col items-center justify-center bg-gradient-to-b from-white/10 to-transparent border border-white/5 backdrop-blur-sm shadow-[inset_0_-10px_30px_rgba(0,0,0,0.5)]">
                                                    <span className="text-4xl font-black tracking-tighter text-white drop-shadow-md">{discountsBrowser.storePoints.toLocaleString()}</span>
                                                    <span className="text-[9px] font-black text-white/50 tracking-[0.2em] uppercase mt-1">Puntos</span>
                                                </div>
                                            </div>
                                            
                                            {/* Text Below Circle */}
                                            <div className="absolute -bottom-10 text-center w-full">
                                                <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1.5">Progreso a siguiente nivel</p>
                                                <span className="inline-block px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-[10px] rounded-full backdrop-blur-md">
                                                    {discountsBrowser.storePoints.toLocaleString()} / {targetPoints.toLocaleString()} pts
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Title Section */}
                        <div className="px-8 flex items-center justify-between mt-12 mb-6">
                            <h3 className="text-sm uppercase font-black tracking-widest text-white/80">Catálogo</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
                        </div>

                        {/* Rewards List */}
                        <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-4 hide-scrollbar relative">
                            {/* Gradient mask for smooth scroll fade */}
                            <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-[#050505] to-transparent z-10 pointer-events-none" />
                            
                            {loadingDiscounts ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                                </div>
                            ) : discounts.length === 0 ? (
                                <div className="text-center py-12 text-white/30">
                                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-bold text-sm">No hay premios disponibles</p>
                                </div>
                            ) : (() => {
                                const sorted = [...discounts].sort((a, b) => a.points_cost - b.points_cost);
                                const affordable = sorted.filter(d => d.points_cost <= discountsBrowser.storePoints && d.remaining_stock > 0);
                                const locked = sorted.filter(d => d.points_cost > discountsBrowser.storePoints || d.remaining_stock <= 0);
                                
                                return (
                                    <>
                                        {/* Affordable rewards */}
                                        {affordable.map((discount, i) => (
                                            <button
                                                key={discount.id}
                                                className={`group flex items-center gap-4 bg-white/5 p-4 rounded-2xl text-left w-full transition-all active:scale-[0.98] ${
                                                    i === 0 
                                                        ? 'border border-orange-500/80 shadow-[0_4px_20px_rgba(249,115,22,0.15)] bg-orange-500/5' 
                                                        : 'border border-white/5 hover:border-orange-500/50 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-b from-orange-500/20 to-orange-500/5 border border-orange-500/20 shadow-inner">
                                                    {i === 0 ? <Sparkles className="w-6 h-6 text-orange-400" /> : <Percent className="w-6 h-6 text-orange-400/80" />}
                                                </div>
                                                <div className="flex flex-col justify-center flex-1 min-w-0">
                                                    <p className="text-base font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{discount.description}</p>
                                                    {discount.restrictions && (
                                                        <p className="text-white/40 text-xs font-semibold line-clamp-1 mt-0.5">{discount.restrictions}</p>
                                                    )}
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <span className="text-orange-400 text-sm font-black drop-shadow-md tracking-wide">{discount.points_cost.toLocaleString()} PTS</span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center group-hover:bg-orange-500 group-hover:border-orange-500 group-hover:text-black transition-all">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ))}

                                        {/* Divider */}
                                        {locked.length > 0 && affordable.length > 0 && (
                                            <div className="flex items-center gap-4 py-4">
                                                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
                                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-2 text-center rounded-full bg-white/5 border border-white/5 py-1">Desbloquear Pronto</p>
                                                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                                            </div>
                                        )}

                                        {/* Locked rewards */}
                                        {locked.map(discount => (
                                            <div 
                                                key={discount.id}
                                                className="flex items-center gap-4 bg-transparent p-4 rounded-2xl border border-white/5 opacity-50 grayscale-[80%]"
                                            >
                                                <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center bg-white/5 border border-white/5">
                                                    <Lock className="w-5 h-5 text-white/40" />
                                                </div>
                                                <div className="flex flex-col justify-center flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white/80 line-clamp-1">{discount.description}</p>
                                                    {discount.restrictions && (
                                                        <p className="text-white/40 text-[10px] font-semibold line-clamp-1 mt-0.5">{discount.restrictions}</p>
                                                    )}
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <span className="text-white/50 text-xs font-bold tracking-wider">{discount.points_cost.toLocaleString()} PTS</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Fixed Bottom Action Button */}
                        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-16 z-20">
                            <button
                                onClick={() => {
                                    setDiscountsBrowser(null);
                                    setRedemptionTarget({
                                        name: discountsBrowser.storeName,
                                        slug: discountsBrowser.storeId,
                                        points: discountsBrowser.storePoints,
                                    });
                                }}
                                className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black py-4 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98] uppercase tracking-widest text-xs"
                            >
                                Autorizar Canje
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ TOTP CODE MODAL (Identity verification only) ═══════ */}
            {activeToken && (
                <div className="fixed inset-0 bg-[#000000]/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-6 sm:p-8 text-white animate-in zoom-in-95 fade-in duration-300">
                    
                    {/* Ambient Modal Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

                    <button 
                        onClick={() => setActiveToken(null)} 
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 z-20"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="text-center mb-8 w-full max-w-sm relative z-10">
                        <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 uppercase tracking-[0.3em] font-black text-[10px] mb-6">
                            <ShieldCheck className="w-3.5 h-3.5" /> Autenticador Seguro
                        </div>
                        <h3 className="text-sm font-bold text-white/70 tracking-widest uppercase mb-1">{activeToken}</h3>
                    </div>

                    {/* Circular Timer Progress (Holographic Ultra-Premium) */}
                    <div className="relative w-80 h-80 flex items-center justify-center mb-10 z-10">
                        {/* Outer rotating dashed ring */}
                        <div className="absolute inset-2 border-[2px] border-dashed border-sky-500/20 rounded-full animate-[spin_20s_linear_infinite]" />
                        
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <defs>
                                <linearGradient id="skyGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#0ea5e9" />
                                    <stop offset="50%" stopColor="#38bdf8" />
                                    <stop offset="100%" stopColor="#0284c7" />
                                </linearGradient>
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="6" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>
                            <circle cx="50%" cy="50%" fill="transparent" r="46%" stroke="rgba(255,255,255,0.03)" strokeWidth="6"></circle>
                            <circle 
                                cx="50%" cy="50%" fill="transparent" r="46%" 
                                stroke="url(#skyGlow)" 
                                strokeDasharray="290" 
                                strokeDashoffset={290 - (290 * timeLeft) / 60} 
                                strokeLinecap="round" 
                                strokeWidth="6" 
                                filter="url(#glow)"
                                className="transition-all duration-1000 ease-linear drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                            ></circle>
                        </svg>
                        
                        {/* Inner glowing core */}
                        <div className="flex flex-col items-center z-10 bg-[#050505] w-[230px] h-[230px] rounded-full justify-center border border-white/10 shadow-[inset_0_0_60px_rgba(14,165,233,0.15),0_10px_40px_rgba(0,0,0,0.8)] relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            <span className="font-mono text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-lg relative z-10">
                                {totpCode}
                            </span>
                            <span className={`mt-3 font-mono text-lg font-black tracking-widest relative z-10 ${timeLeft < 10 ? 'text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'text-sky-400 drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]'}`}>
                                0:{timeLeft.toString().padStart(2, '0')}s
                            </span>
                        </div>
                    </div>

                    <div className="text-center max-w-[280px] mb-10 relative z-10">
                        <p className="text-white/50 text-xs leading-relaxed font-medium">
                            Dicta este token numérico al cajero para completar tu operación de canje.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm relative z-10">
                        <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 px-6 rounded-2xl font-bold text-sm transition-all text-white backdrop-blur-md">
                            {copied ? <CheckCircle2 className="w-5 h-5 text-sky-400" /> : <Copy className="w-5 h-5 text-white/70" />}
                            {copied ? 'Copiado al portapapeles' : 'Copiar Token'}
                        </button>
                    </div>
                </div>
            )}

            {/* FASE 7: Redemption Slider */}
            {redemptionTarget && (
                <RedemptionSlider
                    storeName={redemptionTarget.name}
                    storeSlug={redemptionTarget.slug}
                    maxPoints={redemptionTarget.points}
                    onClose={() => setRedemptionTarget(null)}
                />
            )}

            {/* FASE 7: Welcome Bonus */}
            {showWelcomeBonus && (
                <WelcomeBonus
                    storeName={welcomeBonusStore.name}
                    bonusPoints={welcomeBonusStore.points}
                    onDismiss={() => setShowWelcomeBonus(false)}
                />
            )}

        </B2CLayout>
    );
}

// Helper inline components for small SVG icons
const ArrowDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);
