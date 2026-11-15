import React from 'react';
import { motion } from 'framer-motion';

interface LoaderProps {
    fullPage?: boolean;
    text?: string;
}

// ─── Simple & Clean Transparent Grip Logo Mark ───────────────────────────────
const GripMark: React.FC<{ size?: number }> = ({ size = 64 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        className="overflow-visible"
    >
        <defs>
            <linearGradient id="ldr-grip-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <filter id="ldr-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <path
            d="M 78 68 A 35 35 0 1 1 62 22"
            stroke="url(#ldr-grip-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            filter="url(#ldr-soft-glow)"
        />
        <path
            d="M 35 65 L 48 52 L 58 62 L 92 18"
            stroke="url(#ldr-grip-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#ldr-soft-glow)"
        />
        <path
            d="M 76 18 L 92 18 L 92 34"
            stroke="url(#ldr-grip-grad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#ldr-soft-glow)"
        />
    </svg>
);

export const Loader: React.FC<LoaderProps> = ({ fullPage = false, text }) => {
    if (fullPage) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-page select-none">
                {/* Subtle soft ambient back-glow */}
                <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: 220,
                        height: 220,
                        background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)'
                    }}
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.5, 0.9, 0.5]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />

                {/* Clean, Transparent Logo Mark with gentle breathing */}
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                >
                    <GripMark size={84} />
                </motion.div>

                {/* Branded Wordmark */}
                <motion.div
                    className="mt-6 flex flex-col items-center gap-1"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1
                        className="text-[22px] font-black tracking-[0.35em] text-text-primary uppercase"
                        style={{ fontFamily: '-apple-system, "SF Pro Display", sans-serif' }}
                    >
                        GRIP
                    </h1>
                </motion.div>

                {/* Status Indicator */}
                {text && (
                    <p className="mt-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.25em] animate-pulse">
                        {text}
                    </p>
                )}
            </div>
        );
    }

    // Inline / Compact loader for page components
    return (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
            <motion.div
                animate={{
                    scale: [1, 1.08, 1],
                    opacity: [0.8, 1, 0.8]
                }}
                transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            >
                <GripMark size={38} />
            </motion.div>
            {text && (
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
};
