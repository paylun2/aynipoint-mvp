"use client"
import React, { Suspense } from 'react';
import { CheckCircle2, ShoppingBag } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function ClaimContent() {
    const supabase = createClient();
    const searchParams = useSearchParams();

    const pts = searchParams.get('pts') || 'puntos';
    const org = searchParams.get('org') || 'tu local preferido';
    let phoneStr = searchParams.get('phone') || '';

    if (phoneStr.length >= 6) {
        phoneStr = `${phoneStr.slice(0, 3)}-***-${phoneStr.slice(-3)}`;
    } else {
        phoneStr = 'tu celular';
    }

    const handleOAuthLogin = async (provider: 'google' | 'apple') => {
        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
    };

    return (
        <div className="flex flex-col min-h-screen relative w-full max-w-md mx-auto bg-primary shadow-2xl items-center justify-center p-6 text-center">

            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/20 rounded-full blur-[80px] pointer-events-none" />

            {/* Trust Anchor */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center gap-3 mb-10 mt-10 z-10">
                <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center border-2 border-[#10B981] mb-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                </div>
                <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-full px-4 py-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="text-sm text-[#10B981] font-mono font-medium">Número verificado: {phoneStr}</span>
                </div>
            </div>

            {/* The Hook */}
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 w-full max-w-[320px] mb-12 z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-custom/30 flex items-center justify-center mb-6 shadow-xl border border-slate-custom/20">
                    <ShoppingBag className="w-8 h-8 text-accent" />
                </div>
                <h1 className="text-3xl font-display font-bold text-white leading-tight mb-4">
                    ¡Tienes <span className="text-accent">{pts}</span> esperando!
                </h1>
                <p className="text-slate-400">
                    En <strong className="text-slate-200">{org}</strong>. Crea tu Billetera Soberana para usarlos en tu próxima visita.
                </p>
            </div>

            {/* Call To Action (Frictionless) */}
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 w-full flex flex-col gap-4 z-10 mt-auto mb-8 relative">
                <button
                    onClick={() => handleOAuthLogin('google')}
                    className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="text-lg">Continuar con Google</span>
                </button>

                <button
                    onClick={() => handleOAuthLogin('apple')}
                    className="w-full bg-slate-900 border border-slate-700 text-white hover:bg-slate-800 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.74 3.58-.8 1.58-.16 2.92.56 3.73 1.63-3.69 2.04-3 6.64.6 8.07-1.06 2.45-2.27 4.1-2.99 3.27ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
                    </svg>
                    <span className="text-lg">Continuar con Apple</span>
                </button>
            </div>

            <p className="text-xs text-slate-500 z-10 max-w-[280px]">
                Al continuar, aceptas la creación de tu Billetera Soberana. AyniPoint no almacena contraseñas.
            </p>

        </div>
    );
}

export default function ClaimRewardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-primary flex items-center justify-center text-white font-bold">Cargando...</div>}>
            <ClaimContent />
        </Suspense>
    );
}
