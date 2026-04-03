'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { validatePhoneAndOrg, executeIdentityFusion } from '@/app/actions/validation'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import {
    MessageCircle, Phone, Store, Shield, CheckCircle2,
    AlertTriangle, Loader2, ArrowLeft, LogIn
} from 'lucide-react'

/**
 * Flujo de Vinculación de Cuenta (Identity Fusion).
 * 
 * REQUISITO: El usuario DEBE tener una sesión activa de Google/Apple OAuth.
 * La vinculación reutiliza esa sesión — NUNCA crea una nueva identidad auth.
 * 
 * Paso 1: Verificar sesión OAuth activa (redirigir a login si no existe)
 * Paso 2: Ingresar celular + código comercio (opcional) → Valida Ghost User → Claim Token
 * Paso 3: Ejecutar fusión atómica (Ghost → Soberano) con el auth_user_id de la sesión OAuth
 * 
 * Futuro: Verificación WhatsApp OTP del teléfono se agregará entre paso 2 y 3.
 */
function VincularContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = createClient()
    const storeParam = searchParams.get('store') || ''

    // Auth state
    const [authUser, setAuthUser] = useState<User | null>(null)
    const [authChecked, setAuthChecked] = useState(false)

    // Flow states
    type FlowStep = 'checking_auth' | 'not_authenticated' | 'phone' | 'confirming' | 'fusing' | 'success' | 'error'
    const [step, setStep] = useState<FlowStep>('checking_auth')

    // Form data
    const [phone, setPhone] = useState('')
    const [storeCode, setStoreCode] = useState(storeParam)
    const [claimToken, setClaimToken] = useState('')

    // UI state
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [orgName, setOrgName] = useState('')
    const [maskedPhone, setMaskedPhone] = useState('')
    const [fusionResult, setFusionResult] = useState<any>(null)

    // ─── CHECK AUTH ON MOUNT ───
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setAuthUser(user)
                setStep('phone')
            } else {
                setStep('not_authenticated')
            }
            setAuthChecked(true)
        }
        checkAuth()
    }, [supabase])

    // ─── STEP 1: Validate phone (+ optional store code) ───
    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setErrorMsg(null)

        const result = await validatePhoneAndOrg(
            phone,
            storeCode.trim() || undefined
        )

        if (!result.success) {
            setErrorMsg(result.error || 'Error de validación.')
            setIsLoading(false)
            return
        }

        if (result.alreadyRegistered) {
            setErrorMsg(null)
            setOrgName(result.orgName || '')
            setStep('success')
            setFusionResult({
                success: true,
                alreadyClaimed: true,
                message: result.message
            })
            setIsLoading(false)
            return
        }

        setClaimToken(result.claimToken || '')
        setOrgName(result.orgName || '')
        setMaskedPhone(result.maskedPhone || '')

        // Ir al paso de confirmación — el usuario confirma antes de fusionar
        setStep('confirming')
        setIsLoading(false)
    }

    // ─── STEP 2: Execute fusion with current OAuth session ───
    const handleConfirmFusion = async () => {
        setIsLoading(true)
        setErrorMsg(null)
        setStep('fusing')

        const result = await executeIdentityFusion(claimToken)
        setFusionResult(result)

        if (result.success) {
            setStep('success')
            setTimeout(() => router.push('/wallet'), 3000)
        } else {
            setErrorMsg(result.error || 'Error en la fusión de identidad.')
            setStep('error')
        }
        setIsLoading(false)
    }

    const resetFlow = () => {
        setStep('phone')
        setPhone('')
        setStoreCode('')
        setClaimToken('')
        setErrorMsg(null)
        setFusionResult(null)
    }

    const userName = authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Usuario'
    const userEmail = authUser?.email || ''

    // ─── RENDER: Checking auth ───
    if (step === 'checking_auth' || !authChecked) {
        return (
            <PageShell>
                <div className="text-center py-10">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Verificando sesión...</p>
                </div>
            </PageShell>
        )
    }

    // ─── RENDER: Not authenticated — redirect to login ───
    if (step === 'not_authenticated') {
        return (
            <PageShell>
                <div className="text-center py-6">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LogIn className="w-10 h-10 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Inicia Sesión Primero</h2>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                        Para vincular tu número de celular, primero debes iniciar sesión con tu cuenta de Google o Apple.
                    </p>
                    <button
                        onClick={() => router.push('/wallet?intent=owner')}
                        className="w-full px-6 py-4 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-slate-800 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                        <LogIn className="w-4 h-4" /> Ir a Iniciar Sesión
                    </button>
                </div>
            </PageShell>
        )
    }

    // ─── RENDER: Fusing in progress ───
    if (step === 'fusing') {
        return (
            <PageShell>
                <div className="text-center py-10">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-black text-slate-900 mb-2">Vinculando Cuenta...</h2>
                    <p className="text-slate-500 text-sm">Fusionando tu identidad de forma segura. No cierres esta ventana.</p>
                </div>
            </PageShell>
        )
    }

    // ─── RENDER: Success ───
    if (step === 'success' && fusionResult) {
        return (
            <PageShell>
                <div className="text-center py-6">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">
                        {fusionResult.alreadyClaimed ? 'Cuenta Activa' : '¡Cuenta Verificada!'}
                    </h2>
                    <p className="text-slate-600 mb-6">{fusionResult.message}</p>

                    {fusionResult.bonusAwarded && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 mx-auto max-w-xs">
                            <p className="text-amber-800 font-bold">🎁 +100 puntos de bienvenida</p>
                            <p className="text-amber-600 text-sm">Cortesía de {fusionResult.orgName}</p>
                        </div>
                    )}

                    <button
                        onClick={() => router.push('/wallet')}
                        className="px-8 py-3 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-slate-800 transition-colors text-sm"
                    >
                        Ir a mi Billetera
                    </button>
                </div>
            </PageShell>
        )
    }

    // ─── RENDER: Error ───
    if (step === 'error') {
        return (
            <PageShell>
                <div className="text-center py-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">Error de Verificación</h2>
                    <p className="text-red-600 text-sm mb-6">{errorMsg}</p>
                    <button
                        onClick={resetFlow}
                        className="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-slate-800 transition-colors text-sm"
                    >
                        Intentar de Nuevo
                    </button>
                </div>
            </PageShell>
        )
    }

    // ─── RENDER: Step 2 — Confirm fusion ───
    if (step === 'confirming') {
        return (
            <PageShell>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">Confirmar Vinculación</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        Estás a punto de vincular este número a tu cuenta.
                    </p>
                </div>

                {/* Account info */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                            <LogIn className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Tu Cuenta</p>
                            <p className="font-bold text-slate-900 text-sm">{userName}</p>
                            <p className="text-[11px] text-slate-400">{userEmail}</p>
                        </div>
                    </div>

                    <div className="border-t border-slate-200" />

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Celular a vincular</p>
                            <p className="font-mono text-slate-900 text-sm">{maskedPhone}</p>
                        </div>
                    </div>

                    {orgName && orgName !== 'AyniPoint' && (
                        <>
                            <div className="border-t border-slate-200" />
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
                                    <Store className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Comercio</p>
                                    <p className="font-bold text-slate-900 text-sm">{orgName}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <button
                    onClick={handleConfirmFusion}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg text-sm"
                >
                    {isLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Vinculando...</>
                    ) : (
                        <><Shield className="w-4 h-4" /> Confirmar y Vincular</>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => { setStep('phone'); setErrorMsg(null) }}
                    className="w-full text-slate-400 text-xs font-bold hover:text-slate-700 transition-colors flex items-center justify-center gap-1 pt-3"
                >
                    <ArrowLeft className="w-3 h-3" /> Cambiar número
                </button>

                <SecurityFooter />
            </PageShell>
        )
    }

    // ─── RENDER: Step 1 — Phone Input + Optional Store Code ───
    return (
        <PageShell>
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-black text-slate-900">Vincular mi Cuenta</h1>
                <p className="text-slate-500 text-sm mt-2">
                    Ingresa el número de celular que dictaste en la caja del local para reclamar tus puntos.
                </p>
            </div>

            {/* Current session badge */}
            <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3 mb-4 border border-blue-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    {authUser?.user_metadata?.avatar_url ? (
                        <img src={authUser.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                        <span className="text-blue-600 font-bold text-xs">{userName.charAt(0)}</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-blue-500 uppercase tracking-wider font-bold">Sesión activa</p>
                    <p className="text-sm font-bold text-blue-900 truncate">{userEmail}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            </div>

            {errorMsg && <ErrorBanner message={errorMsg} />}

            <form onSubmit={handlePhoneSubmit} className="space-y-4 mt-2">
                <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        <Phone className="w-3.5 h-3.5 inline mr-1" />
                        Número de Celular
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="999 123 456"
                        required
                        autoFocus
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-center tracking-widest text-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:tracking-normal placeholder:text-base placeholder:font-sans"
                    />
                </div>

                {/* Código del comercio — OPCIONAL */}
                <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        <Store className="w-3.5 h-3.5 inline mr-1" />
                        Código del Comercio <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                    </label>
                    <input
                        type="text"
                        value={storeCode}
                        onChange={e => setStoreCode(e.target.value.toUpperCase().slice(0, 20))}
                        placeholder="Ej: BRV-8X2"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-center tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                        Si tienes el código QR del local, escríbelo aquí. Si no lo tienes, buscaremos por tu celular.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || phone.replace(/\D/g, '').length < 9}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg text-sm"
                >
                    {isLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                    ) : (
                        <><MessageCircle className="w-4 h-4" /> Buscar mis Puntos</>
                    )}
                </button>
            </form>

            <SecurityFooter />
        </PageShell>
    )
}

// ─── Reusable Components ───

function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 md:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">{children}</div>
            </div>
        </div>
    )
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mt-4">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{message}</p>
        </div>
    )
}

function SecurityFooter() {
    return (
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" />
                Conexión cifrada. Tus datos están protegidos.
            </p>
        </div>
    )
}

// ─── Page Export with Suspense ───

export default function VincularPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        }>
            <VincularContent />
        </Suspense>
    )
}
