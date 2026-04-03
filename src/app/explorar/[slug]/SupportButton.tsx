"use client";

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { toggleLikeOrganization } from '@/app/actions/explore';
import { useRouter } from 'next/navigation';

export default function SupportButton({ 
    orgId, 
    initialLikes, 
    initialLiked, 
    isLoggedIn 
}: { 
    orgId: string, 
    initialLikes: number, 
    initialLiked: boolean,
    isLoggedIn: boolean
}) {
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    const handleToggleLike = async () => {
        if (!isLoggedIn) {
            // Si no está logueado, lo mandamos al login genérico (o claim)
            // Podríamos pasar un redirect para que vuelva aquí
            router.push(`/auth/claim?redirect=/explorar`); 
            return;
        }

        setIsPending(true);
        
        // Optimistic update
        const previousStatus = isLiked;
        setIsLiked(!previousStatus);
        setLikes(prev => previousStatus ? prev - 1 : prev + 1);

        try {
            const result = await toggleLikeOrganization(orgId);
            if (result.error) {
                // Revert Si falló
                setIsLiked(previousStatus);
                setLikes(prev => previousStatus ? prev + 1 : prev - 1);
                alert(result.error);
            }
        } catch (err) {
            // Revert
            setIsLiked(previousStatus);
            setLikes(prev => previousStatus ? prev + 1 : prev - 1);
        } finally {
            setIsPending(false);
            router.refresh();
        }
    };

    return (
        <button
            onClick={handleToggleLike}
            disabled={isPending}
            className={`w-full max-w-sm flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg transition-all duration-300 shadow-xl ${
                isLiked 
                ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20' 
                : 'bg-[#0F172A] text-white hover:bg-slate-800 dark:bg-white dark:text-[#0F172A] dark:hover:bg-slate-200'
            } active:scale-95 disabled:opacity-70 disabled:active:scale-100`}
        >
            {isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
                <Heart 
                    className={`w-6 h-6 transition-all duration-300 ${isLiked ? 'fill-current scale-110 drop-shadow-md' : ''}`} 
                />
            )}
            {isLiked ? 'Negocio Apoyado' : 'Apoyar Negocio'}
        </button>
    );
}
