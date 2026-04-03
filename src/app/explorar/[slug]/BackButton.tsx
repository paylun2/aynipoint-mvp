"use client";

import { useRouter } from 'next/navigation';

export default function BackButton({ fallbackUrl = '/explorar' }: { fallbackUrl?: string }) {
    const router = useRouter();

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        
        // Return to previous page if within the app or there is a history stack.
        // Otherwise, use the fallback URL safely.
        if (window.history.length > 2 || document.referrer.includes(window.location.host)) {
            router.back();
        } else {
            router.push(fallbackUrl);
        }
    };

    return (
        <nav className="absolute top-0 w-full z-20 p-4">
            <button 
                onClick={handleBack} 
                className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex flex-col justify-center items-center text-white hover:bg-black/50 transition-all border border-white/10 cursor-pointer"
                aria-label="Volver"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
            </button>
        </nav>
    );
}
