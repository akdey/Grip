import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Smartphone, X } from 'lucide-react';

export const Layout: React.FC = () => {
    const location = useLocation();
    const [showDesktopWarning, setShowDesktopWarning] = useState(true);
    const isEntryPage = location.pathname === '/add' ||
        location.pathname.startsWith('/transactions/') ||
        location.pathname === '/settings/categories' ||
        location.pathname === '/tags';

    return (
        <div className="min-h-screen text-primary">
            {!isEntryPage && <Sidebar />}

            <main className={`min-h-screen transition-all duration-300 ${!isEntryPage ? 'md:pl-72 pb-32 md:pb-12' : 'pb-0'}`}>
                {showDesktopWarning && !isEntryPage && (
                    <div className="hidden md:flex items-center justify-between bg-surface-subtle border-b border-border-subtle px-8 py-3 text-xs font-medium text-text-secondary backdrop-blur-md sticky top-0 z-40">
                        <span className="flex items-center gap-2 tracking-wide">
                            <Smartphone size={14} className="text-accent-text" />
                            MOBILE FIRST DESIGN — EXPERIENCE OPTIMIZED FOR SMALLER SCREENS
                        </span>
                        <button
                            onClick={() => setShowDesktopWarning(false)}
                            className="hover:text-primary hover:bg-surface-hover p-1 rounded-full transition-colors text-text-muted"
                            aria-label="Close warning"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                <div className={`container mx-auto max-w-7xl ${!isEntryPage ? 'animate-enter px-0 md:px-12 md:py-8 pb-24' : 'p-0'}`}>
                    <Outlet />
                </div>
            </main>

            {!isEntryPage && <Navbar />}
        </div>
    );
};
