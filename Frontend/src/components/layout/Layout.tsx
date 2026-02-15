import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useGmailStatus, useManualSync } from '../../features/sync/hooks';
import { Smartphone, X } from 'lucide-react';

export const Layout: React.FC = () => {
    const location = useLocation();
    const [showDesktopWarning, setShowDesktopWarning] = useState(true);
    const isEntryPage = location.pathname === '/add' ||
        location.pathname.startsWith('/transactions/') ||
        location.pathname === '/settings/categories' ||
        location.pathname === '/tags';

    // Auto-Sync Logic
    const { data: status } = useGmailStatus();
    const { mutate: sync } = useManualSync();
    const hasSynced = useRef(false);

    useEffect(() => {
        if (status?.connected && !hasSynced.current) {
            console.log("Auto-syncing Gmail transactions...");
            sync();
            hasSynced.current = true;
        }
    }, [status?.connected, sync]);

    return (
        <div className="min-h-screen text-white selection:bg-cyan-500/30">
            {!isEntryPage && <Sidebar />}

            <main className={`min-h-screen transition-all duration-300 ${!isEntryPage ? 'md:pl-72 pb-32 md:pb-12' : 'pb-0'}`}>
                {showDesktopWarning && !isEntryPage && (
                    <div className="hidden md:flex items-center justify-between bg-indigo-500/10 border-b border-indigo-500/10 px-8 py-3 text-xs font-medium text-indigo-300/80 backdrop-blur-sm sticky top-0 z-40">
                        <span className="flex items-center gap-2 tracking-wide">
                            <Smartphone size={14} className="text-indigo-400" />
                            MOBILE FIRST DESIGN — EXPERIENCE OPTIMIZED FOR SMALLER SCREENS
                        </span>
                        <button
                            onClick={() => setShowDesktopWarning(false)}
                            className="hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors"
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
