'use client'

import { useState, useEffect } from 'react'
import { getUserProfile, claimShadowAccount, deleteUserAccount } from '@/app/actions/profile'
import { Wallet, Settings, LogOut, ChevronRight, Shield, ShieldAlert, Phone, User, Bell, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function UserProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [phoneInput, setPhoneInput] = useState('')
    const [claiming, setClaiming] = useState(false)
    const [claimMsg, setClaimMsg] = useState({ text: '', type: '' })

    // Delete state
    const [deleteConfirm, setDeleteConfirm] = useState('')
    const [deleting, setDeleting] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function fetchProfile() {
            setLoading(true)
            const res = await getUserProfile()
            if (res.success) {
                setProfile(res.data)
            } else {
                // Push to login if not authenticated
                if (res.error === 'Usuario no autenticado') router.push('/')
            }
            setLoading(false)
        }
        fetchProfile()
    }, [router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handleClaimAccount = async () => {
        if (!phoneInput) return
        setClaiming(true)
        setClaimMsg({ text: '', type: '' })

        const res = await claimShadowAccount(phoneInput)
        if (res.success) {
            setClaimMsg({ text: '¡Cuenta fusionada con éxito!', type: 'success' })
            // Refresh
            const profileRes = await getUserProfile()
            if (profileRes.success) setProfile(profileRes.data)
        } else {
            setClaimMsg({ text: res.error || 'Error al validar', type: 'error' })
        }
        setClaiming(false)
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirm !== 'ELIMINAR') return
        setDeleting(true)
        const res = await deleteUserAccount()
        if (res.success) {
            await supabase.auth.signOut()
            router.push('/?deleted=true')
        } else {
            setDeleting(false)
            alert('Error al eliminar cuenta: ' + res.error)
        }
    }

    const MaskedPhone = ({ phone }: { phone: string }) => {
        if (!phone) return <span>No vinculado</span>
        const last4 = phone.slice(-4)
        return <span>+51 *** *** {last4}</span>
    }

    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando perfil...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24 md:pb-6 font-sans">
            {/* Header */}
            <div className="bg-[#0F172A] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg relative">
                <div className="max-w-md mx-auto relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md p-1 mb-4 flex items-center justify-center border-2 border-white/20 overflow-hidden shadow-xl">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-white/50" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">{profile?.full_name || 'Usuario'}</h1>
                    <p className="text-white/70 text-sm mt-1">{profile?.email}</p>

                    <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                        {profile?.is_registered ? (
                            <><Shield className="w-4 h-4 text-[#10B981]" /> <span className="text-sm font-medium text-[#10B981]">Cuenta Verificada</span></>
                        ) : (
                            <><ShieldAlert className="w-4 h-4 text-[#F59E0B]" /> <span className="text-sm font-medium text-[#F59E0B]">Cuenta Sombra Inactiva</span></>
                        )}
                    </div>
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F59E0B]/10 rounded-full blur-2xl -ml-24 -mb-24"></div>
            </div>

            {/* Main Content */}
            <div className="max-w-md mx-auto px-4 -mt-16 relative z-20 space-y-4">

                {/* Account Fusion (PLG Engine) */}
                {!profile?.is_registered && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F59E0B]/30 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#F59E0B]"></div>
                        <h2 className="font-bold text-[#0F172A] text-lg flex items-center gap-2 mb-2">
                            <Phone className="w-5 h-5 text-[#F59E0B]" />
                            Reclama tus Puntos
                        </h2>
                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                            Si ya dictaste tu celular en algún local afiliado, vincúlalo ahora para ver y gastar tus puntos secretos de tu Cuenta Sombra.
                        </p>
                        <div className="space-y-3">
                            <input
                                type="tel"
                                value={phoneInput}
                                onChange={e => setPhoneInput(e.target.value)}
                                placeholder="Ej: 999123456"
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-gray-800 font-mono text-center tracking-widest border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50 transition-all placeholder:tracking-normal placeholder:font-sans"
                            />
                            <button
                                onClick={handleClaimAccount}
                                disabled={claiming || phoneInput.length < 9}
                                className="w-full px-4 py-3 bg-[#0F172A] text-[#F59E0B] rounded-xl font-bold tracking-wide hover:bg-gray-800 transition-colors shadow-md disabled:opacity-50 flex justify-center items-center"
                            >
                                {claiming ? 'Verificando...' : 'Fusionar Cuenta'}
                            </button>
                        </div>
                        {claimMsg.text && (
                            <p className={`mt-3 text-sm text-center font-medium ${claimMsg.type === 'success' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                {claimMsg.text}
                            </p>
                        )}
                    </div>
                )}

                {/* Settings Menu */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">

                    {profile?.is_registered && (
                        <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                    <Phone className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <div className="font-medium text-[#0F172A]">Celular Verificado</div>
                                    <div className="text-sm text-gray-500 font-mono mt-0.5"><MaskedPhone phone={profile.phone} /></div>
                                </div>
                            </div>
                            <Shield className="w-5 h-5 text-green-500" />
                        </div>
                    )}

                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                <Bell className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="font-medium text-[#0F172A]">Notificaciones</div>
                                <div className="text-sm text-gray-500 mt-0.5">Alertas de promociones</div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>

                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                                <Settings className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="font-medium text-[#0F172A]">Preferencias App</div>
                                <div className="text-sm text-gray-500 mt-0.5">Idioma y moneda</div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50/50 rounded-2xl p-5 border border-red-100 mt-8">
                    <h3 className="font-bold text-red-700 flex items-center gap-2 mb-2">
                        <Trash2 className="w-5 h-5" />
                        Zona de Peligro (GDPR)
                    </h3>
                    <p className="text-sm text-red-600/80 mb-4">
                        Eliminar tu cuenta borrará todos tus puntos y desvinculará tu celular permanentemente.
                    </p>

                    <div className="space-y-3">
                        <input
                            type="text"
                            value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            placeholder="Escribe ELIMINAR para confirmar"
                            className="w-full px-4 py-3 bg-white rounded-xl text-red-900 border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-mono text-sm"
                        />
                        <button
                            onClick={handleDeleteAccount}
                            disabled={deleting || deleteConfirm !== 'ELIMINAR'}
                            className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-medium tracking-wide hover:bg-red-700 transition-colors disabled:opacity-50 disabled:bg-red-300"
                        >
                            {deleting ? 'Eliminando...' : 'Eliminar Cuenta y Datos'}
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full mt-6 p-4 rounded-xl flex items-center justify-center gap-3 text-gray-500 font-medium hover:bg-gray-100 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión Segura
                </button>
            </div>

            {/* Floating Navigation */}
            <div className="fixed bottom-6 left-0 w-full px-4 z-50">
                <nav className="max-w-md mx-auto bg-[#0F172A] rounded-2xl shadow-[0_10px_40px_-10px_rgba(15,23,42,0.5)] border border-gray-800 p-2 flex items-center justify-around backdrop-blur-xl bg-opacity-95">
                    <Link href="/wallet" className="flex flex-col items-center gap-1 p-3 text-gray-400 hover:text-white transition-colors">
                        <Wallet className="w-6 h-6" />
                        <span className="text-[10px] font-semibold tracking-wide">Billeteras</span>
                    </Link>
                    <div className="w-0.5 h-8 bg-gray-800 rounded-full opacity-50"></div>
                    <Link href="/wallet/profile" className="flex flex-col items-center gap-1 p-3 text-[#F59E0B]">
                        <User className="w-6 h-6" />
                        <span className="text-[10px] font-semibold tracking-wide">Mi Perfil</span>
                    </Link>
                </nav>
            </div>
        </div>
    )
}
