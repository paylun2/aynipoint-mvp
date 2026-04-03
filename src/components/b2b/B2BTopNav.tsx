"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Crown } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useParams } from 'next/navigation';
import { getOrganizationBySlug } from '@/app/actions/org';

interface B2BTopNavProps {
    title: string;
    orgName?: string;
}

export default function B2BTopNav({ title, orgName }: B2BTopNavProps) {
    const params = useParams();
    const [userName, setUserName] = useState('');
    const [planTier, setPlanTier] = useState<string>('FREE');
    const slug = typeof params?.slug === 'string' ? params.slug : '';

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch User Data
            // ✅ SEGURIDAD: getUser() valida criptográficamente el JWT
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Miembro';
                setUserName(name);
            }

            // 2. Fetch Org Data for Subscription Tier
            if (slug) {
                const res = await getOrganizationBySlug(slug);
                if (res.success && res.data) {
                    setPlanTier(res.data.planTier || 'FREE');
                }
            }
        };
        fetchData();
    }, [slug]);

    return (
        <header className="flex items-center justify-between px-4 py-3 bg-[#0F172A] border-b border-[#1E293B] sticky top-0 z-30 w-full shrink-0">
            {/* Left: Branding & Title */}
            <div className="flex items-center gap-3">
                <div className="text-[#f69f09]">
                    <Crown className="w-8 h-8" />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-baseline">
                    AyniPoint 
                    <span className="text-[#f69f09] text-sm uppercase tracking-widest ml-1 hidden sm:inline">B2B</span>
                    <span className="text-slate-500 font-normal hidden sm:inline ml-2 text-sm">| {title}</span>
                </h1>
            </div>

            {/* Right: Security Status & User Profile */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold flex items-center justify-end gap-1">
                        <ShieldCheck className="w-3 h-3" /> En línea
                    </p>
                    <p className="text-sm text-slate-100 font-medium tracking-tight truncate max-w-[150px]" title={userName || orgName}>
                        {userName || orgName || 'Cargando...'}
                    </p>
                </div>

                {/* Always clickable Profile Link */}
                <Link
                    href={slug ? `/b2b/${slug}/profile` : "/wallet/profile"}
                    title="Ir a mi perfil B2B"
                    className="flex size-10 items-center justify-center rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-colors hover:ring-2 hover:ring-accent/50 relative"
                >
                    <User className="w-5 h-5" />
                    {planTier === 'PRO' && (
                        <div className="absolute -top-1 -right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-indigo-950 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm border border-yellow-200 flex items-center gap-0.5 z-10 animate-fade-in-up">
                            <Crown className="w-2.5 h-2.5" strokeWidth={3} /> PRO
                        </div>
                    )}
                </Link>
            </div>
        </header>
    );
}

