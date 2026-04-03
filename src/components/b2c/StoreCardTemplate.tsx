import React from 'react';
import {
    BarberIcon, CafeIcon, RetailIcon, ServicesIcon, FitnessIcon,
    RestaurantIcon, BakeryIcon, GroceryIcon, ClinicIcon, PetIcon,
    PharmacyIcon, DefaultStoreIcon
} from './CategoryIcons';

/**
 * These match the EXACT values stored in the `organizations.category` column
 * as defined in the B2B Settings page select dropdown.
 * 
 * Current DB values:
 *   RETAIL, BARBERSHOP, CAFE, SERVICES, FITNESS
 * 
 * We also support future/extended categories for scalability.
 */
export type StoreCategory = 
    | 'RETAIL' | 'BARBERSHOP' | 'CAFE' | 'SERVICES' | 'FITNESS'
    | 'RESTAURANT' | 'BAKERY' | 'GROCERY' | 'CLINIC' | 'PET' | 'PHARMACY'
    | 'OTHER';

interface StoreCardTemplateProps {
    storeName: string;
    category: StoreCategory;
    points: number;
    logoUrl?: string | null;
    brandColor?: string | null;
    hidePoints?: boolean;
    pointsLabel?: string;
    actionLabel?: string;
    children?: React.ReactNode;
    onActionClick: () => void;
    onCardClick: () => void;
}

/**
 * Each entry maps a DB category to:
 *   bgClass  – Tailwind gradient for the card background
 *   icon     – A premium custom SVG watermark illustration
 *   label    – Human-readable label shown under the store name (in Spanish)
 */
const CATEGORY_STYLES: Record<string, {
    bgClass: string;
    icon: React.ReactNode;
    label: string;
}> = {
    // ─── Current DB Categories ───────────────────────────────
    'BARBERSHOP': {
        bgClass: 'from-[#7F1D1D] to-[#450A0A]',
        icon: <BarberIcon />,
        label: 'Barbería',
    },
    'CAFE': {
        bgClass: 'from-[#064E3B] to-[#022C22]',
        icon: <CafeIcon />,
        label: 'Cafetería',
    },
    'RETAIL': {
        bgClass: 'from-[#1E3A8A] to-[#172554]',
        icon: <RetailIcon />,
        label: 'Tienda',
    },
    'SERVICES': {
        bgClass: 'from-[#334155] to-[#1E293B]',
        icon: <ServicesIcon />,
        label: 'Servicios',
    },
    'FITNESS': {
        bgClass: 'from-[#4C1D95] to-[#2E1065]',
        icon: <FitnessIcon />,
        label: 'Gimnasio',
    },

    // ─── Extended Categories (future-proof) ──────────────────
    'RESTAURANT': {
        bgClass: 'from-[#064E3B] to-[#022C22]',
        icon: <RestaurantIcon />,
        label: 'Restaurante',
    },
    'BAKERY': {
        bgClass: 'from-[#78350F] to-[#451A03]',
        icon: <BakeryIcon />,
        label: 'Panadería',
    },
    'GROCERY': {
        bgClass: 'from-[#14532D] to-[#052E16]',
        icon: <GroceryIcon />,
        label: 'Minimarket',
    },
    'CLINIC': {
        bgClass: 'from-[#1E3A8A] to-[#172554]',
        icon: <ClinicIcon />,
        label: 'Salud',
    },
    'PET': {
        bgClass: 'from-[#78350F] to-[#451A03]',
        icon: <PetIcon />,
        label: 'Mascotas',
    },
    'PHARMACY': {
        bgClass: 'from-[#064E3B] to-[#022C22]',
        icon: <PharmacyIcon />,
        label: 'Farmacia',
    },

    // ─── Default ─────────────────────────────────────────────
    'OTHER': {
        bgClass: 'from-[#334155] to-[#0F172A]',
        icon: <DefaultStoreIcon />,
        label: 'Negocio Local',
    },
};

export default function StoreCardTemplate({
    storeName,
    category,
    points,
    logoUrl,
    brandColor,
    hidePoints = false,
    pointsLabel = "Puntos Disponibles",
    actionLabel = "Canjear",
    children,
    onActionClick,
    onCardClick
}: StoreCardTemplateProps) {
    
    // Normalize category to exist in styles map
    const mappedCategory = CATEGORY_STYLES[category] ? category : 'OTHER';
    const styleData = CATEGORY_STYLES[mappedCategory];
    
    // Fallback initials if no logo
    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div 
            onClick={onCardClick}
            className={`relative rounded-2xl p-5 shadow-lg overflow-hidden cursor-pointer group min-h-[160px] flex flex-col justify-between bg-gradient-to-br ${styleData.bgClass} transition-all duration-200 hover:shadow-xl active:scale-[0.98]`}
        >
            {/* Background Icon Watermark — upper-right, partially clipped (Stitch style) */}
            {styleData.icon}

            {/* Top Row: Logo + Name + Menu (Stitch layout) */}
            <div className="flex justify-between items-start z-10 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white p-2 shadow-sm flex items-center justify-center shrink-0">
                        {logoUrl ? (
                            <img src={logoUrl} alt={storeName} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                            <span className="text-gray-800 font-black text-sm">{getInitials(storeName)}</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-white text-lg font-bold leading-tight truncate">{storeName}</h3>
                        <p className="text-white/50 text-xs font-medium">{styleData.label}</p>
                    </div>
                </div>
                <button 
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors shrink-0"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                    </svg>
                </button>
            </div>

            {/* Custom Content (e.g. Explorar progress bars) */}
            {children && (
                <div className="z-10 mt-4">
                    {children}
                </div>
            )}

            {/* Bottom Row: Points + Redeem (Stitch layout) */}
            <div className="z-10 mt-6 flex justify-between items-end">
                <div>
                    {!hidePoints ? (
                        <>
                            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">{pointsLabel}</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-white">{points.toLocaleString()}</span>
                                <span className="text-sm text-orange-400 font-bold">pts</span>
                            </div>
                        </>
                    ) : (
                        <div className="py-2">
                            <p className="text-white/80 text-sm font-medium">{pointsLabel}</p>
                        </div>
                    )}
                </div>
                
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onActionClick();
                    }}
                    className="px-4 py-2 bg-orange-500/20 text-orange-400 font-medium text-sm rounded-lg hover:bg-orange-500/30 transition-colors border border-orange-500/30"
                >
                    {actionLabel}
                </button>
            </div>
        </div>
    );
}
