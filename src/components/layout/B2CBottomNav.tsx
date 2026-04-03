import Link from "next/link";

interface B2CBottomNavProps {
    activeTab: 'wallet' | 'explorar' | 'passport' | 'profile';
}

export default function B2CBottomNav({ activeTab }: B2CBottomNavProps) {
    const tabs = [
        {
            key: 'wallet' as const,
            href: '/wallet',
            label: 'Wallet',
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
                    {active ? (
                        <path d="M2 6C2 4.34 3.34 3 5 3H19C20.66 3 22 4.34 22 6V18C22 19.66 20.66 21 19 21H5C3.34 21 2 19.66 2 18V6ZM16 12.5C16 11.67 16.67 11 17.5 11C18.33 11 19 11.67 19 12.5C19 13.33 18.33 14 17.5 14C16.67 14 16 13.33 16 12.5Z" />
                    ) : (
                        <>
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="M3 10H21" />
                            <circle cx="17.5" cy="14.5" r="1.5" />
                        </>
                    )}
                </svg>
            ),
        },
        {
            key: 'explorar' as const,
            href: '/explorar',
            label: 'Explorar',
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
                    {active ? (
                        <path d="M3 3H10V10H3V3ZM14 3H21V10H14V3ZM3 14H10V21H3V14ZM14 14H21V21H14V14Z" />
                    ) : (
                        <>
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                        </>
                    )}
                </svg>
            ),
        },
        {
            key: 'passport' as const,
            href: '/passport',
            label: 'Passport',
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
                    {active ? (
                        <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h6v3h-6v-3zM14 14h3v3h-3v-3zM6 6v2h2V6H6zm10 0v2h2V6h-2zM6 16v2h2v-2H6z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10V3h7v7H3zm11-7h7v7h-7V3zm-11 11h7v7H3v-7zm15 0h-3v3h3v-3zm-3 4h3v3h-3v-3zM14 14h-3v3h3v-3z" />
                    )}
                </svg>
            ),
        },
        {
            key: 'profile' as const,
            href: '/profile',
            label: 'Perfil',
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
                    {active ? (
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
                    ) : (
                        <>
                            <circle cx="12" cy="8" r="4" />
                            <path d="M20 21C20 17.13 16.42 14 12 14C7.58 14 4 17.13 4 21" strokeLinecap="round" />
                        </>
                    )}
                </svg>
            ),
        },
    ];

    return (
        <nav className="fixed bottom-0 w-full bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/5 z-40 pb-6 pt-2 px-2">
            <div className="flex justify-around items-center max-w-lg mx-auto">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.key;
                    return (
                        <Link
                            key={tab.key}
                            href={tab.href}
                            className={`flex flex-col items-center gap-1 transition-colors py-1 px-3 rounded-xl ${
                                isActive
                                    ? 'text-orange-500' 
                                    : 'text-white/40 hover:text-white/60'
                            }`}
                        >
                            {tab.icon(isActive)}
                            <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-orange-500' : ''}`}>
                                {tab.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
