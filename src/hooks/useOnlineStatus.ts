"use client";

import { useState, useEffect } from "react";

/**
 * Hook que detecta el estado de conexión a internet en tiempo real.
 * Escucha los eventos nativos `online`/`offline` del navegador.
 * 
 * Por defecto asume online (true) para evitar bloqueos falsos en SSR.
 * 
 * @returns boolean — true si hay conexión, false si se perdió
 */
export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Inicializar con el estado real del navegador
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return isOnline;
}
