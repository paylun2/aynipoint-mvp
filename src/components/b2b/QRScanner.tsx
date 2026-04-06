"use client"
import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X, QrCode } from 'lucide-react';

interface QRScannerProps {
    onScan: (payload: string) => void;
    onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
    const [scanError, setScanError] = useState<string>('');

    useEffect(() => {
        // Inicializar el escáner al montar
        const scanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                rememberLastUsedCamera: true
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                // Al detectar un QR exitoso, detenemos el escáner y emitimos callback
                scanner.clear();
                onScan(decodedText);
            },
            (error) => {
                // Ignore frequent errors like "No QR found"
            }
        );

        // Cleanup al desmontar
        return () => {
            scanner.clear().catch(e => console.error("Error clearing scanner", e));
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0A0F1C] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-white/5 relative">
                
                {/* Header Actions */}
                <div className="absolute top-4 inset-x-4 z-10 flex items-center justify-between pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full text-white/50 text-xs font-bold pointer-events-auto">
                        Cámara Activa
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 pointer-events-auto flex items-center justify-center text-white transition-colors border border-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 pb-4 flex flex-col items-center">
                    <QrCode className="w-8 h-8 text-sky-400 mb-4" />
                    <h3 className="text-xl font-black text-white text-center tracking-tight mb-2">Escanear Token</h3>
                    <p className="text-xs text-white/40 text-center max-w-[260px] leading-relaxed mb-6">
                        Pide al cliente que muestre el Código QR en su pantalla.
                    </p>

                    {/* Contenedor del video html5-qrcode */}
                    <div className="w-full bg-black rounded-2xl overflow-hidden border-2 border-white/10 shadow-[0_0_40px_rgba(14,165,233,0.15)] mb-6 relative">
                        <div id="reader" className="w-full rounded-2xl overflow-hidden bg-black min-h-[300px]"></div>
                    </div>
                    
                    {scanError && (
                        <p className="text-rose-400 text-xs text-center font-bold">{scanError}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
