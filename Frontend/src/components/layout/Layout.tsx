import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { OfflineGame } from '../ui/OfflineGame';
import { Smartphone, X } from 'lucide-react';

export const Layout: React.FC = () => {
    const location = useLocation();
    const [showDesktopWarning, setShowDesktopWarning] = useState(true);
    const [isOnline, setIsOnline] = useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const isEntryPage = location.pathname === '/add' ||
        location.pathname.startsWith('/transactions/') ||
        location.pathname === '/settings/categories' ||
        location.pathname === '/tags';

    return (
        <div className="min-h-screen text-primary flex flex-col">
            <OfflineGame />
            {!isEntryPage && isOnline && <Sidebar />}

            <main className={`min-h-screen transition-all duration-300 flex-1 flex flex-col ${!isEntryPage && isOnline ? 'md:pl-72' : 'pb-0'}`}>
                {showDesktopWarning && !isEntryPage && isOnline && (
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

                <div className={`container mx-auto max-w-7xl flex-1 ${!isEntryPage ? 'animate-enter px-0 md:px-12 md:py-8' : 'p-0'}`}>
                    <Outlet />
                </div>

                {!isEntryPage && isOnline && <Footer />}
            </main>

            {!isEntryPage && isOnline && <Navbar />}
        </div>
    );
};
