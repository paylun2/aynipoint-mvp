"use client";
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Calculator, Percent, Users, Settings, Rocket, Crown, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import StoreSwitcher from '@/components/b2b/StoreSwitcher';
import { getOrganizationBySlug } from '@/app/actions/org';

export default function B2BLayout({ children, slug, orgNameProp }: { children: React.ReactNode, slug: string, orgNameProp?: string }) {
    const pathname = usePathname();
    const [orgName, setOrgName] = useState(orgNameProp || 'Cargando...');

    useEffect(() => {
        async function fetchOrg() {
            if (slug && !orgNameProp) {
                const res = await getOrganizationBySlug(slug);
                if (res.success && res.data) {
                    setOrgName(res.data.name);
                }
            }
        }
        fetchOrg();
    }, [slug, orgNameProp]);

    const links = [
        { href: `/b2b/${slug}/dashboard`, icon: LayoutDashboard, label: 'Dashboard', mobileLabel: 'Dash' },
        { href: `/b2b/${slug}/pos`, icon: Calculator, label: 'Terminal POS', mobileLabel: 'POS' },
        { href: `/b2b/${slug}/rewards`, icon: Percent, label: 'Descuentos', mobileLabel: 'Dctos' },
        { href: `/b2b/${slug}/team`, icon: Users, label: 'Equipo B2B', mobileLabel: 'Team' },
        { href: `/b2b/${slug}/marketing`, icon: Rocket, label: 'Marketing', mobileLabel: 'Promo' },
        { href: `/b2b/${slug}/audit`, icon: ShieldAlert, label: 'Auditoría', mobileLabel: 'Audit' },
        { href: `/b2b/${slug}/billing`, icon: Crown, label: 'Planes', mobileLabel: 'Plan' },
    ];

    return (
        <div className="flex h-screen bg-[#0F172A] text-slate-100 overflow-hidden w-full font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 bg-[#0F172A] border-r border-[#1E293B] text-slate-400 flex-col shrink-0 z-40">
                <div className="p-4 border-b border-[#1E293B] mb-6">
                    <StoreSwitcher currentSlug={slug} currentName={orgName} />
                </div>
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive ? 'bg-[#f69f09] text-[#0F172A] shadow-md shadow-[#f69f09]/20' : 'hover:bg-[#1E293B] hover:text-slate-200'}`}>
                                <Icon className="w-5 h-5" />
                                {link.label}
                            </Link>
                        )
                    })}
                </nav>
                <div className="p-4 mt-auto border-t border-[#1E293B]">
                    <Link href={`/b2b/${slug}/settings`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#1E293B] hover:text-slate-200 rounded-xl font-medium transition-colors">
                        <Settings className="w-5 h-5" />
                        Ajustes
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto hide-scrollbar w-full relative pb-24 md:pb-0">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-[#1E293B] px-2 pb-6 pt-2 z-40 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-around max-w-lg mx-auto gap-1">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link key={link.href} href={link.href} className="flex flex-col items-center gap-1 group w-14 sm:w-16">
                                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-[#f69f09] text-[#0F172A] shadow-md shadow-[#f69f09]/20' : 'text-slate-500 group-hover:bg-[#1E293B] group-hover:text-slate-300'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-[#f69f09]' : 'text-slate-500 group-hover:text-slate-400'}`}>{link.mobileLabel}</span>
                            </Link>
                        )
                    })}
                </div>
            </footer>
        </div>
    );
}
