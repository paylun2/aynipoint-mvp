import React from 'react';

/**
 * Premium SVG watermark illustrations for each business category.
 * These are custom, multi-element compositions designed to look professional
 * as large semi-transparent background decorations on store cards.
 * 
 * All icons are pure inline SVG — no external images, no network requests,
 * instant rendering, infinitely scalable.
 */

const iconBaseClass = "absolute -top-2 right-2 opacity-20 text-white pointer-events-none";

// ─── Barbershop: Scissors + comb composition ──────────────────
export const BarberIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Scissors */}
        <circle cx="30" cy="28" r="12" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="30" cy="72" r="12" stroke="currentColor" strokeWidth="3" fill="none" />
        <line x1="40" y1="32" x2="65" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="40" y1="68" x2="65" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        {/* Comb */}
        <rect x="72" y="20" width="8" height="60" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <line x1="72" y1="30" x2="65" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="72" y1="38" x2="65" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="72" y1="46" x2="65" y2="46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="72" y1="54" x2="65" y2="54" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="72" y1="62" x2="65" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="72" y1="70" x2="65" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// ─── Café: Coffee cup with steam ─────────────────────────────
export const CafeIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Steam lines */}
        <path d="M30 28 C30 22, 36 22, 36 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M44 24 C44 18, 50 18, 50 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M58 28 C58 22, 64 22, 64 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Cup body */}
        <path d="M18 36 L18 72 C18 80, 26 86, 44 86 C62 86, 70 80, 70 72 L70 36 Z" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Handle */}
        <path d="M70 44 C82 44, 86 52, 86 58 C86 64, 82 70, 70 70" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Saucer */}
        <ellipse cx="44" cy="90" rx="32" ry="5" stroke="currentColor" strokeWidth="2.5" fill="none" />
    </svg>
);

// ─── Retail / Tienda: Shopping bag with tag ───────────────────
export const RetailIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Bag body */}
        <path d="M20 35 L16 88 C16 92, 20 95, 24 95 L76 95 C80 95, 84 92, 84 88 L80 35 Z" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Handles */}
        <path d="M35 35 L35 22 C35 14, 42 8, 50 8 C58 8, 65 14, 65 22 L65 35" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Price tag */}
        <rect x="40" y="52" width="20" height="28" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="50" cy="60" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="44" y1="68" x2="56" y2="68" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="44" y1="73" x2="52" y2="73" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

// ─── Services: Briefcase with gear ────────────────────────────
export const ServicesIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Briefcase body */}
        <rect x="12" y="35" width="76" height="52" rx="6" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Handle */}
        <path d="M35 35 L35 24 C35 18, 40 14, 46 14 L54 14 C60 14, 65 18, 65 24 L65 35" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Middle clasp */}
        <line x1="12" y1="58" x2="88" y2="58" stroke="currentColor" strokeWidth="2" />
        {/* Small gear */}
        <circle cx="50" cy="58" r="8" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="50" cy="58" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
        {/* Gear teeth */}
        <line x1="50" y1="48" x2="50" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="66" x2="50" y2="68" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="58" x2="42" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="58" y1="58" x2="60" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

// ─── Fitness: Dumbbell with cross accents ─────────────────────
export const FitnessIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Dumbbell bar */}
        <line x1="25" y1="50" x2="75" y2="50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        {/* Left weight */}
        <rect x="14" y="32" width="14" height="36" rx="4" stroke="currentColor" strokeWidth="3" fill="none" />
        <rect x="8" y="38" width="10" height="24" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none" />
        {/* Right weight */}
        <rect x="72" y="32" width="14" height="36" rx="4" stroke="currentColor" strokeWidth="3" fill="none" />
        <rect x="82" y="38" width="10" height="24" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none" />
        {/* Decorative crosses */}
        <line x1="46" y1="18" x2="54" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="14" x2="50" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="34" y1="78" x2="40" y2="78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="37" y1="75" x2="37" y2="81" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="62" y1="76" x2="68" y2="76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="65" y1="73" x2="65" y2="79" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// ─── Restaurant: Fork and knife composition ───────────────────
export const RestaurantIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Fork */}
        <line x1="28" y1="10" x2="28" y2="90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="10" x2="20" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="28" y1="10" x2="28" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="36" y1="10" x2="36" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18 38 C18 46, 22 50, 28 50 C34 50, 38 46, 38 38" stroke="currentColor" strokeWidth="2.5" fill="none" />
        {/* Knife */}
        <path d="M64 10 L64 42 C64 42, 76 36, 76 22 L76 10 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        <line x1="64" y1="42" x2="64" y2="90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        {/* Decorative plate arc */}
        <path d="M10 92 C10 92, 50 84, 90 92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
);

// ─── Bakery: Croissant / bread ────────────────────────────────
export const BakeryIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Croissant shape */}
        <path d="M15 60 C10 48, 18 30, 35 25 C42 23, 50 28, 50 35 C50 28, 58 23, 65 25 C82 30, 90 48, 85 60" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M15 60 C25 72, 40 78, 50 78 C60 78, 75 72, 85 60" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Bread lines */}
        <path d="M30 45 C35 40, 45 38, 50 42" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M50 42 C55 38, 65 40, 70 45" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Wheat */}
        <line x1="50" y1="82" x2="50" y2="96" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M44 86 C47 84, 50 86, 50 86" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M56 86 C53 84, 50 86, 50 86" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M44 90 C47 88, 50 90, 50 90" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M56 90 C53 88, 50 90, 50 90" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
);

// ─── Grocery: Cart ────────────────────────────────────────────
export const GroceryIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Cart body */}
        <path d="M20 25 L28 25 L40 70 L82 70 L90 38 L34 38" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Wheels */}
        <circle cx="48" cy="82" r="6" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="74" cy="82" r="6" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Items in cart */}
        <rect x="44" y="48" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="60" y="44" width="14" height="22" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
);

// ─── Clinic / Health ──────────────────────────────────────────
export const ClinicIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Stethoscope tube */}
        <path d="M30 15 L30 45 C30 62, 44 72, 58 72 L58 60" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M50 15 L50 45 C50 55, 55 60, 58 60" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Earpieces */}
        <circle cx="30" cy="12" r="4" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="50" cy="12" r="4" stroke="currentColor" strokeWidth="2.5" fill="none" />
        {/* Chest piece */}
        <circle cx="58" cy="75" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="58" cy="75" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
        {/* Cross */}
        <line x1="22" y1="85" x2="38" y2="85" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1="77" x2="30" y2="93" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

// ─── Pet: Paw print ───────────────────────────────────────────
export const PetIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main pad */}
        <ellipse cx="50" cy="62" rx="18" ry="16" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Toe pads */}
        <ellipse cx="30" cy="36" rx="9" ry="11" stroke="currentColor" strokeWidth="2.5" fill="none" transform="rotate(-15 30 36)" />
        <ellipse cx="46" cy="28" rx="8" ry="10" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <ellipse cx="62" cy="30" rx="8" ry="10" stroke="currentColor" strokeWidth="2.5" fill="none" transform="rotate(10 62 30)" />
        <ellipse cx="74" cy="42" rx="8" ry="10" stroke="currentColor" strokeWidth="2.5" fill="none" transform="rotate(20 74 42)" />
        {/* Heart */}
        <path d="M46 82 C43 78, 38 78, 38 82 C38 86, 46 92, 46 92 C46 92, 54 86, 54 82 C54 78, 49 78, 46 82 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
);

// ─── Pharmacy: Mortar with Rx ─────────────────────────────────
export const PharmacyIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Mortar */}
        <path d="M22 45 L22 72 C22 82, 34 90, 50 90 C66 90, 78 82, 78 72 L78 45" stroke="currentColor" strokeWidth="3" fill="none" />
        <ellipse cx="50" cy="45" rx="30" ry="8" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Pestle */}
        <line x1="65" y1="15" x2="42" y2="40" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <circle cx="68" cy="12" r="5" stroke="currentColor" strokeWidth="2.5" fill="none" />
        {/* Rx symbol */}
        <text x="38" y="75" fill="currentColor" fontSize="22" fontWeight="900" fontFamily="serif" opacity="0.5">Rx</text>
    </svg>
);

// ─── Default: Storefront ──────────────────────────────────────
export const DefaultStoreIcon = () => (
    <svg className={iconBaseClass} width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Building */}
        <rect x="18" y="38" width="64" height="54" rx="3" stroke="currentColor" strokeWidth="3" fill="none" />
        {/* Roof / awning */}
        <path d="M12 38 L50 12 L88 38" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Door */}
        <rect x="40" y="62" width="20" height="30" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="56" cy="78" r="2" stroke="currentColor" strokeWidth="2" fill="none" />
        {/* Window */}
        <rect x="26" y="48" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="33" y1="48" x2="33" y2="60" stroke="currentColor" strokeWidth="1.5" />
        <line x1="26" y1="54" x2="40" y2="54" stroke="currentColor" strokeWidth="1.5" />
        {/* Window right */}
        <rect x="64" y="48" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="71" y1="48" x2="71" y2="60" stroke="currentColor" strokeWidth="1.5" />
        <line x1="64" y1="54" x2="78" y2="54" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);
