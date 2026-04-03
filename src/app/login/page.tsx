"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCircle, Apple, Store, CreditCard, ChevronLeft, ShieldCheck, Mail, RefreshCcw, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";

export default function LoginPage() {
    const router = useRouter();
    const [b2bRole, setB2bRole] = useState<"owner" | "cashier">("owner");
    const [otpSent, setOtpSent] = useState(false);

    // Auth States
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const supabase = createClient();

    const handleOAuthLogin = async (provider: 'google' | 'apple', redirectToPath: string) => {
        setIsLoading(true);
        setErrorMsg(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${redirectToPath}?intent=${b2bRole}`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) {
            setErrorMsg(error.message);
            setIsLoading(false);
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                // Enforce proper 6-digit OTP configuration from Supabase Dashboard
                shouldCreateUser: false,
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/b2b?intent=cashier`,
            },
        });

        if (error) {
            setErrorMsg(error.message);
        } else {
            setOtpSent(true);
        }
        setIsLoading(false);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);

        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otpCode.replace(/\s/g, ''), // Remove potential spaces
            type: 'email',
        });

        if (error) {
            setErrorMsg("Código numérico de verificación inválido o expirado. Asegúrese de ingresarlo correctamente.");
        } else {
            // Success! Redirect to the B2B hub to resolve the organization slug
            router.push('/b2b');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-500 bg-[#050505] text-white">
            <Navigation />

            <main className="flex-1 flex flex-col md:flex-row mt-[72px] relative z-10 w-full">
                {/* Error Toast */}
                {errorMsg && (
                    <div className="fixed top-24 right-4 z-[60] bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-lg flex items-start gap-3 w-80 animate-in fade-in slide-in-from-top-4">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-900 dark:text-red-100">Error de Autenticación</p>
                            <p className="text-xs text-red-800 dark:text-red-200 mt-1 leading-snug">{errorMsg}</p>
                        </div>
                        <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
                            <span className="text-xl leading-none">&times;</span>
                        </button>
                    </div>
                )}

            {/* LADO IZQUIERDO: B2B (Comercios) */}
            <div className="w-full md:w-1/2 flex flex-col justify-center bg-[#050505] text-white p-8 md:p-16 lg:p-24 relative overflow-hidden border-r border-white/5">
                <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-md w-full mx-auto relative z-10">
                    <div className="mb-10 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 mb-4">
                            <Store className="w-4 h-4" /> B2B Portal
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Acceso Comercial</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">Control de sucursal y analítica en tiempo real.</p>
                    </div>

                    {/* Selector de Rol B2B */}
                    <div className="flex bg-[#111] p-1.5 rounded-xl mb-8 border border-white/5">
                        <button
                            onClick={() => { setB2bRole("owner"); setOtpSent(false); setErrorMsg(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-lg text-sm font-bold transition-all ${b2bRole === "owner"
                                ? "bg-[#1a1a1a] text-white shadow-sm border border-white/10"
                                : "text-white/40 hover:text-white"
                                }`}
                        >
                            <Store className="w-4 h-4" />
                            Administrador
                        </button>
                        <button
                            onClick={() => { setB2bRole("cashier"); setOtpSent(false); setErrorMsg(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-lg text-sm font-bold transition-all ${b2bRole === "cashier"
                                ? "bg-[#1a1a1a] text-white shadow-sm border border-white/10"
                                : "text-white/40 hover:text-white"
                                }`}
                        >
                            <CreditCard className="w-4 h-4" />
                            Cajero (POS)
                        </button>
                    </div>

                    {/* Formulario Dinámico */}
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                        {b2bRole === "owner" ? (
                            <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>

                                <button
                                    onClick={() => handleOAuthLogin('google', '/b2b')}
                                    disabled={isLoading}
                                    className="flex items-center justify-center gap-3 bg-[#111] border-2 border-white/5 hover:border-white/20 text-white font-bold py-4 rounded-xl transition-all shadow-sm disabled:opacity-50">
                                    {isLoading ? (
                                        <RefreshCcw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                    )}
                                    Continuar con Google Workspace
                                </button>

                                <div className="text-center mt-4">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Sólo cuentas corporativas autorizadas.</p>
                                </div>
                            </form>
                        ) : (
                            <div className="flex flex-col text-center">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900">
                                    <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-slate-900 dark:text-white font-bold text-xl mb-2">Ingreso Protegido</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                                    Introduce tu correo autorizado para recibir un <strong>código de verificación</strong> (Cero contraseñas).
                                </p>

                                {!otpSent ? (
                                    <form className="flex flex-col gap-4" onSubmit={handleSendOtp}>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="cajero@miempresa.com"
                                            className="bg-[#111] border border-white/10 text-white rounded-xl p-4 text-center focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none font-medium transition-all placeholder:text-white/20"
                                            disabled={isLoading}
                                        />
                                        <button
                                            disabled={isLoading || !email}
                                            className="w-full bg-white hover:bg-white/90 disabled:bg-white/20 text-black font-bold py-4 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:shadow-none disabled:transform-none"
                                        >
                                            {isLoading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <><Mail className="w-5 h-5" /> Enviar Código OTP</>}
                                        </button>
                                    </form>
                                ) : (
                                    <form className="flex flex-col gap-4" onSubmit={handleVerifyOtp}>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-left mb-2 text-sm text-slate-600 dark:text-slate-300">
                                            Código enviado a <strong>{email}</strong>
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={8}
                                            required
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                            placeholder="000000"
                                            className="bg-[#111] border-2 border-white/10 focus:border-orange-500 text-white rounded-xl p-4 text-center text-3xl font-mono font-bold tracking-[0.5em] outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-lg placeholder:text-white/20"
                                            disabled={isLoading}
                                        />
                                        <button
                                            disabled={isLoading || otpCode.length < 6}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center disabled:shadow-none disabled:transform-none"
                                        >
                                            {isLoading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : "Verificar e Ingresar al POS"}
                                        </button>
                                        <button type="button" onClick={() => { setOtpSent(false); setOtpCode(""); setErrorMsg(null); }} className="text-slate-400 text-xs font-bold hover:text-[#0F172A] dark:hover:text-white mt-2 disabled:opacity-50" disabled={isLoading}>
                                            Ingresar otro correo
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LADO DERECHO: B2C (Usuarios V2: SSO y Captura de Cuenta Sombra) */}
            <div className="w-full md:w-1/2 flex flex-col justify-center bg-[#0a0a0a] p-8 md:p-16 lg:p-24 relative text-white">
                <div className="max-w-sm w-full mx-auto text-center relative z-10">

                    <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm border border-emerald-500/20">
                        <UserCircle className="w-10 h-10 text-emerald-400" />
                    </div>

                    <h3 className="text-white text-3xl font-bold tracking-tight mb-4">Portal del Cliente</h3>
                    <p className="text-white/40 text-base leading-relaxed mb-10">
                        Descubre tu historial y reclama los puntos ("Cuentas Sombra") que ganaste en comercios al dictar tu número.
                    </p>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => handleOAuthLogin('google', '/wallet')}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-3 bg-[#111] text-white border-2 border-white/10 hover:border-white/20 font-bold py-4 rounded-xl shadow-[inset_0_2px_5px_rgba(255,255,255,0.05)] hover:-translate-y-0.5 transition-all text-lg disabled:opacity-50 disabled:transform-none">
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Ingresar con Google
                        </button>

                        <button
                            onClick={() => handleOAuthLogin('apple', '/wallet')}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-3 bg-[#111] text-white border-2 border-white/10 hover:border-white/20 font-bold py-4 rounded-xl shadow-[inset_0_2px_5px_rgba(255,255,255,0.05)] transition-all hover:-translate-y-0.5 text-lg disabled:opacity-50 disabled:transform-none">
                            <Apple className="w-6 h-6" />
                            Continuar con Apple
                        </button>
                    </div>

                    <div className="mt-8 bg-[#111] border border-white/5 rounded-2xl p-4 text-left">
                        <p className="text-xs text-white/40 leading-relaxed">
                            <strong>Seguridad Bancaria:</strong> Al iniciar sesión, el sistema te solicitará validar vía WhatsApp el número telefónico que sueles dictar en caja para fusionar tus puntos de forma segura.
                        </p>
                    </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />
            </div>

            </main>
            
            <Footer />
        </div>
    );
}
