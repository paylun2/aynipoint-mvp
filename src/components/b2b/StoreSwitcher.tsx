"use client"

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Store, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import { getUserOrganizations } from '@/app/actions/getUserOrganizations';
import { useRouter } from 'next/navigation';

export default function StoreSwitcher({ currentSlug, currentName }: { currentSlug: string, currentName: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [orgs, setOrgs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        // Close dropdown when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchDropdownData = async () => {
        if (orgs.length > 0) return; // Prevent over-fetching
        setIsLoading(true);
        const res = await getUserOrganizations();
        if (res.success) {
            setOrgs(res.data || []);
        }
        setIsLoading(false);
    };

    const handleToggle = () => {
        if (!isOpen) fetchDropdownData();
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={handleToggle}
                className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 pr-3 rounded-lg transition-colors group"
            >
                <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center border border-accent/20">
                    <Store className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left hidden sm:block max-w-[150px]">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-none">
                        {currentName || 'Cargando...'}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                        Cambiar Negocio
                    </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#0F172A] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 overflow-hidden">
                    <div className="px-3 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tus Negocios</p>
                    </div>

                    <div className="max-h-[250px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-sm text-slate-500">Cargando...</div>
                        ) : orgs.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">No tienes otros negocios.</div>
                        ) : (
                            orgs.map((org) => (
                                <button
                                    key={org.id}
                                    onClick={() => {
                                        setIsOpen(false);
                                        router.push(`/b2b/${org.slug}/dashboard`);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between group transition-colors"
                                >
                                    <div className="flex flex-col overflow-hidden pr-2">
                                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                            {org.name}
                                        </span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-slate-500 truncate">@{org.slug}</span>
                                            {org.role === 'OWNER' && (
                                                <span className="bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">Dueño</span>
                                            )}
                                        </div>
                                    </div>
                                    {org.slug === currentSlug && <Check className="w-4 h-4 text-accent shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>

                    <div className="px-3 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                        <Link
                            href="/b2b/onboarding"
                            onClick={() => setIsOpen(false)}
                            className="w-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg p-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Crear Nuevo Negocio
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
