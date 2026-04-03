import React from 'react';

export default function POSTabs({ activeTab, setActiveTab }: { activeTab: 'emitir' | 'canjear', setActiveTab: (tab: 'emitir' | 'canjear') => void }) {
    return (
        <nav className="bg-[#0F172A] sticky top-0 z-10 w-full shadow-lg border-b border-[#1E293B]">
            <div className="flex px-4 justify-between max-w-4xl mx-auto">
                <button
                    onClick={() => setActiveTab('emitir')}
                    className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 flex-1 transition-all ${activeTab === 'emitir' ? 'border-[#f69f09] text-[#f69f09]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                    <span className="text-sm font-black uppercase tracking-widest">Emitir Puntos</span>
                </button>
                <button
                    onClick={() => setActiveTab('canjear')}
                    className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-4 flex-1 transition-all ${activeTab === 'canjear' ? 'border-[#f69f09] text-[#f69f09]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                    <span className="text-sm font-black uppercase tracking-widest">Canjear Puntos</span>
                </button>
            </div>
        </nav>
    );
}
