"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import B2CLayout from "@/components/layout/B2CLayout";
import { createClient } from "@/utils/supabase/client";
import { getEncryptedQRPayload } from "@/app/actions/passport";

export default function PassportPage() {
    const [qrPayload, setQrPayload] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [timer, setTimer] = useState({ minutes: 5, seconds: 0 });

    useEffect(() => {
        async function loadUser() {
            const supabase = createClient();
            // ✅ SEGURIDAD: getUser() valida criptográficamente el JWT
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // ✅ FIX: Delegar cifrado al servidor (QR_ENCRYPTION_KEY es server-only)
                const result = await getEncryptedQRPayload();
                if (result.success && result.payload) {
                    setQrPayload(result.payload);
                }
            }
            setIsLoading(false);
        }
        loadUser();
    }, []);

    // Countdown timer for UX
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev.seconds === 0) {
                    if (prev.minutes === 0) {
                        // Reset timer (simulating token refresh)
                        return { minutes: 5, seconds: 0 };
                    }
                    return { minutes: prev.minutes - 1, seconds: 59 };
                }
                return { ...prev, seconds: prev.seconds - 1 };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatNumber = (num: number) => num.toString().padStart(2, '0');

    return (
        <B2CLayout activeTab="passport">
            <div className="flex flex-col flex-1 items-center max-w-sm mx-auto w-full pt-12 pb-32 px-6">
                
                {/* Header — Holographic Glow */}
                <div className="text-center mb-10 w-full relative">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-orange-500/20 rounded-full blur-[40px] pointer-events-none" />
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600 mb-2 relative z-10">
                        Identidad Digital
                    </p>
                    <h1 className="text-3xl font-black tracking-tight text-white mb-3 relative z-10 drop-shadow-md">AyniPassport</h1>
                    <p className="text-white/50 text-xs font-bold px-4 leading-relaxed relative z-10">
                        Muestra este código de seguridad rotativo en comercios para sumar o canjear puntos.
                    </p>
                </div>

                {/* QR Code Vault Container */}
                <div className="relative w-full aspect-square group">
                    {/* Glowing Backplate */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent rounded-[2.5rem] blur-xl group-hover:blur-2xl transition-all duration-700 pointer-events-none" />
                    
                    <div className="absolute inset-0 bg-gradient-to-b from-[#111] to-[#0a0a0a] p-1 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,1)] border border-white/5 flex flex-col items-center justify-center overflow-hidden z-10 backdrop-blur-3xl">
                        
                        {/* Neon Corner Accents */}
                        <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-orange-500/80 rounded-tl-[2.2rem] m-3 opacity-80" />
                        <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-orange-500/80 rounded-tr-[2.2rem] m-3 opacity-80" />
                        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-orange-500/80 rounded-bl-[2.2rem] m-3 opacity-80" />
                        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-orange-500/80 rounded-br-[2.2rem] m-3 opacity-80" />

                        {isLoading ? (
                            <div className="w-56 h-56 bg-white/5 rounded-2xl animate-pulse flex items-center justify-center border border-white/10">
                                <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                            </div>
                        ) : qrPayload ? (
                            <div className="bg-white p-3 rounded-2xl shadow-inner relative group-hover:scale-105 transition-transform duration-500">
                                <QRCode
                                    value={`aynipoint://pay?token=${qrPayload}`}
                                    size={210}
                                    bgColor="#ffffff"
                                    fgColor="#050505"
                                    level="H"
                                    className="rounded-lg"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full opacity-60">
                                <div className="w-12 h-12 rounded-full border border-red-500/50 flex items-center justify-center mb-3">
                                    <span className="text-red-500 text-xl">!</span>
                                </div>
                                <p className="text-white/70 text-sm font-bold tracking-wide">Identidad Inválida</p>
                            </div>
                        )}
                        
                        {/* Scanning Laser Line (Decorative) */}
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent shadow-[0_0_10px_rgba(249,115,22,0.8)] opacity-0 group-hover:opacity-100 group-hover:translate-y-[80px] -translate-y-[80px] transition-all duration-[2000ms] ease-in-out pointer-events-none" />
                    </div>
                </div>

                {/* Secure Cryptographic Timer */}
                <div className="mt-14 w-full">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                        <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">Cifrado Rotativo</p>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                    </div>
                    
                    <div className="flex justify-center gap-5">
                        <div className="flex flex-col items-center gap-2 group cursor-pointer">
                            <div className="relative flex h-16 w-20 items-center justify-center rounded-[1.25rem] bg-[#0a0a0a] shadow-[inset_0_2px_15px_rgba(255,255,255,0.02)] border border-white/5 group-hover:border-orange-500/30 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[1.25rem] pointer-events-none" />
                                <p className="text-orange-400 text-3xl font-black tabular-nums tracking-widest relative z-10 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                                    {formatNumber(timer.minutes)}
                                </p>
                            </div>
                            <span className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em]">Minutos</span>
                        </div>
                        
                        <div className="text-white/20 font-black text-2xl mt-4 animate-pulse">:</div>
                        
                        <div className="flex flex-col items-center gap-2 group cursor-pointer">
                            <div className="relative flex h-16 w-20 items-center justify-center rounded-[1.25rem] bg-[#0a0a0a] shadow-[inset_0_2px_15px_rgba(255,255,255,0.02)] border border-white/5 group-hover:border-orange-500/30 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[1.25rem] pointer-events-none" />
                                <p className="text-white/80 text-3xl font-black tabular-nums tracking-widest relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:text-white transition-colors">
                                    {formatNumber(timer.seconds)}
                                </p>
                            </div>
                            <span className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em]">Segundos</span>
                        </div>
                    </div>
                </div>

            </div>
        </B2CLayout>
    );
}
