"use client"
import React from 'react';
import { Store, Download, QrCode } from 'lucide-react';
import B2BTopNav from '@/components/b2b/B2BTopNav';

export default function B2BQRCenter() {
    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0F172A] relative font-sans text-slate-100">
            <B2BTopNav title="Centro QR" />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8 flex flex-col relative w-full max-w-7xl mx-auto">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f69f09]/5 rounded-full blur-[100px] pointer-events-none" />

                <header className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-8 z-10 w-full gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">Centro de Impresión y QR</h2>
                            <p className="text-slate-400 mt-1 text-sm md:text-base font-medium">Descarga el material promocional para tu local físico.</p>
                        </div>
                    </div>
                    <div className="bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm w-full md:w-auto justify-between md:justify-start">
                        <span className="text-sm text-slate-400 font-bold">Código Local:</span>
                        <span className="font-mono text-lg font-black tracking-widest text-[#f69f09]">BRV-8X2</span>
                    </div>
                </header>

                <div className="flex-1 w-full flex flex-col lg:flex-row gap-8 lg:gap-12 z-10">

                    {/* Visual Canvas (Mock Acrylic Stand) */}
                    <div className="flex-[1.5] bg-[#1E293B] rounded-[2rem] border border-[#334155] flex items-center justify-center p-8 md:p-12 shadow-inner relative overflow-hidden">

                        {/* Abstract background for the preview area */}
                        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,rgba(246,159,9,.1)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />

                        {/* The physical "Acrylic" mockup - STAYS BRIGHT WHITE FOR REALISM */}
                        <div className="relative w-[280px] h-[400px] bg-white rounded-lg shadow-2xl flex flex-col items-center justify-center p-6 border-b-[20px] border-slate-200 transform hover:scale-105 transition-transform duration-500 ease-out">
                            {/* Branding Top */}
                            <div className="w-full flex justify-center mb-6">
                                <div className="flex items-center gap-2">
                                    <Store className="w-5 h-5 text-slate-900" />
                                    <span className="font-bold text-slate-900 tracking-tight">Tu Negocio</span>
                                </div>
                            </div>

                            {/* Call to action */}
                            <h3 className="text-xl font-black text-center text-slate-900 leading-tight mb-6">
                                ¡Escanea y<br /><span className="text-[#f69f09]">Gana Puntos!</span>
                            </h3>

                            {/* QR Code Graphic (CSS Mockup) */}
                            <div className="w-48 h-48 bg-white border border-slate-200 rounded-xl p-2 shadow-sm mb-6 flex flex-col">
                                <div className="flex-1 grid grid-cols-4 grid-rows-4 gap-1">
                                    <div className="col-span-1 row-span-1 bg-[#0F172A] rounded-sm border-[3px] border-white ring-2 ring-[#0F172A]"></div>
                                    <div className="col-span-2 row-span-1 bg-transparent"></div>
                                    <div className="col-span-1 row-span-1 bg-[#0F172A] rounded-sm border-[3px] border-white ring-2 ring-[#0F172A]"></div>

                                    {/* Abstract static QR Pattern */}
                                    <div className="col-span-4 row-span-2 bg-slate-200 opacity-60 rounded flex flex-wrap gap-1 p-1">
                                         <div className="w-3 h-3 bg-[#0F172A] rounded-sm"></div>
                                         <div className="w-5 h-3 bg-[#0F172A] rounded-sm"></div>
                                         <div className="w-3 h-3 bg-slate-400 rounded-sm"></div>
                                         <div className="w-2 h-3 bg-[#0F172A] rounded-sm"></div>
                                         <div className="w-4 h-3 bg-slate-400 rounded-sm"></div>
                                         <div className="w-3 h-3 bg-[#0F172A] rounded-sm"></div>
                                         <div className="w-6 h-3 bg-[#0F172A] rounded-sm"></div>
                                    </div>

                                    <div className="col-span-1 row-span-1 bg-[#0F172A] rounded-sm border-[3px] border-white ring-2 ring-[#0F172A]"></div>
                                    <div className="col-span-3 row-span-1 bg-transparent flex justify-end items-end p-1 gap-1">
                                        <div className="w-3 h-3 bg-[#0F172A] rounded-sm"></div>
                                        <div className="w-2 h-2 bg-[#f69f09] rounded-sm mt-1"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Instruction */}
                            <div className="w-full bg-slate-100 rounded-md p-2 text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Abre la cámara de tu celular</p>
                            </div>

                            {/* Stand Base Highlight */}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/50 backdrop-blur-sm" />
                        </div>
                    </div>

                    {/* Download Options */}
                    <div className="flex-1 flex flex-col justify-center gap-6">
                        <div className="bg-[#1E293B] rounded-3xl border border-[#334155] p-8 shadow-sm">
                            <div className="w-16 h-16 rounded-2xl bg-[#f69f09]/10 flex items-center justify-center mb-6 border border-[#f69f09]/20">
                                <Download className="w-8 h-8 text-[#f69f09]" />
                            </div>

                            <h3 className="text-2xl font-black text-white mb-3">Materiales Listos</h3>
                            <p className="text-slate-400 mb-8 leading-relaxed font-medium">
                                Descarga el kit oficial en PDF de alta resolución. Incluye las medidas exactas para imprimir habladores acrílicos o stickers para el mostrador.
                            </p>

                            <button className="w-full bg-[#f69f09] hover:bg-[#d98b08] text-[#0F172A] font-black py-5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg shadow-[#f69f09]/20 text-lg uppercase tracking-wide">
                                Descargar Kit de Impresión
                            </button>
                        </div>

                        <button className="w-full text-center text-slate-500 hover:text-white font-bold py-3 text-sm transition-colors">
                            Solo necesito la imagen del QR (PNG)
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
}
