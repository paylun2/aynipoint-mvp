"use client"
import React, { useState, useRef, useCallback } from 'react';
import Numpad from '@/components/pos/Numpad';
import POSTabs from '@/components/pos/POSTabs';
import { Smartphone, Banknote, ShieldCheck, PlusCircle, Loader2, AlertTriangle, Gift, Lock, Crown, Rocket, WifiOff, QrCode } from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { processPosTransaction, validateSecurityToken } from '@/app/actions/pos';
import { getOrganizationBySlug } from '@/app/actions/org';
import { getDiscounts } from '@/app/actions/discounts';
import B2BTopNav from '@/components/b2b/B2BTopNav';
import { getDashboardMetrics } from '@/app/actions/dashboard';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import QRScanner from '@/components/b2b/QRScanner';

// ═══════ AUDIO FEEDBACK (Web Audio API — sin dependencias externas) ═══════
function playPosSound(type: 'success' | 'error') {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (type === 'success') {
            // Chime ascendente (do-mi-sol) — sonido de caja registradora
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523, ctx.currentTime);       // Do
            oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // Mi
            oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // Sol
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.4);
        } else {
            // Buzzer descendente corto — señal de error
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(400, ctx.currentTime);
            oscillator.frequency.setValueAtTime(250, ctx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.3);
        }
    } catch {
        // Silencioso si el navegador no soporta Web Audio API
    }
}

export default function POSPage() {
    const params = useParams();
    const isOnline = useOnlineStatus();
    const [activeTab, setActiveTab] = useState<'emitir' | 'canjear'>('emitir');

    const [orgName, setOrgName] = useState('Cargando...');
    const [currencySymbol, setCurrencySymbol] = useState('pts');
    const [phoneRule, setPhoneRule] = useState<any>(null);

    const [rewards, setRewards] = useState<any[]>([]);
    const [loadingRewards, setLoadingRewards] = useState(false);
    const [selectedReward, setSelectedReward] = useState<any>(null);

    // 🔒 FASE 6: Kill-Switch State
    const [isLocked, setIsLocked] = useState(false);
    const [ghostCount, setGhostCount] = useState(0);
    const [planTier, setPlanTier] = useState('FREE');

    // 📷 FASE 9: QR Scanner State
    const [showQRScanner, setShowQRScanner] = useState(false);

    const tokenRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];
    const [tokenValues, setTokenValues] = useState(['', '', '', '', '', '']);

    React.useEffect(() => {
        const fetchOrgAndUser = async () => {
            const slug = typeof params?.slug === 'string' ? params.slug : null;
            if (slug) {
                const res = await getOrganizationBySlug(slug);
                if (res.success && res.data) {
                    setOrgName(res.data.name);
                    setCurrencySymbol(res.data.currencySymbol);
                    setPhoneRule(res.data.phoneRule);
                }

                setLoadingRewards(true);
                const rewardsRes = await getDiscounts(slug);
                if (rewardsRes.success && rewardsRes.data) {
                    setRewards(rewardsRes.data.filter((r: any) => r.status === 'ACTIVE'));
                }
                setLoadingRewards(false);

                // 🔒 FASE 6: Pre-flight Kill-Switch check
                const metricsRes = await getDashboardMetrics(slug);
                if (metricsRes.success && metricsRes.data) {
                    const tier = metricsRes.data.planTier || 'FREE';
                    const ghosts = metricsRes.data.ghostUsers || 0;
                    setPlanTier(tier);
                    setGhostCount(ghosts);
                    if (tier === 'FREE' && ghosts >= 100) {
                        setIsLocked(true);
                    }
                }
            }
        };
        fetchOrgAndUser();
    }, [params?.slug]);

    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleNumpadPress = (key: string) => {
        setAmount(prev => prev + key);
    };

    const handleBackspace = () => {
        setAmount(prev => prev.slice(0, -1));
    };

    React.useEffect(() => {
        setAmount('');
        setFeedback(null);
        setSelectedReward(null);
        setTokenValues(['', '', '', '', '', '']); // 6 Digitos
    }, [activeTab]);

    const handleTokenInput = (index: number, value: string) => {
        const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
        const newTokens = [...tokenValues];
        newTokens[index] = char;
        setTokenValues(newTokens);

        if (char && index < 5) {
            tokenRefs[index + 1].current?.focus();
        }
    };

    const handleTokenKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !tokenValues[index] && index > 0) {
            tokenRefs[index - 1].current?.focus();
        }
    };

    const fullToken = tokenValues.join('');

    const handleQRScan = (payload: string) => {
        try {
            // Expected Format: AYNI|orgSlug|rewardId|token
            const parts = payload.split('|');
            if (parts.length === 4 && parts[0] === 'AYNI') {
                const scannedOrg = parts[1];
                const scannedRewardId = parts[2];
                const scannedToken = parts[3];

                if (scannedOrg !== params?.slug) {
                    setFeedback({ type: 'error', message: 'Token pertenece a otra sucursal.' });
                    playPosSound('error');
                    setShowQRScanner(false);
                    return;
                }

                if (scannedRewardId !== 'none') {
                    const matchReward = rewards.find(r => r.id === scannedRewardId);
                    if (matchReward) {
                        setSelectedReward(matchReward);
                    }
                }

                // Autocompletar PIN
                const tokens = scannedToken.padEnd(6, '').split('').slice(0, 6);
                setTokenValues(tokens);

                setShowQRScanner(false);
                setFeedback({ type: 'success', message: 'Token escaneado correctamente. Revisa el canje.' });
                playPosSound('success');
            } else {
                setFeedback({ type: 'error', message: 'Código QR no reconocido o formato inválido.' });
                playPosSound('error');
                setShowQRScanner(false);
            }
        } catch (e) {
            console.error("Error parsing QR", e);
        }
    };

    const handleTransaction = async () => {
        if (!phone || (activeTab === 'emitir' && !amount)) return;
        if (activeTab === 'canjear' && !selectedReward) return;

        setIsLoading(true);
        setFeedback(null);

        const slug = typeof params?.slug === 'string' ? params.slug : '';
        if (!slug) return;

        let pointsToProcess: number;
        if (activeTab === 'emitir') {
            pointsToProcess = Math.floor(Number(amount) * 0.1);
        } else {
            pointsToProcess = selectedReward.points_cost;
        }

        if (pointsToProcess <= 0 && activeTab === 'emitir') { // Only check for emitir, redeem can have 0 points cost for free rewards
            setFeedback({ type: 'error', message: 'El monto ingresado debe ser mayor a 0.' });
            setIsLoading(false);
            return;
        }

        // processPosTransaction: orgSlug, phone, points, type, securityToken, rewardId, rewardTitle
        const result = await processPosTransaction(
            slug,
            phone,
            pointsToProcess,
            activeTab === 'emitir' ? 'EARN' : 'REDEEM',
            activeTab === 'canjear' ? fullToken : undefined,
            activeTab === 'canjear' ? selectedReward?.id : undefined,
            activeTab === 'canjear' ? `${selectedReward?.discount_percentage}% DSCTO` : undefined
        );

        if (result.success) {
            const msg = activeTab === 'emitir'
                ? `¡Exitoso! Nuevo saldo del cliente: ${result.data?.newBalance} pts`
                : `¡Canje exitoso! "${selectedReward?.discount_percentage}% DSCTO" procesado. Saldo restante: ${result.data?.newBalance} pts`;
            setFeedback({ type: 'success', message: msg });
            playPosSound('success');
            setAmount('');
            setPhone('');
            setSelectedReward(null);
            setTokenValues(['', '', '', '', '', '']);
        } else {
            // 🔒 FASE 6: Detect Kill-Switch from server
            if ((result as any).killSwitch) {
                setIsLocked(true);
            }
            setFeedback({ type: 'error', message: result.error || 'Ocurrió un error en la transacción.' });
            playPosSound('error');
        }

        setIsLoading(false);
    };

    React.useEffect(() => {
        if (activeTab === 'canjear' && fullToken.length === 6 && phone && phone.length >= 9 && !isLoading) {
            handleValidateToken();
        }
    }, [fullToken, phone, activeTab]);

    const handleValidateToken = async () => {
        if (!phone || fullToken.length !== 6) return;
        setIsLoading(true);
        setFeedback(null);
        const slug = typeof params?.slug === 'string' ? params.slug : '';
        if (!slug) { setIsLoading(false); return; }

        const res = await validateSecurityToken(slug, phone, fullToken);
        if (res.success && res.rewardId) {
            const matchReward = rewards.find(r => r.id === res.rewardId);
            if (matchReward) {
                setSelectedReward(matchReward);
                setFeedback({ type: 'success', message: '¡Token Válido! Por favor verifica el premio y procede a "Confirmar Canje".' });
                playPosSound('success');
            } else {
                setFeedback({ type: 'error', message: 'Premio no encontrado en el catálogo.' });
                playPosSound('error');
            }
        } else {
            setFeedback({ type: 'error', message: res.error || 'Token inválido' });
            playPosSound('error');
        }
        setIsLoading(false);
    };

    const canSubmitCanjear = phone && selectedReward && fullToken.length === 6;
    const canValidateToken = phone && !selectedReward && fullToken.length === 6;

    return (
        <div className="flex-1 flex flex-col w-full h-full min-h-screen relative bg-[#0F172A] pb-20 font-sans text-slate-100">
            <B2BTopNav title="Terminal Caja" orgName={orgName} />
            <POSTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* 🔌 BLOQUEO POR DESCONEXIÓN — POS 100% Online */}
            {!isOnline && (
                <div className="absolute inset-0 z-40 bg-gradient-to-b from-slate-950/98 via-[#0F172A]/99 to-[#0F172A] flex items-center justify-center p-6" style={{ top: '110px' }}>
                    <div className="max-w-md w-full text-center">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(249,115,22,0.3)] animate-pulse">
                            <WifiOff className="w-10 h-10 text-orange-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Conexión Perdida</h2>
                        <p className="text-orange-400 font-bold text-sm mb-4 uppercase tracking-wider">
                            Terminal en Modo Seguro
                        </p>
                        <div className="bg-[#1E293B] rounded-xl p-4 border border-[#334155] mb-6">
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Por seguridad bancaria, el terminal requiere conexión a internet para procesar puntos.
                                Todas las transacciones deben ser validadas en tiempo real contra el servidor central.
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            Esperando reconexión automática...
                        </div>
                    </div>
                </div>
            )}

            {/* 🔒 FASE 6: KILL-SWITCH OVERLAY */}
            {isLocked && activeTab === 'emitir' && (
                <div className="absolute inset-0 z-30 bg-gradient-to-b from-red-950/95 via-[#0F172A]/98 to-[#0F172A] flex items-center justify-center p-6" style={{ top: '110px' }}>
                    <div className="max-w-md w-full text-center">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
                            <Lock className="w-10 h-10 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Caja Suspendida</h2>
                        <p className="text-red-400 font-bold text-sm mb-4 uppercase tracking-wider">
                            Límite del Plan Gratuito Alcanzado
                        </p>
                        <div className="bg-[#1E293B] rounded-xl p-4 border border-[#334155] mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Clientes Creados</span>
                                <span className="font-mono text-red-400 font-black">{ghostCount} / 100</span>
                            </div>
                            <div className="w-full bg-[#0F172A] rounded-full h-2 overflow-hidden">
                                <div className="bg-red-500 h-full rounded-full w-full"></div>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            Para seguir atendiendo clientes, dirija al cliente a escanear el código QR del comercio para liberar cupo, o contacte a la gerencia para ampliar cobertura a <span className="text-[#f69f09] font-bold">PLAN PRO</span>.
                        </p>
                        <Link
                            href={`/b2b/${params.slug}/billing`}
                            className="w-full bg-[#f69f09] hover:bg-[#d98b08] text-[#0F172A] font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-base active:scale-[0.98] shadow-[0_4px_14px_0_rgba(246,159,9,0.3)]"
                        >
                            <Rocket className="w-5 h-5" /> Actualizar a Plan PRO
                        </Link>
                        <p className="text-[10px] text-slate-600 mt-3">El canje de puntos sigue habilitado para clientes existentes.</p>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col lg:flex-row max-w-5xl mx-auto w-full p-4 lg:p-10 gap-8 lg:gap-16 relative z-10 justify-center items-center lg:items-start pt-8">

                {/* COLUMNA 1: Input de Cajero */}
                <div className={`w-full max-w-sm lg:max-w-md flex flex-col gap-6`}>
                    {/* STANDARD B2B CARD - EXACT MATCH TO DASHBOARD */}
                    <div className="bg-[#1E293B] rounded-xl p-5 border border-[#334155] shadow-sm flex flex-col overflow-hidden">

                        <div className="space-y-6 flex-1">
                            {/* Celular del cliente */}
                            <div className="flex flex-col">
                                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Smartphone className="w-3.5 h-3.5" /> Celular del Cliente
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-slate-500 font-bold pr-3 border-r border-[#334155]">
                                            {phoneRule?.dial_code || '+51'}
                                        </span>
                                    </div>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} // Solo números en UI
                                        maxLength={phoneRule?.phone_length || 9}
                                        placeholder={phoneRule?.example_number || "912345678"}
                                        className="w-full bg-[#0F172A] border-2 border-[#334155] focus:border-[#f69f09]/50 focus:ring-2 outline-none rounded-xl pl-20 pr-4 py-4 text-2xl font-bold text-slate-100 transition-all placeholder:text-[#334155] shadow-inner"
                                        style={{ color: phone ? '#f8fafc' : '#475569' }}
                                    />
                                </div>
                            </div>

                            {/* ── EMITIR TAB ── */}
                            {activeTab === 'emitir' && (
                                <>
                                    <div className="flex flex-col">
                                        <label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Banknote className="w-3.5 h-3.5" /> Monto de Venta (S/.)
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-3xl transition-colors group-focus-within:text-[#f69f09]/50 pointer-events-none">S/</span>
                                            <input
                                                type="text"
                                                value={amount}
                                                readOnly
                                                placeholder="0.00"
                                                className="w-full bg-[#0F172A] border-2 border-[#334155] focus:border-[#f69f09] focus:ring-2 outline-none rounded-xl pl-16 pr-4 py-5 text-4xl font-black text-[#f69f09] transition-all placeholder:text-[#334155] shadow-inner"
                                                style={{ color: amount ? '#f69f09' : '#334155' }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ── CANJEAR TAB ── */}
                            {activeTab === 'canjear' && (
                                <div className="flex flex-col gap-6">
                                    {/* Rewards Catalog */}
                                    <div>
                                        <label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Gift className="w-3.5 h-3.5" /> Seleccionar Premio
                                        </label>
                                        {loadingRewards ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                                            </div>
                                        ) : rewards.length === 0 ? (
                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                                                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                                <p className="text-amber-400 text-sm font-bold">No hay premios configurados</p>
                                                <p className="text-amber-500/70 text-xs mt-1">Ve a la sección "Premios" para crear catálogo.</p>
                                            </div>
                                        ) : (
                                            <div
                                                className="space-y-2 max-h-48 overflow-y-auto pr-1"
                                                style={fullToken.length >= 6 ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                                            >
                                                {rewards.map((reward) => (
                                                    <button
                                                        key={reward.id}
                                                        onClick={() => setSelectedReward(reward)}
                                                        className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${selectedReward?.id === reward.id
                                                                ? 'border-[#f69f09] bg-[#f69f09]/10'
                                                                : 'border-[#334155] hover:border-slate-600 bg-[#0F172A]'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-sm text-slate-100 truncate">
                                                                    {reward.discount_percentage}% Descuento
                                                                </p>
                                                                <p className="text-[11px] text-slate-400 mt-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                                                                    {reward.description}
                                                                </p>
                                                            </div>
                                                            <span className={`font-mono font-bold text-sm shrink-0 px-2 py-1 rounded-lg ${selectedReward?.id === reward.id
                                                                    ? 'bg-[#f69f09] text-navy-900'
                                                                    : 'bg-[#1E293B] text-slate-300'
                                                                }`}>
                                                                {reward.points_cost} pts
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Reward Summary */}
                                    {selectedReward && (
                                        <div className="p-4 bg-[#f69f09]/5 border border-[#f69f09]/20 rounded-xl text-center">
                                            <p className="text-xs uppercase font-bold tracking-widest text-[#f69f09]/80 mb-1">Puntos a Descontar</p>
                                            <p className="text-3xl font-mono font-black text-[#f69f09] tracking-tight">
                                                {selectedReward.points_cost} <span className="text-lg text-[#f69f09]/60 font-bold uppercase">{currencySymbol}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* Token Input or QR */}
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center justify-between w-full mb-3 px-2">
                                            <label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                <ShieldCheck className="w-3.5 h-3.5" /> Token de Cliente
                                            </label>
                                            <button
                                                onClick={() => setShowQRScanner(true)}
                                                className="text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
                                            >
                                                <QrCode className="w-3.5 h-3.5" /> Escanear QR
                                            </button>
                                        </div>
                                        <div className="flex justify-center gap-1.5 sm:gap-2 w-full">
                                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                                <input
                                                    key={i}
                                                    ref={tokenRefs[i]}
                                                    type="text"
                                                    maxLength={1}
                                                    value={tokenValues[i]}
                                                    onChange={(e) => handleTokenInput(i, e.target.value)}
                                                    onKeyDown={(e) => handleTokenKeyDown(i, e)}
                                                    className="w-10 h-14 sm:w-12 sm:h-16 text-center bg-[#0F172A] border-2 border-[#334155] focus:border-[#f69f09] outline-none rounded-xl uppercase text-2xl sm:text-3xl font-mono font-bold text-white transition-all placeholder:text-[#334155] shadow-inner"
                                                    placeholder="•"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button + Feedback */}
                        <div className="mt-8 flex flex-col items-center">
                            <button
                                onClick={activeTab === 'canjear' && canValidateToken ? handleValidateToken : handleTransaction}
                                disabled={
                                    isLoading ||
                                    !phone ||
                                    (activeTab === 'emitir' && !amount) ||
                                    (activeTab === 'canjear' && !canSubmitCanjear && !canValidateToken)
                                }
                                className={`w-full font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50 ${activeTab === 'emitir'
                                        ? 'bg-[#f69f09] hover:bg-[#d98b08] text-[#0F172A]'
                                        : canValidateToken
                                            ? 'bg-sky-500 hover:bg-sky-600 text-[#0F172A]'
                                            : 'bg-emerald-500 hover:bg-emerald-600 text-[#0F172A]'
                                    }`}>
                                <span>
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                                </span>
                                <span className="text-lg uppercase tracking-widest">
                                    {isLoading
                                        ? 'Procesando...'
                                        : activeTab === 'emitir'
                                            ? 'Emitir Puntos'
                                            : (canValidateToken ? 'Consultar Código' : 'Confirmar Canje')}
                                </span>
                            </button>

                            {feedback && (
                                <div className={`p-4 rounded-xl w-full text-center font-bold text-sm mt-4 border ${feedback.type === 'success'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                    {feedback.message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMNA 2: Numpad (Solo visible en emitir) */}
                <div className={`w-full max-w-sm lg:max-w-[340px] flex-col justify-center ${activeTab === 'emitir' ? 'flex' : 'hidden'} lg:flex h-[420px]`}>
                    <Numpad onKeyPress={handleNumpadPress} onBackspace={handleBackspace} />
                </div>
            </main>

            {/* FASE 9: QR Scanner Modal */}
            {showQRScanner && (
                <QRScanner
                    onScan={handleQRScan}
                    onClose={() => setShowQRScanner(false)}
                />
            )}
        </div>
    );
}
