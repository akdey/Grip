import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useGmailStatus, useManualSync } from '../../features/sync/hooks';

export const Layout: React.FC = () => {
    const location = useLocation();
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
                <div className={`container mx-auto max-w-7xl ${!isEntryPage ? 'animate-enter px-0 md:px-12 md:py-12 pb-24' : 'p-0'}`}>
                    <Outlet />
                </div>
            </main>

            {!isEntryPage && <Navbar />}
        </div>
    );
};
