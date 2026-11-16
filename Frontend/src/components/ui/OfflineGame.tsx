import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Trophy, ArrowRight, RotateCcw, Zap, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { haptics } from '../../lib/haptics';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    decay: number;
}

interface Obstacle {
    x: number;
    topHeight: number;
    bottomY: number;
    width: number;
    passed: boolean;
}

interface Coin {
    x: number;
    y: number;
    radius: number;
    collected: boolean;
    bobOffset: number;
}

interface Star {
    x: number;
    y: number;
    radius: number;
    speed: number;
    alpha: number;
}

export const OfflineGame: React.FC = () => {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [isChecking, setIsChecking] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [highScore, setHighScore] = useState<number>(() => {
        try {
            return parseInt(localStorage.getItem('grip_offline_highscore') || '0', 10);
        } catch {
            return 0;
        }
    });
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');
    const [isThrusting, setIsThrusting] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const thrustingRef = useRef(false);

    // Physics & State Ref for silky 60fps loop without React re-render lag
    const stateRef = useRef({
        width: 400,
        height: 600,
        playerX: 80,
        playerY: 300,
        velocity: 0,
        rotation: 0,
        gravity: 0.38,
        thrust: -0.68,
        maxVelocity: 8,
        speed: 3.2,
        score: 0,
        streak: 0,
        frameCount: 0,
        obstacles: [] as Obstacle[],
        coins: [] as Coin[],
        particles: [] as Particle[],
        stars: [] as Star[],
    });

    // Check connectivity
    const handleRetry = useCallback(async () => {
        setIsChecking(true);
        haptics.selection();
        try {
            await fetch('/favicon.ico?_t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
            setIsOnline(true);
            setDismissed(false);
        } catch {
            setIsOnline(navigator.onLine);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setDismissed(false);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setDismissed(false);
            setGameState('IDLE');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Resize canvas with device pixel ratio for retina crispness
    const updateCanvasDimensions = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }

        stateRef.current.width = rect.width;
        stateRef.current.height = rect.height;

        // Initialize background stars
        if (stateRef.current.stars.length === 0) {
            const stars: Star[] = [];
            for (let i = 0; i < 45; i++) {
                stars.push({
                    x: Math.random() * rect.width,
                    y: Math.random() * rect.height,
                    radius: Math.random() * 1.5 + 0.5,
                    speed: Math.random() * 0.8 + 0.3,
                    alpha: Math.random() * 0.6 + 0.2,
                });
            }
            stateRef.current.stars = stars;
        }
    }, []);

    useEffect(() => {
        if (!isOnline && !dismissed) {
            updateCanvasDimensions();
            window.addEventListener('resize', updateCanvasDimensions);
            return () => window.removeEventListener('resize', updateCanvasDimensions);
        }
    }, [isOnline, dismissed, updateCanvasDimensions]);

    // Input handlers
    const startThrust = useCallback(() => {
        thrustingRef.current = true;
        setIsThrusting(true);
        haptics.impact('light');
    }, []);

    const stopThrust = useCallback(() => {
        thrustingRef.current = false;
        setIsThrusting(false);
    }, []);

    const startGame = useCallback(() => {
        const h = stateRef.current.height || 600;
        stateRef.current = {
            ...stateRef.current,
            playerX: 80,
            playerY: h / 2,
            velocity: 0,
            rotation: 0,
            speed: 3.4,
            score: 0,
            streak: 0,
            frameCount: 0,
            obstacles: [],
            coins: [],
            particles: [],
        };
        setScore(0);
        setStreak(0);
        setGameState('PLAYING');
        thrustingRef.current = true;
        setIsThrusting(true);
        haptics.impact('medium');
    }, []);

    // Particle emission helpers
    const emitJetParticles = (x: number, y: number) => {
        const p = stateRef.current.particles;
        for (let i = 0; i < 2; i++) {
            p.push({
                x: x - 14,
                y: y + (Math.random() - 0.5) * 8,
                vx: -stateRef.current.speed - Math.random() * 3,
                vy: (Math.random() - 0.5) * 1.5,
                size: Math.random() * 3.5 + 2,
                color: Math.random() > 0.4 ? '#38bdf8' : '#818cf8',
                alpha: 0.85,
                decay: 0.035,
            });
        }
    };

    const emitCoinBurst = (x: number, y: number) => {
        const p = stateRef.current.particles;
        for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1.5;
            p.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 1.5,
                color: Math.random() > 0.3 ? '#fbbf24' : '#f59e0b',
                alpha: 1,
                decay: 0.025,
            });
        }
    };

    const emitExplosion = (x: number, y: number) => {
        const p = stateRef.current.particles;
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            p.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                color: Math.random() > 0.5 ? '#f87171' : '#fb923c',
                alpha: 1,
                decay: 0.02,
            });
        }
    };

    // 60FPS Game loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        let lastTime = performance.now();

        const loop = (currentTime: number) => {
            const dt = Math.min((currentTime - lastTime) / 16.667, 2);
            lastTime = currentTime;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const s = stateRef.current;
            const { width, height } = s;

            s.frameCount++;

            // 1. Clear Screen
            ctx.clearRect(0, 0, width, height);

            // 2. Stars Parallax Background
            for (const star of s.stars) {
                star.x -= star.speed * dt;
                if (star.x < 0) star.x = width;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // 3. Subtle Horizon Grid line at bottom
            const horizonY = height - 12;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, horizonY);
            ctx.lineTo(width, horizonY);
            ctx.stroke();

            // 4. Update Player Physics
            if (thrustingRef.current) {
                s.velocity += s.thrust * dt;
                emitJetParticles(s.playerX, s.playerY);
            } else {
                s.velocity += s.gravity * dt;
            }

            // Clamp velocity
            s.velocity = Math.max(-s.maxVelocity, Math.min(s.velocity, s.maxVelocity));
            s.playerY += s.velocity * dt;

            // Target rotation based on velocity
            const targetRotation = Math.max(-0.45, Math.min(s.velocity * 0.06, 0.55));
            s.rotation += (targetRotation - s.rotation) * 0.15;

            // Boundary collision
            if (s.playerY < 20) {
                s.playerY = 20;
                s.velocity = 0;
            }
            if (s.playerY > height - 25) {
                s.playerY = height - 25;
                emitExplosion(s.playerX, s.playerY);
                endGame();
                return;
            }

            // 5. Spawn Obstacles (Obsidian Volatility Pillars)
            const spawnInterval = Math.max(90, 130 - Math.floor(s.score / 150));
            if (s.frameCount % spawnInterval === 0) {
                const gap = Math.max(140, 175 - Math.floor(s.score / 200));
                const minH = 60;
                const maxTop = height - gap - minH - 30;
                const topH = Math.floor(Math.random() * (maxTop - minH)) + minH;

                s.obstacles.push({
                    x: width + 20,
                    topHeight: topH,
                    bottomY: topH + gap,
                    width: 52,
                    passed: false,
                });

                // Spawn a golden coin in the middle of the gap
                if (Math.random() > 0.25) {
                    s.coins.push({
                        x: width + 46,
                        y: topH + gap / 2,
                        radius: 13,
                        collected: false,
                        bobOffset: Math.random() * Math.PI,
                    });
                }
            }

            // 6. Update & Render Obstacles
            for (let i = s.obstacles.length - 1; i >= 0; i--) {
                const obs = s.obstacles[i];
                obs.x -= s.speed * dt;

                // Score on pass
                if (!obs.passed && obs.x + obs.width < s.playerX) {
                    obs.passed = true;
                    s.score += 25;
                    setScore(s.score);
                    s.speed = Math.min(6.5, s.speed + 0.04);
                }

                // Render Top Pillar
                const topGrad = ctx.createLinearGradient(obs.x, 0, obs.x + obs.width, 0);
                topGrad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
                topGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.45)');
                topGrad.addColorStop(1, 'rgba(239, 68, 68, 0.25)');

                ctx.fillStyle = topGrad;
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
                ctx.lineWidth = 1.5;

                // Top block
                ctx.beginPath();
                ctx.roundRect(obs.x, -10, obs.width, obs.topHeight + 10, [0, 0, 14, 14]);
                ctx.fill();
                ctx.stroke();

                // Bottom block
                const btmH = height - obs.bottomY;
                ctx.beginPath();
                ctx.roundRect(obs.x, obs.bottomY, obs.width, btmH + 10, [14, 14, 0, 0]);
                ctx.fill();
                ctx.stroke();

                // Glow lines at pillar tips
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(obs.x + 4, obs.topHeight - 3, obs.width - 8, 3);
                ctx.fillRect(obs.x + 4, obs.bottomY, obs.width - 8, 3);

                // Collision Detection with Player (Player radius ~ 15)
                const pr = 14;
                const inX = s.playerX + pr > obs.x && s.playerX - pr < obs.x + obs.width;
                const hitTop = s.playerY - pr < obs.topHeight;
                const hitBottom = s.playerY + pr > obs.bottomY;

                if (inX && (hitTop || hitBottom)) {
                    emitExplosion(s.playerX, s.playerY);
                    endGame();
                    return;
                }

                // Cleanup off-screen
                if (obs.x + obs.width < -30) {
                    s.obstacles.splice(i, 1);
                }
            }

            // 7. Update & Render Coins
            for (let i = s.coins.length - 1; i >= 0; i--) {
                const c = s.coins[i];
                c.x -= s.speed * dt;

                const bob = Math.sin(s.frameCount * 0.08 + c.bobOffset) * 4;
                const currentY = c.y + bob;

                if (!c.collected) {
                    // Check collection
                    const dist = Math.hypot(s.playerX - c.x, s.playerY - currentY);
                    if (dist < 26) {
                        c.collected = true;
                        s.score += 50;
                        s.streak += 1;
                        setScore(s.score);
                        setStreak(s.streak);
                        emitCoinBurst(c.x, currentY);
                        haptics.impact('light');
                    }
                }

                if (!c.collected) {
                    // Draw glowing golden coin
                    ctx.save();
                    ctx.shadowColor = '#fbbf24';
                    ctx.shadowBlur = 12;

                    ctx.fillStyle = '#f59e0b';
                    ctx.beginPath();
                    ctx.arc(c.x, currentY, c.radius, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = '#fef08a';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Currency symbol
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('₹', c.x, currentY + 0.5);
                    ctx.restore();
                }

                if (c.x < -30 || c.collected) {
                    s.coins.splice(i, 1);
                }
            }

            // 8. Update & Render Particles
            for (let i = s.particles.length - 1; i >= 0; i--) {
                const pt = s.particles[i];
                pt.x += pt.vx;
                pt.y += pt.vy;
                pt.alpha -= pt.decay;

                if (pt.alpha <= 0) {
                    s.particles.splice(i, 1);
                    continue;
                }

                ctx.fillStyle = pt.color;
                ctx.globalAlpha = Math.max(0, pt.alpha);
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // 9. Render Player (Grip Neon Falcon Orb)
            ctx.save();
            ctx.translate(s.playerX, s.playerY);
            ctx.rotate(s.rotation);

            // Outer Neon Halo
            ctx.shadowColor = thrustingRef.current ? '#38bdf8' : '#6366f1';
            ctx.shadowBlur = 16;

            // Core Capsule
            const pGrad = ctx.createLinearGradient(-15, -15, 15, 15);
            pGrad.addColorStop(0, '#38bdf8');
            pGrad.addColorStop(1, '#1d4ed8');
            ctx.fillStyle = pGrad;

            ctx.beginPath();
            ctx.roundRect(-16, -16, 32, 32, 10);
            ctx.fill();

            // Inner Ring / Logo Accent
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
            ctx.stroke();

            // Grip Letter
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('G', 0, 0.5);

            ctx.restore();

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [gameState]);

    const endGame = () => {
        haptics.notification('error');
        setGameState('GAMEOVER');
        stopThrust();

        const finalScore = stateRef.current.score;
        if (finalScore > highScore) {
            setHighScore(finalScore);
            try {
                localStorage.setItem('grip_offline_highscore', finalScore.toString());
            } catch {
                // ignore
            }
        }
    };

    // Keyboard support for desktop
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
                e.preventDefault();
                if (gameState === 'PLAYING') {
                    startThrust();
                } else if (gameState === 'IDLE' || gameState === 'GAMEOVER') {
                    startGame();
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
                e.preventDefault();
                stopThrust();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState, startThrust, stopThrust, startGame]);

    if (isOnline || dismissed) return null;

    // Financial Tier Label based on Score
    const getTierLabel = (val: number) => {
        if (val >= 600) return { title: 'Financial Titan', color: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/30' };
        if (val >= 350) return { title: 'Wealth Builder', color: 'text-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/30' };
        if (val >= 150) return { title: 'Smart Investor', color: 'text-sky-400', badge: 'bg-sky-500/10 border-sky-500/30' };
        return { title: 'Disciplined Saver', color: 'text-purple-400', badge: 'bg-purple-500/10 border-purple-500/30' };
    };

    const currentTier = getTierLabel(score);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-[#07080b] flex flex-col justify-between overflow-hidden select-none touch-none"
            >
                {/* 1. TOP FLOATING HUD BAR (Apple Glass Pill) */}
                <header className="pt-safe px-4 pt-3 z-30 flex items-center justify-between w-full max-w-lg mx-auto">
                    {/* Status Pill */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg">
                        <div className="relative flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="absolute w-4 h-4 rounded-full bg-amber-400/30 animate-ping" />
                        </div>
                        <span className="text-[11px] font-bold text-white/90 tracking-wide">
                            Vault Offline
                        </span>
                    </div>

                    {/* Score / Best Pill */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
                            <Trophy size={13} className="text-amber-400" />
                            <span className="text-xs font-black text-white tabular-nums">
                                ₹{highScore.toLocaleString()}
                            </span>
                        </div>

                        {/* Reconnect Button */}
                        <button
                            onClick={handleRetry}
                            disabled={isChecking}
                            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 text-white/80 transition-all disabled:opacity-50"
                            aria-label="Check Connection"
                        >
                            <RefreshCw size={13} className={isChecking ? 'animate-spin text-sky-400' : ''} />
                        </button>
                    </div>
                </header>

                {/* 2. MAIN FULL-BLEED GAME ARENA */}
                <div
                    ref={containerRef}
                    onPointerDown={() => {
                        if (gameState === 'PLAYING') startThrust();
                        else if (gameState === 'IDLE') startGame();
                    }}
                    onPointerUp={stopThrust}
                    onPointerCancel={stopThrust}
                    className="relative flex-1 w-full h-full cursor-pointer flex items-center justify-center overflow-hidden"
                >
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

                    {/* LIVE IN-GAME HUD (When Playing) */}
                    {gameState === 'PLAYING' && (
                        <div className="absolute top-4 inset-x-0 flex flex-col items-center pointer-events-none">
                            <motion.span
                                key={score}
                                initial={{ scale: 1.15 }}
                                animate={{ scale: 1 }}
                                className="text-4xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] tabular-nums font-mono"
                            >
                                ₹{score.toLocaleString()}
                            </motion.span>
                            {streak > 1 && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 mt-1 tracking-wider uppercase animate-pulse">
                                    <Sparkles size={11} /> {streak}x Yield Streak
                                </span>
                            )}
                        </div>
                    )}

                    {/* START SCREEN MODAL */}
                    {gameState === 'IDLE' && (
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative z-20 w-[90%] max-w-sm rounded-[32px] bg-white/[0.04] border border-white/10 backdrop-blur-2xl p-7 text-center shadow-2xl flex flex-col items-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 p-0.5 shadow-[0_0_30px_rgba(56,189,248,0.35)] mb-4 flex items-center justify-center">
                                <div className="w-full h-full rounded-[14px] bg-[#0c1017] flex items-center justify-center">
                                    <Logo size={32} />
                                </div>
                            </div>

                            <h2 className="text-xl font-black text-white tracking-tight heading-apple">
                                Grip Vault Glider
                            </h2>
                            <p className="text-xs text-text-muted mt-1.5 leading-relaxed max-w-[240px]">
                                Navigate market volatility and harvest yield while signal reconnects.
                            </p>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startGame();
                                }}
                                className="mt-6 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-[0_8px_25px_rgba(56,189,248,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap size={16} className="fill-white" />
                                <span>Tap to Launch</span>
                            </button>

                            <p className="text-[10px] text-white/30 font-medium mt-3 tracking-wide">
                                Hold to thrust upward • Release to glide
                            </p>
                        </motion.div>
                    )}

                    {/* GAME OVER SCREEN MODAL */}
                    {gameState === 'GAMEOVER' && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="relative z-20 w-[90%] max-w-sm rounded-[32px] bg-white/[0.05] border border-white/10 backdrop-blur-2xl p-7 text-center shadow-2xl flex flex-col items-center"
                        >
                            <span className="text-[10px] font-black tracking-widest text-red-400 uppercase">
                                Volatility Spike
                            </span>

                            <h3 className="text-3xl font-black text-white tracking-tight mt-1 tabular-nums font-mono">
                                ₹{score.toLocaleString()}
                            </h3>

                            {/* Tier Badge */}
                            <div className={`mt-2 px-3 py-1 rounded-full border text-[11px] font-bold ${currentTier.color} ${currentTier.badge} flex items-center gap-1.5`}>
                                <Sparkles size={12} />
                                <span>{currentTier.title}</span>
                            </div>

                            {/* New High Score Callout */}
                            {score >= highScore && score > 0 && (
                                <span className="text-[10px] text-amber-400 font-extrabold tracking-wider uppercase mt-2 animate-bounce">
                                    ★ New Personal Best! ★
                                </span>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-6 w-full flex flex-col gap-2.5">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startGame();
                                    }}
                                    className="w-full py-3.5 px-6 rounded-2xl bg-white text-black font-extrabold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={15} />
                                    <span>Relaunch Vault</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRetry();
                                    }}
                                    disabled={isChecking}
                                    className="w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
                                    <span>{isChecking ? 'Connecting...' : 'Check Internet Connection'}</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* 3. BOTTOM UTILITY BAR */}
                <footer className="pb-safe px-4 pb-4 z-30 flex items-center justify-between w-full max-w-lg mx-auto">
                    <button
                        onClick={() => {
                            haptics.selection();
                            setDismissed(true);
                        }}
                        className="text-xs text-white/50 hover:text-white font-medium transition-colors flex items-center gap-1.5 py-1 px-2"
                    >
                        <span>Browse cached app</span>
                        <ArrowRight size={13} />
                    </button>

                    <div className="flex items-center gap-1 text-[10px] text-white/30 font-mono">
                        <WifiOff size={11} />
                        <span>Offline Ready</span>
                    </div>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};
