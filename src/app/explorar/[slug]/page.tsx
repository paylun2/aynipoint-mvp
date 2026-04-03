import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Sparkles, MapPin, Store, Globe, ArrowLeft, Share, Info, Ticket, Gift } from 'lucide-react';
import Link from 'next/link';
import SupportButton from './SupportButton'; 

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

function brandGradient(color: string | null) {
    const base = color || '#f49d25';
    return `linear-gradient(135deg, ${base}, ${base}CC)`;
}

export default async function PublicOrganizationPage({ params }: { params: { slug: string } | Promise<{ slug: string }> }) {
    const supabase = await createClient();
    const resolvedParams = await Promise.resolve(params);
    const slug = resolvedParams.slug;

    // 1. Fetch Organization
    const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error || !org) {
        notFound();
    }

    if (!['PENDING_VERIFICATION', 'ACTIVE', 'VERIFIED'].includes(org.status)) {
        notFound();
    }

    // 2. Fetch Active Discounts
    const { data: discounts } = await supabase
        .from('b2b_discounts')
        .select('*')
        .eq('org_id', org.id)
        .eq('status', 'ACTIVE')
        .order('discount_percentage', { ascending: false });

    const now = new Date().toISOString();
    const activeDiscounts = (discounts || []).filter(d => !d.expires_at || d.expires_at > now);

    // 3. User Info
    const { data: { user } } = await supabase.auth.getUser();

    let userLiked = false;
    if (user) {
        const { data: likeStatus } = await supabase
            .from('organization_likes')
            .select('id')
            .eq('org_id', org.id)
            .eq('user_id', user.id)
            .single();
        userLiked = !!likeStatus;
    }

    const catDisplay = CATEGORY_CONFIG[org.category] || CATEGORY_CONFIG['OTHER'];
    const LIKES_THRESHOLD = 50;
    const likes = org.likes_count || 0;
    const progress = Math.min((likes / LIKES_THRESHOLD) * 100, 100);
    const isDestacado = likes >= LIKES_THRESHOLD || (org.is_public && org.status === 'VERIFIED');
    const textHighlight = org.brand_color || "#f49d25";

    return (
        <div className="bg-[#0a0a0a] font-sans text-white min-h-screen flex flex-col w-full max-w-md mx-auto relative overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-500">
            <div className="flex-1 overflow-y-auto pb-32">
                
                {/* Header Image & Profile */}
                <div className="relative w-full h-64 bg-[#111]">
                    <div 
                        className="absolute inset-0 opacity-80 mix-blend-screen"
                        style={{ background: brandGradient(org.brand_color) }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent"></div>
                    
                    {/* Top Actions */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                        <Link href="/explorar" className="w-10 h-10 rounded-full bg-[#0a0a0a]/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <button className="w-10 h-10 rounded-full bg-[#0a0a0a]/50 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition">
                            <Share className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Profile Logo Overlap */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-20">
                        <div 
                            className="w-24 h-24 rounded-full border-4 border-[#0a0a0a] bg-[#111] overflow-hidden flex items-center justify-center shadow-2xl relative"
                            style={{ boxShadow: `0 0 25px ${textHighlight}40` }}
                        >
                            {org.logo_url ? (
                                <img src={org.logo_url} alt={org.commercial_name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-black text-white">{org.commercial_name.charAt(0)}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Business Info */}
                <div className="mt-14 px-6 text-center">
                    <div className="flex justify-center mb-2">
                        <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/70 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                            {catDisplay.emoji} {catDisplay.label}
                        </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white">{org.commercial_name}</h1>
                    <p className="text-sm font-bold mt-1" style={{ color: textHighlight }}>Conoce nuestro catálogo y premios</p>

                    {/* Action Button & Verification */}
                    <div className="mt-6 flex flex-col items-center">
                        {isDestacado ? (
                            <div className="flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg border text-sm font-bold mb-4 bg-orange-500/10 border-orange-500/20 text-orange-500">
                                <Sparkles className="w-5 h-5" />
                                <span>Negocio Destacado</span>
                            </div>
                        ) : (
                            <div className="w-full max-w-sm">
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6 text-left relative overflow-hidden">
                                     {/* Glow effect background */}
                                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: textHighlight }}></div>
                                    
                                    <div className="flex justify-between items-center mb-2 relative z-10">
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/50">Misión Comunidad</span>
                                        <span className="text-xs font-black text-white">{likes} / {LIKES_THRESHOLD} ❤️</span>
                                    </div>
                                    <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden relative z-10">
                                        <div className="h-full transition-all duration-1000" style={{ width: `${progress}%`, backgroundColor: textHighlight }}></div>
                                    </div>
                                    <p className="text-[10px] text-white/40 mt-3 font-medium relative z-10">
                                        ¡Faltan {Math.max(0, LIKES_THRESHOLD - likes)} apoyos para verificar este local y desbloquear premios!
                                    </p>
                                </div>
                                <SupportButton 
                                    orgId={org.id} 
                                    initialLikes={likes} 
                                    initialLiked={userLiked} 
                                    isLoggedIn={!!user} 
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Rewards / Discounts Section */}
                <div className="mt-10 px-6">
                    <h2 className="text-lg font-black tracking-tight text-white mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5" style={{ color: textHighlight }} />
                        Premios Disponibles
                    </h2>
                    
                    {activeDiscounts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {activeDiscounts.map((discount: any) => {
                                const remaining = discount.total_inventory - discount.redeemed_count;
                                return (
                                    <div key={discount.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center relative overflow-hidden group">
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" style={{ background: textHighlight }}></div>
                                        
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-[#0a0a0a] border border-white/10 text-xl shadow-lg">
                                            {discount.discount_percentage >= 50 ? '💎' : '🎁'}
                                        </div>
                                        <span className="bg-gradient-to-r from-orange-400 to-orange-600 text-transparent bg-clip-text font-black text-lg leading-none mb-1">
                                            {discount.discount_percentage}% DSCTO
                                        </span>
                                        <p className="font-bold text-sm text-white leading-tight mb-2 line-clamp-2 min-h-[40px]">
                                            {discount.description}
                                        </p>
                                        <div className="mt-auto pt-3 border-t border-white/5 w-full">
                                            <p className="text-xs font-bold" style={{ color: textHighlight }}>
                                                {discount.points_cost > 0 ? `${discount.points_cost} pts` : 'Gratis'}
                                            </p>
                                            {remaining <= 10 && remaining > 0 && (
                                                <p className="text-[9px] text-red-400 font-bold uppercase mt-1">¡Sobran {remaining}!</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl text-center">
                            <Ticket className="w-10 h-10 mx-auto text-white/20 mb-3" />
                            <h3 className="text-sm font-bold text-white">Próximamente</h3>
                            <p className="text-xs text-white/40 mt-1">Este comercio está configurando sus beneficios.</p>
                        </div>
                    )}
                </div>

                {/* Information Section */}
                <div className="mt-10 px-6 mb-8">
                    <h2 className="text-lg font-black tracking-tight text-white mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5" style={{ color: textHighlight }} />
                        Información
                    </h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-5 space-y-4">
                            {org.address && (
                                <div className="flex items-start gap-4">
                                    <MapPin className="w-5 h-5 min-w-[20px] text-white/50" />
                                    <div className="pt-0.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-white/40">Dirección</p>
                                        <p className="text-sm font-bold text-white">{org.address}, {org.city}</p>
                                    </div>
                                </div>
                            )}
                            
                            {org.website_url && (
                                <div className="flex items-start gap-4">
                                    <Globe className="w-5 h-5 min-w-[20px] text-white/50" />
                                    <div className="pt-0.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-white/40">Sitio Web</p>
                                        <a href={org.website_url.startsWith('http') ? org.website_url : `https://${org.website_url}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold break-all" style={{ color: textHighlight }}>
                                            {org.website_url}
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                <Store className="w-5 h-5 min-w-[20px] text-white/50" />
                                <div className="pt-0.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-white/40">Moneda Oficial</p>
                                    <p className="text-sm font-bold text-white uppercase tracking-wide">
                                        {org.currency_name || 'Aynis'} <span className="opacity-50">({org.currency_symbol || 'pts'})</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Map Thumbnail Placeholder matching Stitch dark map */}
                        {(org.address || org.city) && (
                            <div className="relative h-32 w-full bg-[#111] border-t border-white/10 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 via-[#111] to-[#111]"></div>
                                <div 
                                    className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"
                                />
                                <a 
                                    href={`https://maps.google.com/?q=${encodeURIComponent(org.address + ' ' + org.city)}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="relative z-10 px-4 py-2 bg-white text-[#0a0a0a] font-bold text-xs rounded-full flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
                                >
                                    <MapPin className="w-4 h-4" />
                                    Obtener Direcciones
                                </a>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
