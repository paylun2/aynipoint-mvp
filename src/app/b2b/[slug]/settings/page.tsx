"use client"

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Store, ChevronRight, Activity, Save, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getOrganizationSettings, updateOrganizationSettings } from '@/app/actions/settings';
import B2BTopNav from '@/components/b2b/B2BTopNav';

export default function B2BSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const slug = typeof params?.slug === 'string' ? params.slug : '';

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Org Data
    const [orgId, setOrgId] = useState('');
    const [orgName, setOrgName] = useState('Cargando...');
    const [role, setRole] = useState('CASHIER');
    const [orgStatus, setOrgStatus] = useState('ACTIVE');

    const [formData, setFormData] = useState({
        commercial_name: '',
        legal_name: '',
        tax_id: '',
        category: '',
        address: '',
        city: '',
        country: '',
        website_url: '',
        logo_url: '',
        ui_theme: 'DARK',
        brand_color: '#f69f09'
    });

    useEffect(() => {
        async function fetchSettings() {
            if (!slug) return;
            setIsLoading(true);
            const res = await getOrganizationSettings(slug);

            if (res.success && res.data) {
                setOrgId(res.data.id);
                setOrgName(res.data.commercial_name || '');
                setRole(res.role);
                setOrgStatus(res.data.status || 'ACTIVE');
                setFormData({
                    commercial_name: res.data.commercial_name || '',
                    legal_name: res.data.legal_name || '',
                    tax_id: res.data.tax_id || '',
                    category: res.data.category || 'RETAIL',
                    address: res.data.address || '',
                    city: res.data.city || '',
                    country: res.data.country || '',
                    website_url: res.data.website_url || '',
                    logo_url: res.data.logo_url || '',
                    ui_theme: res.data.ui_theme || 'DARK',
                    brand_color: res.data.brand_color || '#f69f09'
                });
            } else {
                setErrorMsg(res.error || 'Error al cargar los ajustes.');
            }
            setIsLoading(false);
        }
        fetchSettings();
    }, [slug]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);
        setIsSaving(true);

        const form = new FormData();
        form.append('commercial_name', formData.commercial_name);
        form.append('legal_name', formData.legal_name);
        form.append('tax_id', formData.tax_id);
        form.append('category', formData.category);
        form.append('address', formData.address);
        form.append('city', formData.city);
        form.append('country', formData.country);
        form.append('website_url', formData.website_url);
        form.append('logo_url', formData.logo_url);
        form.append('ui_theme', formData.ui_theme);
        form.append('brand_color', formData.brand_color);

        const res = await updateOrganizationSettings(orgId, form);

        if (res.success) {
            setSuccessMsg("¡Ajustes guardados correctamente!");
            setOrgName(formData.commercial_name);
            router.refresh();
        } else {
            setErrorMsg(res.error || "No se pudo guardar la información.");
        }
        setIsSaving(false);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0F172A] relative text-slate-100 font-sans">
            <B2BTopNav title="Ajustes" orgName={orgName} />

            <main className="flex-1 overflow-y-auto relative p-4 md:p-8 pb-28 md:pb-8">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f69f09]/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-3xl mx-auto relative z-10">

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                            <Activity className="w-8 h-8 animate-spin mb-4 text-[#f69f09]" />
                            <p className="font-medium">Cargando información segura...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">

                            {/* ERROR/SUCCESS MESSAGES */}
                            {errorMsg && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 text-rose-400 text-sm font-bold shadow-sm">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <p>{errorMsg}</p>
                                </div>
                            )}

                            {successMsg && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3 text-emerald-400 text-sm font-bold shadow-sm">
                                    <ShieldCheck className="w-5 h-5 shrink-0" />
                                    <p>{successMsg}</p>
                                </div>
                            )}

                            {/* ROLE WARNING */}
                            {role !== 'OWNER' && (
                                <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-4 text-amber-400 shadow-sm">
                                    <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold">Acceso de Solo Lectura</h3>
                                        <p className="text-sm mt-1 text-amber-400/80 font-medium">Tu rol actual es <b>{role}</b>. Solo el Dueño (OWNER) principal puede modificar estos datos comerciales.</p>
                                    </div>
                                </div>
                            )}

                            {/* KYB ANTI-FRAUD ENGINE: VERIFICATION STATUS */}
                            <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-sm overflow-hidden p-6 md:p-8 relative">
                                {orgStatus === 'VERIFIED' ? (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none" />
                                ) : (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[50px] pointer-events-none" />
                                )}
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                    <div>
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                                            Identidad Comercial (KYB)
                                            {orgStatus === 'VERIFIED' ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                    Verificado
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                    Pendiente
                                                </span>
                                            )}
                                        </h2>
                                        <p className="text-sm text-slate-400">
                                            {orgStatus === 'VERIFIED' 
                                                ? 'Tu negocio ha sido validado por nuestro equipo de compliance. Tienes acceso total a la red AyniPoint.' 
                                                : 'Para operar sin restricciones y retirar fondos, necesitamos validar la identidad legal de tu negocio.'}
                                        </p>
                                    </div>

                                    {orgStatus !== 'VERIFIED' && role === 'OWNER' && (
                                        <div className="shrink-0 flex items-center justify-end">
                                            <button 
                                                onClick={(e) => { e.preventDefault(); alert("Módulo KYB: Próximamente integración con Stripe Identity / Supabase Storage"); }}
                                                className="bg-white hover:bg-slate-200 text-[#0F172A] font-bold py-2.5 px-6 rounded-xl shadow-md transition-transform active:scale-95 text-sm flex items-center gap-2"
                                            >
                                                Subir DNI / Poder
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* MAIN SETTINGS FORM */}
                            <form onSubmit={handleSubmit} className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-sm overflow-hidden">
                                <div className="p-6 md:p-8 space-y-6">

                                    <div className="border-b border-[#334155] pb-4">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Store className="w-5 h-5 text-[#f69f09]" />
                                            Perfil Público
                                        </h2>
                                        <p className="text-sm text-slate-400 mt-1">Así es como tus clientes verán a tu empresa en la app.</p>
                                    </div>

                                    <div>
                                        <label htmlFor="commercial_name" className="block text-sm font-bold text-slate-300 mb-2">
                                            Nombre Comercial <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="commercial_name"
                                            name="commercial_name"
                                            value={formData.commercial_name}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl px-4 py-3 focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 outline-none font-bold disabled:opacity-50 transition-all placeholder-slate-500"
                                            disabled={role !== 'OWNER' || isSaving}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="category" className="block text-sm font-bold text-slate-300 mb-2">
                                            Categoría del Negocio
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="category"
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl px-4 py-3 focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 outline-none font-bold disabled:opacity-50 transition-all appearance-none"
                                                disabled={role !== 'OWNER' || isSaving}
                                            >
                                                <option value="RETAIL">Tienda Retail / Bodega</option>
                                                <option value="BARBERSHOP">Barbería / Salón de Belleza</option>
                                                <option value="CAFE">Cafetería / Restaurante</option>
                                                <option value="SERVICES">Servicios Profesionales</option>
                                                <option value="FITNESS">Gimnasio / Deporte</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                                <ChevronRight className="w-5 h-5 rotate-90" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#334155]">
                                        <div>
                                            <label htmlFor="legal_name" className="block text-sm font-bold text-slate-300 mb-2">
                                                Razón Social (Legal)
                                            </label>
                                            <input
                                                type="text"
                                                id="legal_name"
                                                name="legal_name"
                                                value={formData.legal_name}
                                                onChange={handleChange}
                                                placeholder="Ej: Inversiones Global SAC"
                                                className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl px-4 py-3 focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 outline-none disabled:opacity-50 transition-all text-sm font-medium placeholder-slate-500"
                                                disabled={role !== 'OWNER' || isSaving}
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="tax_id" className="block text-sm font-bold text-slate-300 mb-2">
                                                RUC / NIT
                                            </label>
                                            <input
                                                type="text"
                                                id="tax_id"
                                                name="tax_id"
                                                value={formData.tax_id}
                                                onChange={handleChange}
                                                placeholder="Ej: 20123456789"
                                                className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl px-4 py-3 focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 outline-none disabled:opacity-50 transition-all text-sm font-medium placeholder-slate-500"
                                                disabled={role !== 'OWNER' || isSaving}
                                            />
                                        </div>
                                    </div>

                                    {/* DETALLES PÚBLICOS (B2C) */}
                                    <div className="pt-6 border-t border-[#334155] space-y-6">
                                        <h3 className="text-md font-bold text-white">Información de Contacto y Ubicación (Visible en Perfil Público)</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label htmlFor="address" className="block text-sm font-bold text-slate-300 mb-2">
                                                    Dirección Física
                                                </label>
                                                <input
                                                    type="text"
                                                    id="address"
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    placeholder="Ej: Av. Primavera 123, Local 4"
                                                    className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl px-4 py-3 focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 outline-none disabled:opacity-50 transition-all text-sm font-medium placeholder-slate-500"
                                                    disabled={role !== 'OWNER' || isSaving}
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="city" className="block text-sm font-bold text-slate-300 mb-2">
                                                    Ciudad
                                                </label>
                                                <input
                                                    type="text"
                                                    id="city"
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    placeholder="Ej: Lima"
                                                    className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl px-4 py-3 focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 outline-none disabled:opacity-50 transition-all text-sm font-medium placeholder-slate-500"
                                                    disabled={role !== 'OWNER' || isSaving}
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="country" className="block text-sm font-bold text-slate-300 mb-2">
                                                    País
                                                </label>
                                                <input
                                                    type="text"
                                                    id="country"
                                                    name="country"
                                                    value={formData.country}
                                                    onChange={handleChange}
                                                    placeholder="Ej: Perú"
                                                    className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl px-4 py-3 focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 outline-none disabled:opacity-50 transition-all text-sm font-medium placeholder-slate-500"
                                                    disabled={role !== 'OWNER' || isSaving}
                                                />
                                            </div>
                                            
                                            <div className="md:col-span-2">
                                                <label htmlFor="website_url" className="block text-sm font-bold text-slate-300 mb-2">
                                                    Sitio Web o Linktree
                                                </label>
                                                <input
                                                    type="url"
                                                    id="website_url"
                                                    name="website_url"
                                                    value={formData.website_url}
                                                    onChange={handleChange}
                                                    placeholder="Ej: https://mi-negocio.com"
                                                    className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl px-4 py-3 focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 outline-none disabled:opacity-50 transition-all text-sm font-medium placeholder-slate-500"
                                                    disabled={role !== 'OWNER' || isSaving}
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label htmlFor="logo_url" className="block text-sm font-bold text-slate-300 mb-2">
                                                    URL de tu Logo (Opcional)
                                                </label>
                                                <input
                                                    type="url"
                                                    id="logo_url"
                                                    name="logo_url"
                                                    value={formData.logo_url}
                                                    onChange={handleChange}
                                                    placeholder="Ej: https://imgur.com/logo.png"
                                                    className="w-full bg-[#0F172A] border border-[#334155] text-white rounded-xl px-4 py-3 focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 outline-none disabled:opacity-50 transition-all text-sm font-medium placeholder-slate-500"
                                                    disabled={role !== 'OWNER' || isSaving}
                                                />
                                                <p className="text-xs text-slate-500 mt-2 font-medium">Por ahora soporta URLs directas a imágenes. Pronto agregaremos subida nativa.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* APARIENCIA / BRANDING */}
                                    <div className="pt-6 border-t border-[#334155]">
                                        <h3 className="text-md font-bold text-white mb-4">Apariencia del Perfil Público</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-300 mb-3">
                                                    Tema Visual
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* DARK THEME OP*/}
                                                    <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${formData.ui_theme === 'DARK' ? 'border-[#f69f09] bg-[#f69f09]/5' : 'border-[#334155] hover:border-[#f69f09]/50'}`}>
                                                        <input 
                                                            type="radio" 
                                                            name="ui_theme" 
                                                            value="DARK" 
                                                            checked={formData.ui_theme === 'DARK'} 
                                                            onChange={handleChange}
                                                            className="sr-only"
                                                            disabled={role !== 'OWNER' || isSaving}
                                                        />
                                                        <div className="w-full h-12 bg-slate-900 rounded-lg shadow-inner border border-[#334155]"></div>
                                                        <span className="text-sm font-bold text-slate-300">Oscuro Elegante</span>
                                                    </label>

                                                    {/* LIGHT THEME OP*/}
                                                    <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${formData.ui_theme === 'LIGHT' ? 'border-[#f69f09] bg-[#f69f09]/5' : 'border-[#334155] hover:border-[#f69f09]/50'}`}>
                                                        <input 
                                                            type="radio" 
                                                            name="ui_theme" 
                                                            value="LIGHT" 
                                                            checked={formData.ui_theme === 'LIGHT'} 
                                                            onChange={handleChange}
                                                            className="sr-only"
                                                            disabled={role !== 'OWNER' || isSaving}
                                                        />
                                                        <div className="w-full h-12 bg-slate-100 border border-slate-300 rounded-lg shadow-inner"></div>
                                                        <span className="text-sm font-bold text-slate-300">Claro Minimalista</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div>
                                                <label htmlFor="brand_color" className="block text-sm font-bold text-slate-300 mb-3">
                                                    Color de Marca Principal
                                                </label>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-xl border border-[#334155] overflow-hidden shrink-0 shadow-inner">
                                                        <input
                                                            type="color"
                                                            id="brand_color"
                                                            name="brand_color"
                                                            value={formData.brand_color}
                                                            onChange={handleChange}
                                                            className="w-[150%] h-[150%] -m-2 cursor-pointer"
                                                            disabled={role !== 'OWNER' || isSaving}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-400 mb-1 font-medium">Elige un color vibrante que represente tu marca.</p>
                                                        <code className="text-xs bg-[#0F172A] border border-[#334155] px-2 py-1 rounded-sm text-slate-300 font-bold font-mono">
                                                            Hex: {formData.brand_color.toUpperCase()}
                                                        </code>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {role === 'OWNER' && (
                                    <div className="bg-[#0F172A] p-6 border-t border-[#334155] flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="bg-[#f69f09] hover:bg-[#d98b08] disabled:opacity-50 text-[#0F172A] font-bold py-3 px-8 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2"
                                        >
                                            {isSaving ? (
                                                <Activity className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Save className="w-5 h-5" />
                                                    Guardar Cambios
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
