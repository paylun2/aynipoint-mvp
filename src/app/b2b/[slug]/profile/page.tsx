"use client"

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Activity, LogOut, Shield, ShieldAlert, Phone, User, Bell, Settings, ChevronRight, Trash2 } from 'lucide-react';
import { getUserProfile, claimShadowAccount, deleteUserAccount } from '@/app/actions/profile';
import { createClient } from '@/utils/supabase/client';
import B2BTopNav from '@/components/b2b/B2BTopNav';

export default function B2BProfilePage() {
    const params = useParams();
    const router = useRouter();
    const slug = typeof params?.slug === 'string' ? params.slug : '';
    const supabase = createClient();

    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form Action states
    const [phoneInput, setPhoneInput] = useState('');
    const [claiming, setClaiming] = useState(false);
    const [claimMsg, setClaimMsg] = useState({ text: '', type: '' });
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!slug) return;
            setIsLoading(true);

            const profileRes = await getUserProfile();
            if (profileRes.success && profileRes.data) {
                setProfile(profileRes.data);
            } else if (profileRes.error === 'Usuario no autenticado') {
                router.push('/');
            }

            setIsLoading(false);
        }
        fetchData();
    }, [slug, router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleClaimAccount = async () => {
        if (!phoneInput) return;
        setClaiming(true);
        setClaimMsg({ text: '', type: '' });

        const res = await claimShadowAccount(phoneInput);
        if (res.success) {
            setClaimMsg({ text: '¡Cuenta fusionada con éxito!', type: 'success' });
            const profileRes = await getUserProfile();
            if (profileRes.success) setProfile(profileRes.data);
        } else {
            setClaimMsg({ text: res.error || 'Error al validar', type: 'error' });
        }
        setClaiming(false);
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirm !== 'ELIMINAR') return;
        setDeleting(true);
        const res = await deleteUserAccount();
        if (res.success) {
            await supabase.auth.signOut();
            router.push('/?deleted=true');
        } else {
            setDeleting(false);
            alert('Error al eliminar cuenta: ' + res.error);
        }
    };

    const MaskedPhone = ({ phone }: { phone: string }) => {
        if (!phone) return <span>No vinculado</span>;
        const last4 = phone.slice(-4);
        return <span>+51 *** *** {last4}</span>;
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0F172A] relative text-slate-100 font-sans">
            <B2BTopNav title="Mi Perfil" orgName="" />

            <main className="flex-1 overflow-y-auto relative p-4 md:p-8 pb-28 md:pb-8">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#f69f09]/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-2xl mx-auto space-y-6 relative z-10">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                            <Activity className="w-8 h-8 animate-spin mb-4 text-[#f69f09]" />
                            <p className="font-medium">Cargando información segura...</p>
                        </div>
                    ) : (
                        <>
                            {/* Profile Header Card */}
                            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#f69f09]/10 rounded-full blur-3xl pointer-events-none" />

                                <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
                                    <div className="w-20 h-20 rounded-full bg-[#0F172A] border-2 border-[#334155] flex items-center justify-center overflow-hidden shrink-0">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-9 h-9 text-slate-500" />
                                        )}
                                    </div>

                                    <div className="text-center sm:text-left flex-1 min-w-0">
                                        <h1 className="text-2xl font-black text-white tracking-tight truncate">{profile?.full_name || 'Empleado'}</h1>
                                        <p className="text-slate-400 text-sm mt-0.5 font-medium truncate">{profile?.email}</p>
                                        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${profile?.is_registered ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
                                            {profile?.is_registered ? (
                                                <><Shield className="w-3.5 h-3.5" /> ID Verificada</>
                                            ) : (
                                                <><ShieldAlert className="w-3.5 h-3.5" /> Cuenta Sombra</>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSignOut}
                                        className="shrink-0 w-full sm:w-auto px-5 py-2.5 bg-rose-500/10 text-rose-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-colors text-sm border border-rose-500/20"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>

                            {/* Account Fusion */}
                            {!profile?.is_registered && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 md:p-6 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 rounded-r" />
                                    <h2 className="text-base font-bold text-amber-400 flex items-center gap-2 ml-2">
                                        <Phone className="w-4 h-4 shrink-0" />
                                        Reclama tu Saldo Promocional
                                    </h2>
                                    <p className="text-sm text-amber-200/80 mt-2 ml-2 font-medium leading-relaxed">
                                        Si también acumulas puntos como cliente, vincula tu celular a tu cuenta de Google.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 mt-4 ml-2">
                                        <input
                                            type="tel"
                                            value={phoneInput}
                                            onChange={e => setPhoneInput(e.target.value)}
                                            placeholder="Ej: 999123456"
                                            className="w-full sm:w-48 px-4 py-2.5 bg-[#0F172A] border border-amber-700/30 text-white rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono text-center tracking-widest text-sm placeholder:tracking-normal placeholder:font-sans transition-all placeholder-amber-900/50"
                                        />
                                        <button
                                            onClick={handleClaimAccount}
                                            disabled={claiming || phoneInput.length < 9}
                                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-amber-950 font-bold rounded-xl transition-colors shadow-sm text-sm"
                                        >
                                            {claiming ? 'Verificando...' : 'Vincular y Reclamar'}
                                        </button>
                                    </div>
                                    {claimMsg.text && (
                                        <p className={`text-sm font-bold mt-3 ml-2 ${claimMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {claimMsg.text}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Security & Notifications */}
                            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-[#334155]">
                                    <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                                        <Settings className="w-4 h-4 text-[#f69f09]" />
                                        Seguridad y Notificaciones
                                    </h2>
                                </div>

                                <div className="divide-y divide-[#334155]">
                                    {profile?.is_registered && (
                                        <div className="px-5 py-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                    <Phone className="w-5 h-5 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-sm">Celular Operativo</div>
                                                    <div className="text-xs text-slate-400 font-mono mt-0.5"><MaskedPhone phone={profile.phone} /></div>
                                                </div>
                                            </div>
                                            <Shield className="w-5 h-5 text-emerald-500" />
                                        </div>
                                    )}

                                    <div className="px-5 py-4 flex items-center justify-between hover:bg-[#0F172A]/50 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                                <Bell className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">Alertas Operativas (POS)</div>
                                                <div className="text-xs text-slate-400 font-medium mt-0.5">Sonidos y notificaciones en caja</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="bg-[#0F172A] border border-red-900/50 rounded-2xl p-5 md:p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                                <h3 className="text-sm font-bold text-red-500 flex items-center gap-2 uppercase tracking-wider">
                                    <Trash2 className="w-4 h-4" />
                                    Zona de Peligro
                               </h3>
                                <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed max-w-lg">
                                    Al eliminar tu cuenta serás removido de todos los comercios donde tienes acceso. Esta acción es irrecuperable según políticas GDPR.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                    <input
                                        type="text"
                                        value={deleteConfirm}
                                        onChange={e => setDeleteConfirm(e.target.value)}
                                        placeholder="Escribe ELIMINAR"
                                        className="w-full sm:flex-1 px-4 py-2.5 bg-red-950/20 border border-red-900/30 text-red-200 rounded-xl focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none font-mono text-sm transition-all"
                                    />
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deleting || deleteConfirm !== 'ELIMINAR'}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:bg-red-900 text-white font-bold rounded-xl transition-colors shadow-sm text-sm shrink-0"
                                    >
                                        {deleting ? 'Eliminando...' : 'Eliminar Cuenta'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
