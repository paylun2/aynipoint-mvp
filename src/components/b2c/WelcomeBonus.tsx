"use client"
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Gift } from 'lucide-react';

interface WelcomeBonusProps {
    storeName: string;
    bonusPoints: number;
    onDismiss: () => void;
}

/**
 * FASE 7: Notificación de Bienvenida / Bono Dinámico B2C.
 * Se muestra la primera vez que un usuario descubre un wallet nuevo
 * (tras la fusión de identidad JWT desde el Hub WhatsApp).
 * Incluye micro-animación de confeti y texto brillante.
 */
export default function WelcomeBonus({ storeName, bonusPoints, onDismiss }: WelcomeBonusProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 200);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={handleDismiss}
        >
            <div
                className={`max-w-sm w-full bg-[#050505] rounded-3xl p-8 text-center relative overflow-hidden shadow-[0_0_80px_-20px_rgba(249,115,22,0.3)] transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'}`}
                onClick={e => e.stopPropagation()}
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
                {/* Ambient glows */}
                <div className="absolute top-0 left-1/4 w-[200px] h-[200px] bg-orange-500 rounded-full mix-blend-screen filter blur-[100px] opacity-25 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[150px] h-[150px] bg-amber-400 rounded-full mix-blend-screen filter blur-[80px] opacity-15 pointer-events-none" />

                {/* Confetti CSS Animation */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 rounded-sm"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10%`,
                                backgroundColor: ['#f97316', '#fbbf24', '#fb923c', '#f59e0b', '#fcd34d', '#fdba74'][i % 6],
                                animation: `confetti ${2 + Math.random() * 2}s ease-in forwards`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                transform: `rotate(${Math.random() * 360}deg)`,
                            }}
                        />
                    ))}
                </div>

                {/* Close */}
                <button onClick={handleDismiss} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 text-white/40 hover:text-white flex items-center justify-center z-20 transition-colors">
                    <X className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-b from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                        <Gift className="w-10 h-10 text-orange-400" />
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-black uppercase tracking-[0.2em] mb-4">
                        <Sparkles className="w-3 h-3" /> Bono de Bienvenida
                    </div>

                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                        ¡Acreditación Confirmada!
                    </h2>

                    <p className="text-white/50 text-sm mb-6 leading-relaxed font-medium">
                        Has desbloqueado un regalo inicial en <span className="text-orange-400 font-bold">{storeName}</span>
                    </p>

                    {/* Big Points Display */}
                    <div className="bg-white/5 rounded-2xl border border-white/5 p-6 mb-6">
                        <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 drop-shadow-lg tracking-tighter">
                            +{bonusPoints.toLocaleString()}
                        </p>
                        <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mt-2">Puntos Regalados</p>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98] text-sm uppercase tracking-widest"
                    >
                        ¡Genial, Ver mi Billetera!
                    </button>
                </div>

                {/* Confetti keyframes */}
                <style jsx>{`
                    @keyframes confetti {
                        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                        100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
                    }
                `}</style>
            </div>
        </div>
    );
}
