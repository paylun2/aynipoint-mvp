"use client"
import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Copy, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { generateSecurityToken } from '@/app/actions/wallet';
import QRCode from 'react-qr-code';

interface RedemptionSliderProps {
    storeName: string;
    storeSlug: string; // En la versión actual, storeSlug trae el orgId desde el parent
    rewardId?: string;
    rewardTitle?: string;
    maxPoints?: number;
    onClose: () => void;
}

/**
 * FASE 8 & 9: Security PIN Generator B2C.
 * Reemplaza el antiguo "Slider" de puntos por un generador estricto de PIN de seguridad.
 * El cliente no elige los puntos, solo autoriza su presencia física vía un código respaldado en BD (Redis).
 */
export default function RedemptionSlider({ storeName, storeSlug, rewardId, rewardTitle, onClose }: RedemptionSliderProps) {
    const [showTotp, setShowTotp] = useState(false);
    const [totpCode, setTotpCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const qrPayload = `AYNI|${storeSlug}|${rewardId || 'none'}|${totpCode}`;

    const handleConfirm = async () => {
        setIsGenerating(true);
        setErrorMsg('');
        
        try {
            // Llama al backend para firmar un código temporal atado a su Auth/Teléfono y Premio
            const res = await generateSecurityToken(storeSlug, rewardId || 'none');
            if (res.success && res.token) {
                setTotpCode(res.token);
                setShowTotp(true);
                setTimeLeft(60);
            } else {
                setErrorMsg(res.error || 'Error generando el código seguro.');
            }
        } catch (e: any) {
            setErrorMsg(e.message || 'Error de conexión');
        } finally {
            setIsGenerating(false);
        }
    };

    // Timer descendente simple (El backend expira el real en 60s)
    useEffect(() => {
        if (!showTotp || timeLeft <= 0) return;
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose(); // El código backend ya expiró, cerramos UI
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showTotp, timeLeft, onClose]);

    const handleCopy = () => {
        navigator.clipboard.writeText(totpCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Progress ring UI
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (circumference * timeLeft) / 60;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center items-center bg-black/80 backdrop-blur-md">
            <div
                className="w-full sm:max-w-md bg-[#050505] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col relative overflow-hidden shadow-2xl animate-in slide-in-from-bottom"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Ambient glow */}
                <div className="absolute top-0 right-1/4 w-[200px] h-[200px] bg-sky-500 rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none" />

                {/* Header */}
                <div className="p-6 flex items-center justify-between relative z-10">
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xs uppercase font-black tracking-[0.15em] text-white/60 text-center flex-1">{storeName}</h2>
                    <div className="w-10" />
                </div>

                {!showTotp ? (
                    /* ===== GET PIN VIEW ===== */
                    <div className="px-6 pb-12 pt-4 flex flex-col items-center relative z-10">
                        <div className="mb-6 w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/20 flex flex-col items-center justify-center relative shadow-[0_0_30px_rgba(14,165,233,0.15)]">
                            <ShieldCheck className="w-10 h-10 text-sky-400 drop-shadow-md" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded-full animate-ping opacity-20" />
                        </div>
                        
                        <h3 className="text-xl font-black text-white text-center tracking-tight mb-2">Autorización Requerida</h3>
                        {rewardTitle && (
                            <p className="text-sm font-semibold text-white/80 mt-1 mb-4 line-clamp-1 border-b border-white/5 pb-2 w-full text-center">
                                Premio: <span className="text-sky-400">{rewardTitle}</span>
                            </p>
                        )}
                        <p className="text-sm text-white/40 text-center max-w-[260px] leading-relaxed mb-8 mt-2">
                            Genera un código seguro para aprobar la transacción. El cajero lo escaneará o ingresará en el sistema para deducir el premio pactado.
                        </p>

                        {errorMsg && (
                            <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold text-center py-3 rounded-xl mb-6">
                                {errorMsg}
                            </div>
                        )}

                        <button
                            onClick={handleConfirm}
                            disabled={isGenerating}
                            className="w-full bg-sky-500 hover:bg-sky-400 text-black font-black py-4.5 rounded-2xl shadow-[0_0_40px_rgba(14,165,233,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:scale-100 active:scale-[0.98]"
                        >
                            {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generando PIN...</> : <><ShieldCheck className="w-5 h-5" /> Generar PIN de Autorización</>}
                        </button>
                    </div>
                ) : (
                    /* ===== TOTP VIEW ===== */
                    <div className="px-6 pb-10 flex flex-col items-center relative z-10 w-full">
                        {/* Ambient modal glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-sky-500/15 rounded-full blur-[90px] pointer-events-none mix-blend-screen" />

                        <div className="text-center mb-4 relative z-10 w-full flex flex-col items-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 uppercase tracking-[0.2em] font-black text-[9px] mb-2 shadow-lg shadow-sky-500/10">
                                <ShieldCheck className="w-3 h-3" /> PIN Generado
                            </div>
                            {rewardTitle && (
                                <p className="text-xs font-bold text-white/90 truncate w-[240px]">Premio: {rewardTitle}</p>
                            )}
                        </div>

                        {/* Hybrid Container: QR + PIN */}
                        <div className="flex flex-col items-center bg-[#101726]/80 backdrop-blur-md rounded-3xl p-6 border-[3px] border-[#0A0F1C] relative z-10 shadow-[0_0_50px_rgba(14,165,233,0.15)] mb-6">
                            
                            {/* QR Code */}
                            <div className="bg-white p-2 rounded-xl mb-4 relative group w-[160px] h-[160px] flex items-center justify-center border-4 border-white/5 shadow-xl">
                                <QRCode 
                                    value={qrPayload}
                                    size={140}
                                    className="h-auto max-w-full"
                                    fgColor="#0F172A"
                                />
                                <div className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-2">
                                     <p className="text-white font-bold text-[11px] text-center uppercase tracking-widest"><QrCode className="w-6 h-6 mx-auto mb-1 text-sky-400" />Escaneo para cajero</p>
                                </div>
                            </div>
                            
                            {/* Number Code */}
                            <div className="text-center w-full bg-black/40 py-2 rounded-xl border border-white/5">
                                <span className="font-mono text-4xl font-black tracking-[0.1em] text-white drop-shadow-md relative pl-2">{totpCode}</span>
                            </div>

                        </div>

                        {/* Flat Bar Timer */}
                        <div className="w-full relative z-10 mb-6 bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <div 
                                className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 10 ? 'bg-rose-500' : 'bg-sky-500'}`}
                                style={{ width: `${(timeLeft / 60) * 100}%` }}
                            />
                        </div>
                        <p className={`font-mono text-xs font-bold mb-6 relative z-10 uppercase tracking-widest ${timeLeft < 10 ? 'text-rose-400 animate-pulse' : 'text-sky-400'}`}>
                            Expira en 0:{timeLeft.toString().padStart(2, '0')}
                        </p>

                        <button onClick={handleCopy} className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl font-bold text-sm transition-all text-white backdrop-blur-md relative z-10 active:scale-[0.98]">
                            {copied ? <CheckCircle2 className="w-5 h-5 text-sky-400" /> : <Copy className="w-5 h-5 text-white/70" />}
                            {copied ? 'PIN Copiado' : 'Copiar PIN Manual'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
