'use client'

import { useState } from 'react'
import { LoyaltyRules, updateLoyaltyRules } from '@/app/actions/marketing'
import { Save, Loader2, Sparkles, AlertTriangle, Info, Clock, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function MarketingForm({ 
    orgId, 
    orgSlug,
    initialData 
}: { 
    orgId: string, 
    orgSlug: string,
    initialData: LoyaltyRules 
}) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    
    // Form State
    const [rules, setRules] = useState<LoyaltyRules>(initialData)

    const handleChange = (field: keyof LoyaltyRules, value: number) => {
        setRules(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMsg(null)

        const result = await updateLoyaltyRules(orgId, rules)
        
        if (result.success) {
            setMsg({ type: 'success', text: 'Configuración guardada exitosamente.' })
            router.refresh() // Actualiza los datos del servidor
        } else {
            setMsg({ type: 'error', text: result.error || 'Error al guardar.' })
        }
        setIsSaving(false)
    }

    const days = [
        { key: 'multiplier_monday', label: 'Lunes' },
        { key: 'multiplier_tuesday', label: 'Martes' },
        { key: 'multiplier_wednesday', label: 'Miércoles' },
        { key: 'multiplier_thursday', label: 'Jueves' },
        { key: 'multiplier_friday', label: 'Viernes' },
        { key: 'multiplier_saturday', label: 'Sábado' },
        { key: 'multiplier_sunday', label: 'Domingo' },
    ]

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {msg && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {msg.type === 'success' ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
                    <p className="font-bold text-sm">{msg.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Modulo 1: Campañas de Días Felices */}
                <section className="bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#334155] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#f69f09]/10 rounded-full blur-3xl -z-10"></div>
                    
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-5 h-5 text-[#f69f09]" />
                        <h2 className="text-xl font-bold text-white">Campañas Días Felices</h2>
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                        Incentiva las ventas en tus días más flojos. Configura un multiplicador (Ej. 2.0x) y el sistema entregará automáticamente el doble de puntos esos días.
                    </p>

                    <div className="space-y-4">
                        {days.map(day => (
                            <div key={day.key} className="flex items-center justify-between p-3 bg-[#0F172A] rounded-xl border border-[#334155]">
                                <span className="font-bold text-slate-300">{day.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500">x</span>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        min="1.0" 
                                        max="10.0"
                                        value={rules[day.key as keyof LoyaltyRules]}
                                        onChange={(e) => handleChange(day.key as keyof LoyaltyRules, parseFloat(e.target.value))}
                                        className="w-20 text-center font-bold text-[#f69f09] bg-[#1E293B] border border-[#334155] rounded-lg py-1.5 focus:ring-1 focus:ring-[#f69f09]/50 focus:border-[#f69f09]/50 focus:outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Horario Activo */}
                    <div className="mt-6 p-4 bg-[#0F172A] rounded-xl border border-[#334155]">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-[#f69f09]" />
                            <h3 className="text-sm font-bold text-slate-300">Horario Activo del Multiplicador</h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                            Los multiplicadores solo se aplicarán dentro de este rango horario. Fuera de este horario, los puntos se entregan x1.
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Desde</label>
                                <select
                                    value={rules.hour_start ?? 0}
                                    onChange={(e) => handleChange('hour_start', parseInt(e.target.value))}
                                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl py-2 px-3 font-bold text-white focus:ring-1 focus:ring-[#f69f09]/50 focus:border-[#f69f09]/50 focus:outline-none"
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-slate-500 font-bold mt-5">→</span>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Hasta</label>
                                <select
                                    value={rules.hour_end ?? 23}
                                    onChange={(e) => handleChange('hour_end', parseInt(e.target.value))}
                                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl py-2 px-3 font-bold text-white focus:ring-1 focus:ring-[#f69f09]/50 focus:border-[#f69f09]/50 focus:outline-none"
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-[#f69f09]/5 rounded-xl border border-[#f69f09]/20 flex items-start gap-3">
                        <Info className="w-5 h-5 text-[#f69f09] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#f69f09]/90 font-medium">Ejemplo: Si un día tiene "2.0" y el horario es 12:00 → 15:00, una compra de S/ 50 a las 13:00 entregará 100 puntos. A las 16:00, entregará los 50 puntos normales.</p>
                    </div>
                </section>

                {/* Modulo 2: Escudo Anti-Fraude */}
                <section className="bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#334155]">
                    <div className="flex items-center gap-2 mb-6">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-xl font-bold text-white">Escudo Anti-Fraude</h2>
                    </div>

                    <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                        Reglas estrictas para proteger tu programa de lealtad de errores humanos (Fat Finger) o empleados malintencionados.
                    </p>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">
                                Límite Máximo de Puntos por Venta
                            </label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    min="1"
                                    value={rules.max_points_per_transaction}
                                    onChange={(e) => handleChange('max_points_per_transaction', parseInt(e.target.value))}
                                    className="w-full text-lg font-bold text-white bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 focus:ring-1 focus:ring-[#f69f09]/50 focus:border-[#f69f09]/50 focus:outline-none placeholder-slate-500"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">PTS</div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Nadie podrá otorgar una cantidad mayor a esta en el POS.</p>
                        </div>

                        <div className="pt-6 border-t border-[#334155]">
                            <label className="block text-sm font-bold text-slate-300 mb-2">
                                Horas de Bloqueo entre Compras
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                    <Clock className="w-5 h-5 text-slate-500" />
                                </div>
                                <input 
                                    type="number"
                                    min="0"
                                    value={rules.min_hours_between_tx}
                                    onChange={(e) => handleChange('min_hours_between_tx', parseInt(e.target.value))}
                                    className="w-full text-lg font-bold text-white bg-[#0F172A] border border-[#334155] rounded-xl pl-12 pr-4 py-3 focus:ring-1 focus:ring-[#f69f09]/50 focus:border-[#f69f09]/50 focus:outline-none placeholder-slate-500"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">HRS</div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Evita que un cajero le dé puntos al mismo amigo consecutivamente. (0 = Desactivado).</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Save Action */}
            <div className="flex justify-end pt-4 border-t border-[#334155]">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#f69f09] hover:bg-[#d98b08] text-[#0F172A] font-bold py-4 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Guardar Configuración
                </button>
            </div>
        </form>
    )
}
