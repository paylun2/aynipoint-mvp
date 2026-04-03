"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ShieldCheck, Activity, Check } from 'lucide-react';
import { acceptInvitation } from '@/app/actions/team';

export default function PendingInvitations({ invitations }: { invitations: any[] }) {
    const router = useRouter();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleAccept = async (orgId: string) => {
        setProcessingId(orgId);
        const res = await acceptInvitation(orgId);
        setProcessingId(null);

        if (res.success) {
            // Force a hard refresh to re-evaluate the b2b routing hub logic
            router.refresh();
        } else {
            alert(res.error || "No se pudo aceptar la invitación");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 mx-auto">
                        <ShieldCheck className="w-8 h-8 text-accent" />
                    </div>
                    <h1 className="text-2xl font-black mb-2">Invitaciones Pendientes</h1>
                    <p className="text-slate-500">Te han invitado a colaborar en los siguientes negocios. Acepta para acceder al terminal.</p>
                </div>

                <div className="flex flex-col gap-4">
                    {invitations.map((inv) => {
                        const org = inv.organizations as any;
                        const isProcessing = processingId === org.id;

                        return (
                            <div key={org.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <Store className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-bold text-base truncate">{org.commercial_name}</span>
                                        <span className="text-xs text-slate-500">Rol asignado: {inv.role_code}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAccept(org.id)}
                                    disabled={isProcessing}
                                    className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm shrink-0"
                                >
                                    {isProcessing ? (
                                        <Activity className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Aceptar
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
