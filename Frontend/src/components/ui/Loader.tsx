import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoaderProps {
    fullPage?: boolean;
    text?: string;
}

// ─── 3D CLASP "G" EMBLEM (Vector Component) ──────────────────────────────────
export const GripClaspMark: React.FC<{ size?: number; pulse?: boolean }> = ({ size = 120, pulse = true }) => {
    return (
        <div style={{ width: size, height: size }} className="relative flex items-center justify-center select-none">
            <svg
                width={size}
                height={size}
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="overflow-visible"
            >
                <defs>
                    <radialGradient id="ldr-ambient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.32" />
                        <stop offset="55%" stopColor="#0284c7" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#020406" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="ldr-metal" x1="140" y1="120" x2="380" y2="400" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#475569" />
                        <stop offset="25%" stopColor="#334155" />
                        <stop offset="65%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>

                    <linearGradient id="ldr-depth" x1="0" y1="0" x2="0" y2="100%">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="100%" stopColor="#050811" />
                    </linearGradient>

                    <linearGradient id="ldr-bevel" x1="120" y1="120" x2="400" y2="400" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
                        <stop offset="30%" stopColor="#bfe5f7" stopOpacity="0.4" />
                        <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
                    </linearGradient>

                    <linearGradient id="ldr-beam" x1="160" y1="360" x2="400" y2="120" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#0369a1" />
                        <stop offset="35%" stopColor="#0284c7" />
                        <stop offset="65%" stopColor="#06b6d4" />
                        <stop offset="90%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#f0f9ff" />
                    </linearGradient>

                    <filter id="ldr-glow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4" result="b1" />
                        <feGaussianBlur stdDeviation="12" result="b2" />
                        <feMerge>
                            <feMergeNode in="b2" />
                            <feMergeNode in="b1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="ldr-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#000000" floodOpacity="0.8" />
                    </filter>
                </defs>

                {/* Ambient Core Aura */}
                <circle cx="256" cy="256" r="190" fill="url(#ldr-ambient)" />

                {/* Instrument Alignment Rings */}
                <circle cx="256" cy="256" r="176" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 8" opacity="0.35" />
                <circle cx="256" cy="256" r="126" stroke="#0e7490" strokeWidth="1" strokeDasharray="2 6" opacity="0.25" />

                {/* ── Trajectory Being Gripped ── */}
                <g filter="url(#ldr-shadow)">
                    {/* Diffuse Energy Glow */}
                    <path
                        d="M 180 344 L 226 298 L 268 326 L 372 168"
                        stroke="#0284c7"
                        strokeWidth="32"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.25"
                        filter="url(#ldr-glow)"
                    />
                    {/* Solid Neon Trajectory */}
                    <path
                        d="M 180 344 L 226 298 L 268 326 L 372 168"
                        stroke="url(#ldr-beam)"
                        strokeWidth="20"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Hot White Centerline */}
                    <path
                        d="M 180 344 L 226 298 L 268 326 L 366 174"
                        stroke="#ffffff"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                    />
                    {/* Arrow Head */}
                    <g filter="url(#ldr-glow)">
                        <polygon
                            points="328,154 394,142 382,208 360,192 344,208 328,192 344,176"
                            fill="url(#ldr-beam)"
                        />
                        <polygon
                            points="346,164 384,152 376,190 364,180"
                            fill="#ffffff"
                            opacity="0.9"
                        />
                    </g>
                </g>

                {/* ── 3D Extrusion Depth (10px drop) ── */}
                <g transform="translate(0, 10)" opacity="0.75">
                    <path
                        d="
                            M 335 155
                            C 290 110, 205 110, 160 160
                            C 115 210, 115 302, 160 352
                            C 205 402, 290 402, 335 362
                            L 335 265
                            L 255 265
                            L 255 305
                            L 295 305
                            L 295 332
                            C 265 362, 215 362, 185 328
                            C 155 294, 155 224, 185 190
                            C 215 156, 265 156, 300 186
                            Z
                        "
                        fill="url(#ldr-depth)"
                    />
                </g>

                {/* ── 3D Clasp Main Face ── */}
                <g filter="url(#ldr-shadow)">
                    <path
                        d="
                            M 335 155
                            C 290 110, 205 110, 160 160
                            C 115 210, 115 302, 160 352
                            C 205 402, 290 402, 335 362
                            L 335 265
                            L 255 265
                            L 255 305
                            L 295 305
                            L 295 332
                            C 265 362, 215 362, 185 328
                            C 155 294, 155 224, 185 190
                            C 215 156, 265 156, 300 186
                            Z
                        "
                        fill="url(#ldr-metal)"
                    />
                    {/* Chamfer Bevel Stroke */}
                    <path
                        d="
                            M 335 155
                            C 290 110, 205 110, 160 160
                            C 115 210, 115 302, 160 352
                            C 205 402, 290 402, 335 362
                            L 335 265
                            L 255 265
                            L 255 305
                            L 295 305
                            L 295 332
                            C 265 362, 215 362, 185 328
                            C 155 294, 155 224, 185 190
                            C 215 156, 265 156, 300 186
                            Z
                        "
                        stroke="url(#ldr-bevel)"
                        strokeWidth="3"
                        fill="none"
                    />

                    {/* Upper Jaw Gripping Pad */}
                    <rect x="296" y="148" width="42" height="38" rx="6" fill="#131d2e" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="305" y1="154" x2="305" y2="180" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    <line x1="317" y1="154" x2="317" y2="180" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    <line x1="329" y1="154" x2="329" y2="180" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />

                    {/* Lower Vise Crossbar Pad */}
                    <rect x="250" y="260" width="50" height="48" rx="6" fill="#131d2e" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="262" y1="266" x2="262" y2="302" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    <line x1="274" y1="266" x2="274" y2="302" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    <line x1="286" y1="266" x2="286" y2="302" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />

                    {/* Central Heavy-Duty Spine Hinge Pivot */}
                    <circle cx="145" cy="256" r="24" fill="#111827" stroke="#38bdf8" strokeWidth="3" />
                    <circle cx="145" cy="256" r="14" fill="#030712" stroke="#94a3b8" strokeWidth="1.5" />
                    <circle cx="145" cy="256" r="6" fill="#38bdf8" filter="url(#ldr-glow)" />

                    {/* Upper Rivet */}
                    <circle cx="210" cy="138" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
                    <circle cx="210" cy="138" r="3" fill="#ffffff" opacity="0.6" />

                    {/* Lower Rivet */}
                    <circle cx="210" cy="378" r="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
                    <circle cx="210" cy="378" r="3" fill="#ffffff" opacity="0.6" />
                </g>

                {/* ── Active Gripping Lock Points ── */}
                <g transform="translate(308, 186)" filter="url(#ldr-glow)">
                    <circle cx="0" cy="0" r="7" fill="#ffffff" />
                    <circle cx="0" cy="0" r="15" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
                </g>
                <g transform="translate(262, 280)" filter="url(#ldr-glow)">
                    <circle cx="0" cy="0" r="7" fill="#ffffff" />
                    <circle cx="0" cy="0" r="15" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
                </g>

                {/* Top Arch Glint */}
                <path
                    d="M 180 155 C 220 128, 275 128, 315 155"
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    opacity="0.35"
                />
            </svg>
        </div>
    );
};

// ─── Minimalist Institutional Telemetry Chip ──────────────────────────────────
const TelemetryChip: React.FC<{ delay: number; x: number; y: number; label: string; status: string; color: string }> = ({ delay, x, y, label, status, color }) => (
    <motion.div
        className="absolute pointer-events-none"
        style={{ left: x, top: y }}
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -6], scale: [0.9, 1, 1, 0.95] }}
        transition={{ delay, duration: 3.2, times: [0, 0.2, 0.75, 1], repeat: Infinity, repeatDelay: 1.6 + delay * 0.2 }}
    >
        <div
            className="flex items-center gap-2 rounded-lg px-2.5 py-1 backdrop-blur-md border border-white/10 shadow-lg"
            style={{ background: 'rgba(10,14,23,0.85)' }}
        >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[8px] font-bold tracking-widest uppercase text-text-muted">{label}</span>
            <span className="text-[8px] font-black uppercase" style={{ color: color }}>{status}</span>
        </div>
    </motion.div>
);

// ─── Scanning Laser Line ───────────────────────────────────────────────────────
const ScanLine: React.FC = () => (
    <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.45), transparent)' }}
        initial={{ top: '25%', opacity: 0 }}
        animate={{ top: ['25%', '75%', '25%'], opacity: [0, 0.7, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
    />
);

// ─── Cycling Status Messages ──────────────────────────────────────────────────
const MESSAGES = [
    'Locking financial float',
    'Calibrating cash-flow matrix',
    'Scanning anomaly radar',
    'Securing private intelligence vault',
    'Synthesizing growth trajectory',
];

// ─── Fullscreen Splash Content ────────────────────────────────────────────────
const SplashContent: React.FC<{ text?: string }> = ({ text }) => {
    const [msgIdx, setMsgIdx] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 2200);
        const progTimer = setInterval(() => setProgress(p => Math.min(p + Math.random() * 14, 96)), 260);
        return () => { clearInterval(msgTimer); clearInterval(progTimer); };
    }, []);

    return (
        <div className="relative flex flex-col items-center justify-center w-full h-full select-none overflow-hidden">
            {/* Precision background grid */}
            <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage: `linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)`,
                    backgroundSize: '36px 36px'
                }}
            />

            {/* Radial vignette */}
            <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 50%, transparent, #050505 85%)' }}
            />

            {/* Scan line */}
            <ScanLine />

            {/* Stage containing the 3D Clasp and Telemetry Chips */}
            <div className="relative flex items-center justify-center" style={{ width: 280, height: 260 }}>
                {/* Floating Telemetry Chips */}
                <TelemetryChip delay={0.2} x={-110} y={35} label="Float Engine" status="Locked" color="#38bdf8" />
                <TelemetryChip delay={1.4} x={140} y={25} label="Capital Buffer" status="Optimal" color="#34d399" />
                <TelemetryChip delay={2.6} x={-95} y={170} label="Anomaly Guard" status="Active" color="#38bdf8" />
                <TelemetryChip delay={0.8} x={125} y={175} label="Velocity" status="Synced" color="#f59e0b" />

                {/* 3D Clasp Emblem with Hydraulic Tension Pulse */}
                <motion.div
                    animate={{
                        scale: [1, 1.025, 1],
                        y: [0, -4, 0]
                    }}
                    transition={{
                        duration: 3.5,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                >
                    <GripClaspMark size={160} />
                </motion.div>
            </div>

            {/* Wordmark */}
            <motion.div
                className="mt-6 flex flex-col items-center gap-1.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
            >
                <h1
                    className="text-[26px] font-black tracking-[0.38em] text-text-primary uppercase"
                    style={{ fontFamily: '-apple-system, "SF Pro Display", sans-serif' }}
                >
                    GRIP
                </h1>
                <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-text-muted">
                    Financial Intelligence Engine
                </p>
            </motion.div>

            {/* Precision Progress Bar */}
            <motion.div
                className="mt-8 w-44 h-[2px] rounded-full overflow-hidden"
                style={{ background: 'rgba(56,189,248,0.1)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #0284c7, #38bdf8, #06b6d4)' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                />
            </motion.div>

            {/* Cycling status message */}
            <div className="mt-3.5 h-4 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={text || msgIdx}
                        className="text-[9px] font-semibold tracking-[0.22em] uppercase text-center"
                        style={{ color: 'rgba(56,189,248,0.55)' }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3 }}
                    >
                        {text || MESSAGES[msgIdx]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
};

// ─── Public Loader Component ──────────────────────────────────────────────────
export const Loader: React.FC<LoaderProps> = ({ fullPage = false, text }) => {
    if (fullPage) {
        return (
            <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
            >
                <SplashContent text={text} />
            </motion.div>
        );
    }

    // Inline / Compact loader for page/component suspense
    return (
        <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3">
                <motion.div
                    animate={{
                        scale: [1, 1.06, 1],
                        opacity: [0.85, 1, 0.85]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <GripClaspMark size={52} />
                </motion.div>
                {text && (
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-text-muted animate-pulse">
                        {text}
                    </p>
                )}
            </div>
        </div>
    );
};
