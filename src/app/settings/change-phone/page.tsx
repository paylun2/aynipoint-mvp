"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShieldAlert, UploadCloud, Smartphone, FileCheck, AlertTriangle, Fingerprint, RefreshCcw } from "lucide-react";

export default function ChangePhonePage() {
    const [step, setStep] = useState(1);
    const [newPhone, setNewPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Simulate flow
    const handleNextStep = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setStep(step + 1);
        }, 1000);
    };

    return (
        <div className="bg-[#F8FAFC] dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans selection:bg-accent/30 selection:text-accent pb-16">

            {/* Header */}
            <header className="flex items-center p-4 sticky top-0 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-800 shadow-sm gap-4">
                <Link href="/profile" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-[#0F172A] dark:text-white tracking-tight">Traslado de Número</h1>
                    <p className="text-xs text-slate-500 font-medium tracking-wide">Paso {step} de 4</p>
                </div>
            </header>

            <main className="flex-1 px-4 pt-8 max-w-lg mx-auto w-full">

                {/* STEP 1: Step-Up Auth Warning */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Fingerprint className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-bold tracking-tight mb-3">Autenticación Requerida</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                Estás a punto de iniciar el protocolo de traslado de Cuenta Sombra a un nuevo número. Por seguridad, requerimos confirmar tu identidad con Google / Apple.
                            </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-4 rounded-r-xl flex gap-3">
                            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0" />
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-200/80 leading-relaxed">
                                Tu cuenta actual será <b>Bloqueada Temporalmente</b> (is_frozen_for_review) hasta que el equipo de soporte apruebe el traslado manual.
                            </p>
                        </div>

                        <button
                            onClick={handleNextStep}
                            disabled={isSubmitting}
                            className="w-full bg-[#0F172A] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#0F172A] font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50"
                        >
                            {isSubmitting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : "Re-Autenticar con Google"}
                        </button>
                    </div>
                )}

                {/* STEP 2: New Number & OTP */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Smartphone className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-bold tracking-tight mb-3">Tu Nuevo Número</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                Ingresa el nuevo número telefónico al que deseas trasladar tus puntos. Te enviaremos un SMS/WhatsApp con un código de validación.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nuevo Celular</label>
                                <input
                                    type="tel"
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    placeholder="Ej. 987 654 321"
                                    className="w-full mt-1 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-[#0F172A] dark:text-white outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>

                            <button
                                onClick={handleNextStep}
                                disabled={isSubmitting || newPhone.length < 9}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:shadow-none"
                            >
                                {isSubmitting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : "Enviar Código OTP"}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: KYC Upload */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="w-20 h-20 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileCheck className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-bold tracking-tight mb-3">Validación de Identidad</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                Sube una foto de tu Carnet de Identidad (DNI/CE) o un Selfie sosteniendo tu documento para validar que eres el titular original.
                            </p>
                        </div>

                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B]/50 rounded-2xl p-8 text-center hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer group">
                            <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-purple-500 mx-auto mb-4 transition-colors" />
                            <p className="font-bold text-[#0F172A] dark:text-white mb-1">Toca para Subir Documento</p>
                            <p className="text-xs text-slate-500">Formato JPG, PNG (Max 5MB)</p>
                        </div>

                        <button
                            onClick={handleNextStep}
                            disabled={isSubmitting}
                            className="w-full bg-[#0F172A] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#0F172A] font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {isSubmitting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : "Crear Ticket de Soporte"}
                        </button>
                    </div>
                )}

                {/* STEP 4: Success / Frozen State */}
                {step === 4 && (
                    <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500 pt-8">
                        <div className="w-24 h-24 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <ShieldAlert className="w-12 h-12 text-amber-600 dark:text-amber-400" />
                            <div className="absolute top-0 right-0 w-6 h-6 bg-[#0F172A] dark:bg-white rounded-full flex items-center justify-center border-2 border-white dark:border-[#0F172A]">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold tracking-tight mb-4 text-[#0F172A] dark:text-white">Cuenta Congelada</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            Hemos recibido tu solicitud de traslado de número. Tu cuenta ha sido congelada por seguridad y tu caso (Ticket #8492) está siendo revisado por Soporte.
                        </p>

                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Siguiente Paso:</p>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Te notificaremos vía correo electrónico en las próximas 24 horas.</p>
                        </div>

                        <Link href="/" className="inline-block mt-8 w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white font-bold py-4 rounded-xl transition-colors">
                            Volver al Inicio
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
