"use client"
import React, { useState, useCallback, useEffect } from 'react';
import { X, ShieldCheck, Coins, Copy, CheckCircle2 } from 'lucide-react';

interface RedemptionSliderProps {
    storeName: string;
    storeSlug: string;
    maxPoints: number;
    onClose: () => void;
}

/**
 * FASE 7: Bottom-Sheet de Canje B2C.
 * El usuario desliza un slider para elegir cuántos puntos descontar,
 * luego se genera un TOTP de 60s para autorizar en la caja POS.
 */
export default function RedemptionSlider({ storeName, storeSlug, maxPoints, onClose }: RedemptionSliderProps) {
    const [selectedPoints, setSelectedPoints] = useState(0);
    const [showTotp, setShowTotp] = useState(false);
    const [totpCode, setTotpCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);
    const [copied, setCopied] = useState(false);

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

    // Timer para TOTP
    useEffect(() => {
        if (!showTotp) return;
        setTotpCode(generateTotp());
        setTimeLeft(60);

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setTotpCode(generateTotp());
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showTotp, generateTotp]);

    const handleCopy = () => {
        navigator.clipboard.writeText(totpCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConfirm = () => {
        if (selectedPoints <= 0) return;
        setShowTotp(true);
    };

    // Presets rápidos
    const presets = [
        { label: '25%', value: Math.floor(maxPoints * 0.25) },
        { label: '50%', value: Math.floor(maxPoints * 0.50) },
        { label: '75%', value: Math.floor(maxPoints * 0.75) },
        { label: 'Max', value: maxPoints },
    ].filter(p => p.value > 0);

    // Progress ring
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (circumference * timeLeft) / 60;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/70 backdrop-blur-sm">
            <div
                className="w-full sm:max-w-md bg-[#050505] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col relative overflow-hidden shadow-2xl"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Ambient glow */}
                <div className="absolute top-0 right-1/4 w-[200px] h-[200px] bg-orange-500 rounded-full mix-blend-screen filter blur-[100px] opacity-15 pointer-events-none" />

                {/* Header */}
                <div className="p-6 flex items-center justify-between relative z-10">
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xs uppercase font-black tracking-[0.15em] text-white/60">{storeName}</h2>
                    <div className="w-10" />
                </div>

                {!showTotp ? (
                    /* ===== SLIDER VIEW ===== */
                    <div className="px-6 pb-10 flex flex-col items-center relative z-10">
                        <div className="mb-2">
                            <Coins className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Selecciona cuánto canjear</p>
                        </div>

                        {/* Big Number Display */}
                        <div className="my-6 text-center">
                            <span className="text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg">
                                {selectedPoints.toLocaleString()}
                            </span>
                            <span className="text-xl text-orange-400/70 font-bold ml-2 uppercase tracking-widest">PTS</span>
                        </div>

                        {/* Slider */}
                        <div className="w-full px-2 mb-6">
                            <input
                                type="range"
                                min={0}
                                max={maxPoints}
                                step={Math.max(1, Math.floor(maxPoints / 100))}
                                value={selectedPoints}
                                onChange={e => setSelectedPoints(Number(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10"
                                style={{
                                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${(selectedPoints / maxPoints) * 100}%, rgba(255,255,255,0.1) ${(selectedPoints / maxPoints) * 100}%, rgba(255,255,255,0.1) 100%)`
                                }}
                            />
                            <div className="flex justify-between mt-2">
                                <span className="text-[10px] text-white/30 font-bold">0</span>
                                <span className="text-[10px] text-white/30 font-bold">{maxPoints.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex gap-2 mb-8 w-full">
                            {presets.map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => setSelectedPoints(p.value)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                        selectedPoints === p.value
                                            ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                                            : 'bg-white/5 border border-white/5 text-white/50 hover:bg-white/10'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Confirm Button */}
                        <button
                            onClick={handleConfirm}
                            disabled={selectedPoints <= 0}
                            className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black py-4 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            <ShieldCheck className="w-4 h-4" /> Generar Token de Canje
                        </button>
                    </div>
                ) : (
                    /* ===== TOTP VIEW ===== */
                    <div className="px-6 pb-10 flex flex-col items-center relative z-10">
                        {/* Ambient modal glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[80px] pointer-events-none" />

                        <div className="text-center mb-4 relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 uppercase tracking-[0.2em] font-black text-[9px] mb-4">
                                <ShieldCheck className="w-3 h-3" /> Token Activo
                            </div>
                            <p className="text-xs text-white/40 font-medium">Canjeando <span className="text-orange-400 font-bold">{selectedPoints.toLocaleString()} pts</span></p>
                        </div>

                        {/* Circular Timer + TOTP */}
                        <div className="relative w-52 h-52 flex items-center justify-center mb-6 z-10">
                            <div className="absolute inset-1 border-[1.5px] border-dashed border-sky-500/15 rounded-full animate-[spin_20s_linear_infinite]" />
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <defs>
                                    <linearGradient id="skySlider" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#0ea5e9" />
                                        <stop offset="100%" stopColor="#0284c7" />
                                    </linearGradient>
                                </defs>
                                <circle cx="50%" cy="50%" fill="transparent" r={radius} stroke="rgba(255,255,255,0.03)" strokeWidth="5" />
                                <circle
                                    cx="50%" cy="50%" fill="transparent" r={radius}
                                    stroke="url(#skySlider)" strokeWidth="5"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-linear drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                                />
                            </svg>
                            <div className="flex flex-col items-center z-10 bg-[#050505] w-[140px] h-[140px] rounded-full justify-center border border-white/10 shadow-[inset_0_0_40px_rgba(14,165,233,0.1)]">
                                <span className="font-mono text-4xl font-black tracking-widest text-white drop-shadow-md">{totpCode}</span>
                                <span className={`mt-2 font-mono text-sm font-black ${timeLeft < 10 ? 'text-rose-400 animate-pulse' : 'text-sky-400'}`}>
                                    0:{timeLeft.toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        <p className="text-white/40 text-[11px] text-center leading-relaxed max-w-[260px] mb-6 relative z-10">
                            Dicta este token al cajero para completar tu canje de <span className="text-orange-400 font-bold">{selectedPoints.toLocaleString()} pts</span>.
                        </p>

                        <button onClick={handleCopy} className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-3.5 px-8 rounded-2xl font-bold text-sm transition-all text-white backdrop-blur-md relative z-10">
                            {copied ? <CheckCircle2 className="w-5 h-5 text-sky-400" /> : <Copy className="w-5 h-5 text-white/70" />}
                            {copied ? 'Copiado' : 'Copiar Token'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
