import React from 'react';
import { Delete } from 'lucide-react';

export default function Numpad({ onKeyPress, onBackspace }: { onKeyPress: (k: string) => void, onBackspace: () => void }) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

    return (
        <div className="flex-1 flex flex-col justify-end">
            <div className="grid grid-cols-3 gap-3">
                {keys.map((key) => (
                    <button
                        key={key}
                        onClick={() => onKeyPress(key)}
                        className="aspect-[5/3] sm:aspect-square bg-white/5 hover:bg-white/10 active:bg-white/20 text-white text-3xl font-bold rounded-2xl border border-white/10 shadow-sm transition-colors flex items-center justify-center"
                    >
                        {key}
                    </button>
                ))}
                <button
                    onClick={onBackspace}
                    className="aspect-[5/3] sm:aspect-square bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 text-2xl font-bold rounded-2xl border border-red-500/20 shadow-sm transition-colors flex items-center justify-center">
                    <Delete className="w-8 h-8" />
                </button>
            </div>

            <div className="mt-8 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">Terminal Activa</span>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden mx-2">
                    <div className="h-full bg-emerald-500 w-1/3 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
            </div>
        </div>
    );
}
