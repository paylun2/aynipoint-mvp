"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createOrganizationAction, getActiveCountriesAction } from "@/app/actions/onboarding";
import { Store, ChevronRight, Activity, ShieldCheck, FileText, Globe } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [countries, setCountries] = useState<{country_code: string, country_name: string, dial_code: string}[]>([]);
    const [isCountriesLoading, setIsCountriesLoading] = useState(true);

    useEffect(() => {
        async function loadCountries() {
            const res = await getActiveCountriesAction();
            if (res.success && res.data) {
                setCountries(res.data);
            }
            setIsCountriesLoading(false);
        }
        loadCountries();
    }, []);

    async function onSubmit(formData: FormData) {
        setIsLoading(true);
        setErrorMsg(null);

        try {
            const result = await createOrganizationAction(formData);

            if (result.error) {
                setErrorMsg(result.error);
                setIsLoading(false);
            } else if (result.success && result.slug) {
                // Redirect immediately to the new pos/dashboard
                router.push(`/b2b/${result.slug}/dashboard`);
            }
        } catch (error) {
            setErrorMsg("Error inesperado en la red");
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1121] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-8 font-sans transition-colors duration-300">
            {/* Background embellishment */}
            <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-xl w-full relative z-10">

                <div className="text-center mb-8 relative">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-0 top-0 p-2 sm:p-3 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center"
                        title="Volver"
                    >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 rotate-180" />
                    </button>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 mx-auto">
                        <Store className="w-8 h-8 text-accent" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black mb-3 text-slate-900 dark:text-white">Registra tu Comercio</h1>
                    <p className="text-slate-500 dark:text-slate-400">Estás a un paso de revolucionar la lealtad de tus clientes.</p>
                </div>

                {errorMsg && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-start gap-3 text-sm">
                        <Activity className="w-5 h-5 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <form action={onSubmit} className="p-6 sm:p-10 flex flex-col gap-6">

                        {/* Commercial Name */}
                        <div>
                            <label htmlFor="commercial_name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Nombre Comercial (El que ven los clientes) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="commercial_name"
                                name="commercial_name"
                                required
                                placeholder="Ej: Barbería Los Bravos"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent outline-none font-medium transition-all"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Legal Name */}
                            <div>
                                <label htmlFor="legal_name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Razón Social
                                </label>
                                <input
                                    type="text"
                                    id="legal_name"
                                    name="legal_name"
                                    placeholder="Ej: Inversiones Bravos SAC"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Tax ID */}
                            <div>
                                <label htmlFor="tax_id" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    RUC / NIT
                                </label>
                                <input
                                    type="text"
                                    id="tax_id"
                                    name="tax_id"
                                    placeholder="Ej: 20123456789"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Categoría del Negocio
                            </label>
                            <div className="relative">
                                <select
                                    id="category"
                                    name="category"
                                    className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent outline-none font-medium transition-all"
                                    disabled={isLoading}
                                >
                                    <option value="RETAIL">Tienda Retail / Bodega</option>
                                    <option value="BARBERSHOP">Barbería / Salón de Belleza</option>
                                    <option value="CAFE">Cafetería / Restaurante</option>
                                    <option value="SERVICES">Servicios</option>
                                    <option value="FITNESS">Gimnasio / Deporte</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                    <ChevronRight className="w-5 h-5 rotate-90" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Country */}
                        <div>
                            <label htmlFor="country" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                País de Operación <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    id="country"
                                    name="country"
                                    required
                                    className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-accent focus:border-accent outline-none font-medium transition-all"
                                    disabled={isLoading || isCountriesLoading}
                                >
                                    {isCountriesLoading ? (
                                        <option value="">Cargando países...</option>
                                    ) : countries.length > 0 ? (
                                        countries.map(c => (
                                            <option key={c.country_code} value={c.country_code}>
                                                {c.country_name} ({c.dial_code})
                                            </option>
                                        ))
                                    ) : (
                                        <option value="PE">Perú (+51)</option> // Fallback
                                    )}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                    <ChevronRight className="w-5 h-5 rotate-90" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Define el formato de teléfono exigido al emitir puntos.
                            </p>
                        </div>

                        {/* Informative RLS Notice */}
                        <div className="mt-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 flex gap-4 text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                            <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                            <div>
                                <p className="font-bold mb-1">Medida de Seguridad Automática</p>
                                <p className="opacity-90">Como medida Anti-Spam (Q.A), los nuevos negocios entran en estado <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">PENDING_VERIFICATION</span>.</p>
                                <p className="opacity-90 mt-1">Podrás emitir puntos inmediatamente en el POS, pero no serás visible en el mapa público de clientes hasta ser aprobado.</p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-6 w-full bg-accent hover:bg-accent/90 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold py-4 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Activity className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <FileText className="w-5 h-5" />
                                    Crear Mi Negocio y Entrar
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
                    Al registrarte, aceptas los <a href="#" className="font-bold hover:text-accent transition-colors">Términos del Ledger Bancario</a>
                </p>
            </div>
        </div>
    );
}
