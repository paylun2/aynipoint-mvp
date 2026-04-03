"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Star, Loader2, Store, Sparkles } from "lucide-react";
import { getPublicOrganizations, getPublicCategories } from "@/app/actions/explore";
import { getUserWallets } from "@/app/actions/wallet";
import { createClient } from "@/utils/supabase/client";
import B2CLayout from "@/components/layout/B2CLayout";
import StoreCardTemplate, { StoreCategory } from "@/components/b2c/StoreCardTemplate";
import { useRouter } from "next/navigation";

// Category display config with icons and labels
const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
    'BARBERSHOP': { label: 'Barbería', emoji: '💈' },
    'CAFE': { label: 'Cafetería', emoji: '☕' },
    'RESTAURANT': { label: 'Restaurante', emoji: '🍽️' },
    'RETAIL': { label: 'Tienda', emoji: '🛍️' },
    'BEAUTY': { label: 'Belleza', emoji: '💅' },
    'GYM': { label: 'Gimnasio', emoji: '💪' },
    'PET': { label: 'Mascotas', emoji: '🐾' },
    'BAKERY': { label: 'Panadería', emoji: '🥖' },
    'PHARMACY': { label: 'Farmacia', emoji: '💊' },
    'OTHER': { label: 'Otros', emoji: '🏪' },
};

function getCategoryDisplay(cat: string) {
    return CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['OTHER'];
}

// Generate a gradient color pair from brand_color
function brandGradient(color: string | null) {
    const base = color || '#6366F1';
    return `linear-gradient(135deg, ${base}, ${base}CC)`;
}

export default function ExplorarPage() {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [activeTab, setActiveTab] = useState<'DESTACADOS' | 'NUEVOS'>('DESTACADOS');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [wallets, setWallets] = useState<Record<string, number>>({});
    const router = useRouter();

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            const [orgsRes, catsRes, walletsRes] = await Promise.all([
                getPublicOrganizations(selectedCategory),
                getPublicCategories(),
                getUserWallets()
            ]);
            if (orgsRes.success && orgsRes.data) setOrgs(orgsRes.data);
            if (catsRes.success && catsRes.data) setCategories(catsRes.data);
            if (walletsRes.success && walletsRes.data) {
                const walletMap: Record<string, number> = {};
                walletsRes.data.forEach((w: any) => {
                    walletMap[w.org_id] = w.balance;
                });
                setWallets(walletMap);
            }
            setIsLoading(false);
        }
        load();
    }, [selectedCategory]);

    const LIKES_THRESHOLD = 50;

    const filteredOrgs = orgs.filter(org => {
        // Filter by Tab
        const likes = org.likes_count || 0;
        if (activeTab === 'DESTACADOS' && likes < LIKES_THRESHOLD && (!org.is_public || org.status !== 'VERIFIED')) return false;
        if (activeTab === 'NUEVOS' && (likes >= LIKES_THRESHOLD || (org.is_public && org.status === 'VERIFIED'))) return false;

        // Filter by Search
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            org.commercial_name?.toLowerCase().includes(q) ||
            org.category?.toLowerCase().includes(q) ||
            org.city?.toLowerCase().includes(q) ||
            org.address?.toLowerCase().includes(q)
        );
    });

    return (
        <B2CLayout activeTab="explorar">
            {/* Header — Ultra Premium Dark Theme */}
            <header className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)]">
                <div className="px-5 pt-12 pb-5 max-w-xl mx-auto">
                    
                    {/* Title Area */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600 mb-1">
                                Comunidad
                            </p>
                            <h1 className="text-[28px] font-black text-white tracking-tight leading-none drop-shadow-md">
                                Directorio
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_5px_20px_rgba(249,115,22,0.3)] border border-orange-400/50">
                                <Sparkles className="w-5 h-5 text-white drop-shadow-sm" />
                            </div>
                        </div>
                    </div>

                    {/* iOS-Style Segmented Control Tabs */}
                    <div className="flex bg-[#0a0a0a] p-1.5 rounded-[1.25rem] mb-6 relative border border-white/5 shadow-inner">
                        <button 
                            onClick={() => setActiveTab('DESTACADOS')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 z-10 ${
                                activeTab === 'DESTACADOS' 
                                    ? 'bg-[#1a1a1a] text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] border border-white/10' 
                                    : 'text-white/40 hover:text-white/80'
                            }`}
                        >
                            <span className={activeTab === 'DESTACADOS' ? "drop-shadow-md" : "opacity-60"}>🔥</span> 
                            Destacados
                        </button>
                        <button 
                            onClick={() => setActiveTab('NUEVOS')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 z-10 ${
                                activeTab === 'NUEVOS' 
                                    ? 'bg-[#1a1a1a] text-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] border border-white/10' 
                                    : 'text-white/40 hover:text-white/80'
                            }`}
                        >
                            <span className={activeTab === 'NUEVOS' ? "drop-shadow-md" : "opacity-60"}>🌱</span> 
                            Nuevos
                        </button>
                    </div>

                    {/* Search — Premium Frosted Glass Input */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-orange-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, categoría o ciudad..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#111] border border-white/[0.05] rounded-[1.25rem] pl-12 pr-5 py-4 text-sm font-medium text-white outline-none focus:border-orange-500/40 focus:bg-[#1a1a1a] transition-all placeholder:text-white/30 shadow-inner relative z-10"
                        />
                    </div>
                </div>

                {/* Category Pills — Elite Active Glow (Matched to Wallet) */}
                <div className="px-5 pb-4 max-w-xl mx-auto overflow-x-auto hide-scrollbar">
                    <div className="flex gap-2.5 min-w-max">
                        <button
                            onClick={() => setSelectedCategory('ALL')}
                            className={`relative snap-start whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-black tracking-wider uppercase transition-all duration-300 overflow-hidden ${
                                selectedCategory === 'ALL'
                                    ? 'text-[#0a0a0a] bg-orange-500 shadow-[0_0_20px_max(rgba(249,115,22,0.4),rgba(249,115,22,0.4))] border border-orange-400'
                                    : 'bg-white/5 border border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <span className="mr-1.5 opacity-80">🏠</span>
                            Todos
                        </button>
                        {categories.map(cat => {
                            const display = getCategoryDisplay(cat);
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`relative snap-start whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-black tracking-wider uppercase transition-all duration-300 overflow-hidden ${
                                        selectedCategory === cat
                                            ? 'text-[#0a0a0a] bg-orange-500 shadow-[0_0_20px_max(rgba(249,115,22,0.4),rgba(249,115,22,0.4))] border border-orange-400'
                                            : 'bg-white/5 border border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <span className="mr-1.5 opacity-80">{display.emoji}</span>
                                    {display.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Content — Premium Dark Themed Cards */}
            <main className="flex-1 px-5 py-8 max-w-xl mx-auto w-full pb-32">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-white/40">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-orange-500/50" />
                        <p className="text-sm font-semibold tracking-wide">Cargando directorio...</p>
                    </div>
                ) : filteredOrgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-b from-[#111] to-[#0a0a0a] flex items-center justify-center mb-6 shadow-[-10px_-10px_30px_4px_rgba(0,0,0,1),_10px_10px_30px_4px_rgba(45,78,255,0.05)] border border-white/5 relative">
                            <div className="absolute inset-0 bg-orange-500/10 rounded-[2rem] blur-xl" />
                            <Store className="w-10 h-10 text-orange-400 relative z-10 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No se encontraron negocios</h3>
                        <p className="text-[13px] text-white/40 max-w-xs leading-relaxed font-medium">
                            {searchQuery
                                ? <>No hay resultados para <span className="text-white/80 font-bold">"{searchQuery}"</span>. Intenta con otra búsqueda.</>
                                : `Aún no hay comercios en la pestaña ${activeTab.toLowerCase()}.`}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-5">
                            <p className="text-[11px] text-white/50 font-black uppercase tracking-widest">
                                {filteredOrgs.length} {filteredOrgs.length === 1 ? 'Resultado' : 'Resultados'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-5">
                            {filteredOrgs.map(org => {
                                const catDisplay = getCategoryDisplay(org.category);
                                const likes = org.likes_count || 0;
                                const isNewTab = activeTab === 'NUEVOS';
                                const progress = Math.min((likes / LIKES_THRESHOLD) * 100, 100);
                                
                                const walletBalance = wallets[org.id];
                                const hasWallet = walletBalance !== undefined;
                                const pointsToDisplay = hasWallet ? walletBalance : 0;

                                return (
                                    <StoreCardTemplate
                                        key={org.id}
                                        storeName={org.commercial_name}
                                        category={org.category as StoreCategory}
                                        points={pointsToDisplay}
                                        hidePoints={!hasWallet}
                                        pointsLabel={hasWallet ? "Puntos Disponibles" : "Aún no eres miembro"}
                                        actionLabel={hasWallet ? "Explorar" : "Únete"}
                                        logoUrl={org.logo_url}
                                        brandColor={org.brand_color}
                                        onActionClick={() => router.push(`/explorar/${org.slug}`)}
                                        onCardClick={() => router.push(`/explorar/${org.slug}`)}
                                    >
                                        <div className="flex flex-col gap-4">
                                            {/* Progress to 50 Likes (Only in NUEVOS tab) */}
                                            {isNewTab && (
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 relative z-10">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Apoyo de la comunidad</span>
                                                        <span className="text-xs font-bold text-white/70">{likes} / {LIKES_THRESHOLD} ❤️</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-orange-500 transition-all duration-1000 ease-out rounded-full" style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <p className="text-[10px] text-white/30 mt-2 font-medium">Ayuda a este negocio a llegar a los {LIKES_THRESHOLD} corazones para ser destacado.</p>
                                                </div>
                                            )}

                                            {/* Address & Currency */}
                                            <div className="flex items-end justify-between relative z-10">
                                                <div>
                                                    {(org.address || org.city) && (
                                                        <div className="flex items-center gap-1.5 mb-1.5 text-white/60">
                                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                            <p className="text-xs font-medium">
                                                                {[org.address, org.city].filter(Boolean).join(', ')}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5">
                                                        <Star className="w-3.5 h-3.5 text-amber-400" />
                                                        <span className="text-xs font-bold text-white/50">
                                                            Acumula {org.currency_name || 'Puntos'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Destacados Hearts */}
                                                {!isNewTab && (
                                                    <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20 backdrop-blur-sm">
                                                        <span className="text-xs font-bold">{likes}</span>
                                                        <span className="text-xs">❤️</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </StoreCardTemplate>
                                );
                            })}
                        </div>
                    </>
                )}
            </main>
        </B2CLayout>
    );
}
