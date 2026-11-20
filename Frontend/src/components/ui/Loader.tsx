import React from 'react';
import { motion } from 'framer-motion';

interface LoaderProps {
    fullPage?: boolean;
    text?: string;
}

// ─── 2D Geometric Fist "G" Mark (Light Theme Greenish Accent) ────────────────
export const GripFistMark: React.FC<{ size?: number }> = ({ size = 64 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        className="overflow-visible select-none"
    >
        <defs>
            <linearGradient id="ldr-brand-grad" x1="15%" y1="10%" x2="85%" y2="90%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="35%" stopColor="#059669" />
                <stop offset="70%" stopColor="#0e7490" />
                <stop offset="100%" stopColor="#0e4d66" />
            </linearGradient>

            <filter id="ldr-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        <g transform="translate(-75.4, -10.2) scale(1.26)" filter="url(#ldr-glow)" fillRule="evenodd">
            {/* Piece 1: Finger 1 (Top Chevron) */}
            <path
                d="M 315.0 42.0 L 382.0 68.5 L 382.0 122.0 L 348.0 142.0 L 348.0 92.0 L 280.0 62.0 Z"
                fill="url(#ldr-brand-grad)"
            />

            {/* Piece 2: Finger 2 (Upper-Middle Chevron) */}
            <path
                d="M 267.0 69.7 L 334.0 96.2 L 334.0 149.7 L 300.0 169.7 L 300.0 119.7 L 232.0 89.7 Z"
                fill="url(#ldr-brand-grad)"
            />

            {/* Piece 3: Finger 3 (Lower-Middle Chevron) */}
            <path
                d="M 219.0 97.4 L 286.0 123.9 L 286.0 177.4 L 252.0 197.4 L 252.0 147.4 L 184.0 117.4 Z"
                fill="url(#ldr-brand-grad)"
            />

            {/* Piece 4: Finger 4 & Palm Base (G Foundation with closer thumb & fingers) */}
            <path
                d="M 142.0 142.0 L 171.0 125.1 L 238.0 151.6 L 238.0 205.1 L 204.0 225.1 L 204.0 178.0 L 182.0 169.0 L 182.0 313.15 C 182.0 323.0 188.0 327.88 198.75 327.88 L 313.45 327.88 C 324.0 327.88 330.5 323.0 330.5 313.15 L 330.5 253.24 L 235.0 253.24 L 235.0 225.24 L 378.55 142.36 L 383.98 144.86 L 383.98 313.15 C 383.98 358.0 358.0 380.57 321.2 380.57 L 195.0 380.57 C 160.0 380.57 142.0 355.0 142.0 313.15 Z"
                fill="url(#ldr-brand-grad)"
            />
        </g>
    </svg>
);

export const Loader: React.FC<LoaderProps> = ({ fullPage = false, text }) => {
    if (fullPage) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-page select-none">
                {/* Soft ambient back-glow in mint / petrol green */}
                <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: 240,
                        height: 240,
                        background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)'
                    }}
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.5, 0.85, 0.5]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />

                {/* Fist "G" with breathing motion */}
                <motion.div
                    animate={{
                        scale: [1, 1.04, 1],
                        y: [0, -3, 0]
                    }}
                    transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                >
                    <GripFistMark size={96} />
                </motion.div>

                {/* Branded Wordmark */}
                <motion.div
                    className="mt-6 flex flex-col items-center gap-1"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1
                        className="text-[22px] font-black tracking-[0.38em] text-text-primary uppercase"
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
                    opacity: [0.85, 1, 0.85]
                }}
                transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            >
                <GripFistMark size={40} />
            </motion.div>
            {text && (
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
};
