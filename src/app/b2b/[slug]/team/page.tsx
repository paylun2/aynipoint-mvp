'use client'

import { useState, useEffect } from 'react'
import { getTeamMembers, inviteTeamMember, updateMemberStatus } from '@/app/actions/team'
import { getOrganizationBySlug } from '@/app/actions/org'
import { LayoutDashboard, Users, Target, Search, Plus, Shield, Power, Settings, Calculator } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import B2BTopNav from '@/components/b2b/B2BTopNav'

export default function TeamManagementPage() {
    const params = useParams()
    const orgSlug = typeof params?.slug === 'string' ? params.slug : ''
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [orgName, setOrgName] = useState('')
    const [currentUserRole, setCurrentUserRole] = useState('')

    // Form state
    const [inviteInput, setInviteInput] = useState('')
    const [inviteRole, setInviteRole] = useState('CASHIER')
    const [inviting, setInviting] = useState(false)
    const [message, setMessage] = useState({ text: '', type: '' })

    useEffect(() => {
        async function fetchData() {
            setLoading(true)

            // Get Org Name
            const orgRes = await getOrganizationBySlug(orgSlug)
            if (orgRes.success && orgRes.data) setOrgName(orgRes.data.name)

            // Get Members
            await loadMembers()
        }
        fetchData()
    }, [orgSlug])

    const loadMembers = async () => {
        setLoading(true)
        const res = await getTeamMembers(orgSlug)
        if (res.success) {
            setMembers(res.data || [])
            setCurrentUserRole(res.currentUserRole || 'CASHIER')
        }
        setLoading(false)
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteInput) return

        setInviting(true)
        setMessage({ text: '', type: '' })
        const res = await inviteTeamMember(orgSlug, inviteInput, inviteRole)

        if (res.success) {
            setMessage({ text: 'Invitación enviada al usuario con rol de ' + inviteRole, type: 'success' })
            setInviteInput('')
            loadMembers()
        } else {
            setMessage({ text: res.error || 'Error al invitar', type: 'error' })
        }
        setInviting(false)
    }

    const handleToggleStatus = async (memberId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
        // Disable pessimistic UI update for MVP, just wait for backend
        const res = await updateMemberStatus(memberId, newStatus)
        if (res.success) {
            loadMembers() // Refresh list
        } else {
            setMessage({ text: res.error || 'Error al actualizar estado', type: 'error' })
        }
    }

    return (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0F172A] relative text-slate-100 font-sans">
            <B2BTopNav title="Equipo B2B" orgName={orgName} />
            <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 pb-24">

                {/* Invite Section */}
                {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
                    <div className="bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#334155] flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invitar por Celular o Correo</label>
                            <input
                                type="text"
                                value={inviteInput}
                                onChange={e => setInviteInput(e.target.value)}
                                placeholder="Ej. 999123456 o empleado@local.com"
                                className="w-full px-4 py-3 rounded-xl border border-[#334155] focus:outline-none focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 transition-all bg-[#0F172A] text-white placeholder-slate-500"
                            />
                        </div>
                        <div className="w-full md:w-48 space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rol a asignar</label>
                            <select
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-[#334155] focus:outline-none focus:border-[#f69f09]/50 focus:ring-1 focus:ring-[#f69f09]/50 transition-all bg-[#0F172A] text-white"
                            >
                                <option value="CASHIER">Cajero</option>
                                <option value="MANAGER">Gerente</option>
                            </select>
                        </div>
                        <button
                            onClick={handleInvite}
                            disabled={inviting || !inviteInput}
                            className="w-full md:w-auto px-6 py-3 bg-[#f69f09] hover:bg-[#d98b08] text-[#0F172A] rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {inviting ? (
                                <div className="w-5 h-5 border-2 border-[#0F172A]/30 border-t-[#0F172A] rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-5 h-5 text-[#0F172A]" />
                                    Invitar
                                </>
                            )}
                        </button>
                    </div>
                )}

                {message.text && (
                    <div className={`p-4 rounded-xl text-sm border ${message.type === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                        {message.text}
                    </div>
                )}

                {/* Team List */}
                <div className="bg-[#1E293B] rounded-xl shadow-sm border border-[#334155] overflow-hidden">
                    <div className="p-4 border-b border-[#334155] bg-[#0F172A]/50">
                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Miembros Activos ({members?.length || 0})</h3>
                    </div>

                    <div className="divide-y divide-[#334155]/50">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                                <div className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
                                Cargando equipo...
                            </div>
                        ) : members?.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No hay otros miembros en este negocio.</div>
                        ) : (
                            members.map((member) => (
                                <div key={member.id} className="p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#0F172A]/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#0F172A] border border-[#334155] flex items-center justify-center overflow-hidden shrink-0">
                                            {member.users?.avatar_url ? (
                                                <img src={member.users.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <Users className="w-5 h-5 text-slate-500" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">
                                                {member.users?.full_name || member.users?.email || member.users?.phone || 'Usuario Fantasma'}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold border ${
                                                    member.role_code === 'OWNER' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    member.role_code === 'MANAGER' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-[#f69f09]/10 text-[#f69f09] border-[#f69f09]/20'
                                                    }`}>
                                                    {member.role_code}
                                                </span>
                                                <span className="text-slate-600">•</span>
                                                Unido {new Date(member.joined_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                                        <div className="text-sm">
                                            {member.status === 'ACTIVE' ? (
                                                <span className="text-emerald-400 font-bold text-xs px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-sm flex items-center gap-1"><Shield className="w-3 h-3" /> Activo</span>
                                            ) : member.status === 'DISABLED' ? (
                                                <span className="text-rose-400 font-bold text-xs px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-sm">Desactivado</span>
                                            ) : (
                                                <span className="text-amber-400 font-bold text-xs px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-sm">Invitado</span>
                                            )}
                                        </div>

                                        {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && member.role_code !== 'OWNER' && (
                                            <button
                                                onClick={() => handleToggleStatus(member.id, member.status)}
                                                className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors border ${member.status === 'DISABLED'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                                    }`}
                                                title={member.status === 'DISABLED' ? 'Restaurar Acceso' : 'Revocar Acceso (Kill Switch)'}
                                            >
                                                <Power className="w-4 h-4" />
                                                <span className="hidden md:inline uppercase tracking-wider">{member.status === 'DISABLED' ? 'Activar' : 'Revocar'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
