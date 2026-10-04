import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { haptics } from '../../lib/haptics';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    height?: string;
    noPadding?: boolean;
}

/**
 * Apple-grade Fluid Bottom Sheet:
 * - 1:1 Direct Manipulation touch tracking
 * - Momentum projection (Apple WWDC Designing Fluid Interfaces exponential decay)
 * - Velocity handoff with directional sign check
 * - Rubber-band boundary elasticity
 * - Spring physics: damping ~0.8, response ~0.3s
 * - Tactile audio-haptic feedback
 */
export const Drawer: React.FC<DrawerProps> = ({
    isOpen,
    onClose,
    title,
    children,
    height = 'h-[75vh]',
    noPadding = false
}) => {
    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Keyboard dismiss (Escape)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                haptics.selection();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Apple momentum projection formula from WWDC "Designing Fluid Interfaces"
    const project = useCallback((initialVelocity: number, decelerationRate = 0.998) => {
        return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
    }, []);

    // Gesture dismiss handler with velocity handoff & projection
    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offsetY = info.offset.y;
        const velocityY = info.velocity.y;
        const projectedY = offsetY + project(velocityY);

        // Sign check: if flicking upwards with high velocity, snap back open even if offset is positive
        if (velocityY < -350) {
            haptics.selection();
            return;
        }

        // Dismiss if flicked down, dragged past 140px, or projected resting point crosses threshold
        const isFlickDown = velocityY > 550;
        const isDraggedPastThreshold = offsetY > 140;
        const isProjectedDismiss = projectedY > 220;

        if (isFlickDown || isDraggedPastThreshold || isProjectedDismiss) {
            haptics.impact('light');
            onClose();
        } else {
            // Snapped back home
            haptics.selection();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    {/* Backdrop with progressive blur & dimming */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="absolute inset-0 bg-overlay backdrop-blur-md"
                        onClick={() => {
                            haptics.selection();
                            onClose();
                        }}
                    />

                    {/* Drawer Surface - Apple Spring Physics (damping 0.8, response 0.3s) */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{
                            type: 'spring',
                            damping: 28,
                            stiffness: 340,
                            mass: 0.85
                        }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0.16, bottom: 0.85 }}
                        onDragEnd={handleDragEnd}
                        className={`
                            relative w-full md:max-w-xl glass-drawer rounded-t-[32px] shadow-2xl
                            ${height} flex flex-col overflow-hidden bottom-0 touch-none select-none
                        `}
                    >
                        {/* Apple-style Grabber Pill */}
                        <div
                            className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                            onClick={() => {
                                haptics.selection();
                                onClose();
                            }}
                        >
                            <div className="w-10 h-1.5 bg-border-strong rounded-full transition-colors active:scale-95" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-subtle shrink-0">
                            <h3 className="text-xl font-semibold text-text-primary heading-apple">{title}</h3>
                            <button
                                onClick={() => {
                                    haptics.selection();
                                    onClose();
                                }}
                                className="p-2 rounded-full hover:bg-surface-hover active:scale-90 text-text-muted hover:text-text-primary transition-all touch-manipulation"
                                aria-label="Close dialog"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className={`flex-1 flex flex-col min-h-0 select-text ${noPadding ? '' : 'p-6 pb-40 overflow-y-auto custom-scrollbar'}`}>
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
