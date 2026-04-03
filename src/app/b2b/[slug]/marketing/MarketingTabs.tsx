"use client"

import React, { useState } from 'react';
import { Users, Settings, MessageSquarePlus } from 'lucide-react';
import CustomerDirectory from './CustomerDirectory';
import MarketingForm from './MarketingForm';
import { LoyaltyRules } from '@/app/actions/marketing';

export default function MarketingTabs({ 
    orgId, 
    orgSlug, 
    initialRules 
}: { 
    orgId: string, 
    orgSlug: string, 
    initialRules: LoyaltyRules 
}) {
    const [activeTab, setActiveTab] = useState<'crm' | 'rules' | 'campaigns'>('crm');

    return (
        <div className="w-full">
            {/* Tabs Header */}
            <div className="flex bg-[#0F172A] border border-[#334155] p-1.5 rounded-2xl mb-8 w-full overflow-x-auto scrollbar-hide gap-1 snap-x">
                <button
                    onClick={() => setActiveTab('crm')}
                    className={`flex-1 min-w-[180px] sm:min-w-fit flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap snap-start ${
                        activeTab === 'crm' 
                            ? 'bg-[#1E293B] text-white shadow-md border border-[#334155]' 
                            : 'text-slate-500 hover:text-white hover:bg-[#1E293B]/30'
                    }`}
                >
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="truncate">Directorio de Clientes</span>
                </button>
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`flex-1 min-w-[180px] sm:min-w-fit flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap snap-start ${
                        activeTab === 'rules' 
                            ? 'bg-[#1E293B] text-white shadow-md border border-[#334155]' 
                            : 'text-slate-500 hover:text-white hover:bg-[#1E293B]/30'
                    }`}
                >
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="truncate">Reglas Operativas</span>
                </button>
                <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`flex-1 min-w-[180px] sm:min-w-fit flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap snap-start ${
                        activeTab === 'campaigns' 
                            ? 'bg-[#1E293B] text-white shadow-md border border-[#334155]' 
                            : 'text-slate-500 hover:text-white hover:bg-[#1E293B]/30'
                    }`}
                >
                    <MessageSquarePlus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="truncate pr-8">Campañas</span>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#f69f09] text-[#0F172A] text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm shadow-sm border border-[#0F172A]/50">
                        BETA
                    </span>
                </button>
            </div>

            {/* Tab Contents */}
            <div className="w-full">
                {activeTab === 'crm' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CustomerDirectory orgId={orgId} />
                    </div>
                )}
                
                {activeTab === 'rules' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <MarketingForm orgId={orgId} orgSlug={orgSlug} initialData={initialRules} />
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-[#1E293B] rounded-xl p-12 text-center text-white relative overflow-hidden shadow-sm border border-[#334155]">
                            <div className="absolute -right-10 -top-10 w-64 h-64 bg-[#f69f09]/5 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-[#f69f09]/5 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <MessageSquarePlus className="w-16 h-16 mx-auto mb-6 text-[#f69f09]/80" strokeWidth={1.5} />
                            <h2 className="text-3xl font-black tracking-tight mb-4 relative z-10 text-white">Envía Mensajes a tus Mejores Clientes</h2>
                            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 relative z-10">
                                Próximamente podrás filtrar tu base de datos y enviar campañas de WhatsApp o SMS masivos ofreciendo doble puntaje o invitándolos a volver.
                            </p>
                            
                            <button className="bg-[#f69f09] text-[#0F172A] hover:bg-[#d98b08] font-bold px-8 py-4 rounded-xl shadow-md transition-transform hover:-translate-y-1 relative z-10">
                                Notificarme cuando esté listo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
