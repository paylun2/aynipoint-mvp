"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldCheck, ShieldAlert, History, Trash2, X, Lock, LogOut } from "lucide-react";
import { deleteUserAccount, getUserProfile } from "@/app/actions/profile";
import { getUserWallets } from "@/app/actions/wallet";
import { createClient } from "@/utils/supabase/client";
import B2CLayout from "@/components/layout/B2CLayout";
import { User } from "@supabase/supabase-js";

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [deleting, setDeleting] = useState(false);

    // Verificada = is_registered + celular validado por OTP
    const isVerified = profile?.is_registered === true && !!profile?.phone;

    useEffect(() => {
        const fetchData = async () => {
            setLoadingProfile(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/");
                return;
            }
            setUser(user);

            // Fetch profile from DB
            const profileRes = await getUserProfile();
            if (profileRes.success) {
                setProfile(profileRes.data);
            }

            // Fetch real wallet data for "stores" list
            const walletRes = await getUserWallets();
            if (walletRes.success && walletRes.data) {
                // Use wallet data as a proxy for recent store activity
                const recentActivity = walletRes.data
                    .filter((w: any) => w.balance > 0)
                    .map((w: any) => ({
                        id: w.org_id,
                        store: w.shop_name || 'Comercio',
                        points: w.balance,
                        type: 'earn',
                    }));
                setTransactions(recentActivity);
            }

            setLoadingProfile(false);
        };
        fetchData();
    }, [supabase, router]);

    const handleDeleteAccount = async () => {
        if (deleteInput !== "ELIMINAR") return;
        setDeleting(true);
        const res = await deleteUserAccount();
        if (res.success) {
            await supabase.auth.signOut();
            router.push("/?deleted=true");
        } else {
            setDeleting(false);
            alert("Error al eliminar cuenta: " + res.error);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario";
    const userEmail = user?.email || "";

    if (loadingProfile) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
                    <div className="text-white/40 font-bold tracking-widest text-[10px] uppercase">Cargando perfil...</div>
                </div>
            </div>
        );
    }

    return (
        <B2CLayout activeTab="profile">

            {/* Header — Ultra Premium Dark Theme */}
            <header className="flex items-center justify-between px-5 py-6 sticky top-0 bg-[#050505]/80 backdrop-blur-2xl z-20 border-b border-white/[0.04] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-4">
                    <Link href="/wallet" className="w-10 h-10 flex items-center justify-center rounded-[1rem] bg-white/5 border border-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all shadow-inner">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">AyniPoint</p>
                        <h1 className="text-xl font-black text-white tracking-tight leading-none drop-shadow-md">Mi Perfil</h1>
                    </div>
                </div>
                <button onClick={handleSignOut} className="flex items-center justify-center w-10 h-10 rounded-[1rem] bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all shadow-[inset_0_2px_10px_rgba(239,68,68,0.1)]">
                    <LogOut className="w-4 h-4 ml-0.5" />
                </button>
            </header>

            <main className="flex-1 px-5 pt-8 max-w-lg mx-auto w-full space-y-10 pb-32">

                {/* Profile Card — Dark Vault Style */}
                <div className="relative rounded-[2rem] p-8 text-center overflow-hidden bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/5 shadow-[0_20px_40px_-15px_rgba(0,0,0,1),_inset_0_1px_0_rgba(255,255,255,0.05)]">
                    {/* Ambient Glows */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-[40px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/5 rounded-full blur-[40px] pointer-events-none" />

                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden border border-white/10 bg-[#1a1a1a] shadow-[0_0_20px_rgba(0,0,0,0.5),_inset_0_2px_5px_rgba(255,255,255,0.05)] mx-auto mb-5 relative z-10 flex items-center justify-center p-1">
                        <div className="w-full h-full rounded-[1.75rem] overflow-hidden bg-white/5">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/30 text-3xl font-black">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    <h2 className="text-2xl font-black tracking-tight text-white mb-1 relative z-10">{userName}</h2>
                    {userEmail && <p className="text-[13px] font-medium text-white/40 mb-6 relative z-10">{userEmail}</p>}

                    {/* Verification Status */}
                    {isVerified ? (
                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-5 py-2.5 rounded-[1rem] font-bold text-[13px] border border-emerald-500/20 relative z-10 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <ShieldCheck className="w-4 h-4" /> Cuenta Verificada
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-5 py-2.5 rounded-[1rem] font-bold text-[13px] border border-amber-500/20 relative z-10 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                            <ShieldAlert className="w-4 h-4" /> Pendiente de Verificación
                        </div>
                    )}
                </div>

                {/* Real Transactions from Wallets */}
                <div className="space-y-4 relative">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-black tracking-widest uppercase text-white/40 flex items-center gap-2">
                            <History className="w-3.5 h-3.5 text-orange-500/60" /> Actividad Reciente
                        </h3>
                    </div>

                    {transactions.length > 0 ? (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div key={tx.id} className="group flex items-center justify-between bg-[#111] hover:bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                            <span className="text-orange-500 font-bold text-sm">{tx.store.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-[13px] text-white/80 group-hover:text-white transition-colors">{tx.store}</p>
                                            <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">Acumulación</p>
                                        </div>
                                    </div>
                                    <span className="font-black text-emerald-400 text-sm">
                                        +{tx.points.toLocaleString()} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 text-center">
                            <p className="text-white/40 text-sm font-bold mb-1">Sin movimientos</p>
                            <p className="text-[12px] text-white/30">Visita un comercio afiliado para empezar a ganar puntos.</p>
                        </div>
                    )}
                </div>

                {/* Settings Links */}
                <div className="space-y-3 pt-6 relative">
                    <h3 className="text-[11px] font-black tracking-widest uppercase text-white/40 mb-4 ml-1">Configuración</h3>
                    
                    <Link href="/settings/change-phone" className="flex items-center justify-between bg-[#0a0a0a] p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all group shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-400">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-bold text-[13px] text-white/80 group-hover:text-white transition-colors">Traslado de Número</p>
                                <p className="text-[11px] text-white/30 mt-0.5">Recuperación de cuenta (KYC).</p>
                            </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-white/20 group-hover:text-white/60 rotate-180 transition-colors" />
                    </Link>

                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center w-full justify-between bg-[#0a0a0a] p-4 rounded-2xl border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all group shadow-inner"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400 group-hover:scale-110 transition-transform">
                                <Trash2 className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-[13px] text-red-400/80 group-hover:text-red-400 transition-colors">Eliminar Cuenta</p>
                                <p className="text-[11px] text-white/30 mt-0.5">Baja lógica y borrado de datos.</p>
                            </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-white/20 group-hover:text-red-400/50 rotate-180 transition-colors" />
                    </button>
                </div>
            </main>

            {/* Soft Delete Modal — Stitch dark style */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative">
                        <button
                            onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }}
                            className="absolute top-4 right-4 text-white/40 hover:text-white bg-white/5 rounded-full p-2 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <Trash2 className="w-8 h-8 text-red-400" />
                        </div>

                        <h3 className="text-xl font-bold text-center text-white mb-2">Eliminar Cuenta</h3>
                        <p className="text-sm text-center text-white/40 mb-6 leading-relaxed">
                            Esta acción desvinculará permanentemente tus puntos y datos. Para confirmar, escribe <strong className="text-red-400">ELIMINAR</strong>.
                        </p>

                        <input
                            type="text"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            placeholder="Escribe ELIMINAR"
                            className="w-full bg-white/5 border-2 border-white/10 focus:border-red-500 rounded-xl px-4 py-3 text-center font-bold tracking-widest text-white outline-none transition-colors mb-6 uppercase"
                        />

                        <button
                            onClick={handleDeleteAccount}
                            disabled={deleting || deleteInput !== "ELIMINAR"}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-white/5 disabled:text-white/20 text-white font-bold py-4 rounded-xl shadow-lg transition-all disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {deleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                        </button>
                    </div>
                </div>
            )}
        </B2CLayout>
    );
}
