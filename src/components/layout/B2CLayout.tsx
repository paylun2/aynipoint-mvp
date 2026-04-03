import { ReactNode } from "react";
import B2CBottomNav from "./B2CBottomNav";

interface B2CLayoutProps {
    children: ReactNode;
    activeTab: 'wallet' | 'explorar' | 'passport' | 'profile';
    className?: string;
}

export default function B2CLayout({ children, activeTab, className }: B2CLayoutProps) {
    // If className is provided, the caller has full control over the background.
    // Otherwise, default to the standard light theme.
    const defaultClasses = "bg-[#0a0a0a] text-white";
    const layoutClasses = className !== undefined ? className : defaultClasses;

    return (
        <div className={`flex flex-col min-h-screen ${layoutClasses}`}>
            
            {/* Main Content Wrapper - Adds safe padding at the bottom so content isn't hidden by nav */}
            <main className="flex-1 pb-24 relative overflow-x-hidden">
                {children}
            </main>

            {/* Shared Bottom Navigation */}
            <B2CBottomNav activeTab={activeTab} />
        </div>
    );
}
