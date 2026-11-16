import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            const timer = setTimeout(() => {
                setShowReconnected(false);
            }, 3000);
            return () => clearTimeout(timer);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
                >
                    <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-status-danger-bg/95 border border-status-danger-border text-status-danger-text text-xs font-semibold shadow-lg backdrop-blur-md">
                        <WifiOff size={14} className="shrink-0 animate-pulse" />
                        <span>No Internet Connection • Offline Mode</span>
                    </div>
                </motion.div>
            )}

            {isOnline && showReconnected && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
                >
                    <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-status-success-bg/95 border border-status-success-border text-status-success-text text-xs font-semibold shadow-lg backdrop-blur-md">
                        <Wifi size={14} className="shrink-0" />
                        <span>Back Online</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
