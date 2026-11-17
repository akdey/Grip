import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { Logo } from './Logo';
import { Footer } from '../layout/Footer';
import { useNetworkStore } from '../../lib/network';
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
    const isOnline = useNetworkStore((state) => state.isOnline);
    const checkConnection = useNetworkStore((state) => state.checkConnection);
    const [isChecking, setIsChecking] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState<number>(() => {
        try {
            return parseInt(localStorage.getItem('grip_offline_highscore') || '0', 10);
        } catch {
            return 0;
        }
    });
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER'>('IDLE');

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const topOverlayRef = useRef<HTMLDivElement | null>(null);
    const bottomOverlayRef = useRef<HTMLDivElement | null>(null);

    // Physics & State
    const stateRef = useRef({
        width: 400,
        height: 800,
        topCeilingY: 180, // Dynamic: cannot bounce beyond writings
        bottomFloorY: 700, // Dynamic: above bottom buttons
        playerX: 70,
        playerY: 350,
        velocity: 0,
        rotation: 0,
        gravity: 0.44, // Constant downward pull
        hopStrength: -8.8, // Upward impulse on tap
        speed: 3.2,
        score: 0,
        frameCount: 0,
        obstacles: [] as Obstacle[],
        coins: [] as Coin[],
        particles: [] as Particle[],
        stars: [] as Star[],
    });

    // Complete reset of game state, physics, and canvas animation loop
    const resetGameState = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        setGameState('IDLE');
        setScore(0);
        setIsChecking(false);
        stateRef.current.velocity = 0;
        stateRef.current.rotation = 0;
        stateRef.current.score = 0;
        stateRef.current.frameCount = 0;
        stateRef.current.speed = 3.2;
        stateRef.current.obstacles = [];
        stateRef.current.coins = [];
        stateRef.current.particles = [];
    }, []);

    // Check connectivity via native Capacitor Network + backend ping
    const handleRetry = useCallback(async () => {
        setIsChecking(true);
        haptics.selection();
        try {
            const connected = await checkConnection();
            if (connected) {
                setDismissed(false);
                resetGameState();
            }
        } finally {
            setIsChecking(false);
        }
    }, [checkConnection, resetGameState]);

    useEffect(() => {
        if (isOnline) {
            setDismissed(false);
            resetGameState();
        }
    }, [isOnline, resetGameState]);

    // Resize canvas to full viewport with Retina scaling and calculate bounds
    const updateCanvasBounds = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = w * dpr;
        canvas.height = h * dpr;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }

        stateRef.current.width = w;
        stateRef.current.height = h;

        // Measure Top Overlay to set ceiling right below writings
        if (topOverlayRef.current) {
            const rect = topOverlayRef.current.getBoundingClientRect();
            stateRef.current.topCeilingY = Math.max(140, rect.bottom + 16);
        } else {
            stateRef.current.topCeilingY = 180;
        }

        // Measure Bottom Overlay to set floor above bottom controls
        if (bottomOverlayRef.current) {
            const rect = bottomOverlayRef.current.getBoundingClientRect();
            stateRef.current.bottomFloorY = Math.min(h - 40, rect.top - 16);
        } else {
            stateRef.current.bottomFloorY = h - 90;
        }

        // Background stars
        if (stateRef.current.stars.length === 0) {
            const stars: Star[] = [];
            for (let i = 0; i < 40; i++) {
                stars.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    radius: Math.random() * 1.5 + 0.4,
                    speed: Math.random() * 0.6 + 0.2,
                    alpha: Math.random() * 0.5 + 0.15,
                });
            }
            stateRef.current.stars = stars;
        }
    }, []);

    useEffect(() => {
        if (!isOnline && !dismissed) {
            updateCanvasBounds();
            window.addEventListener('resize', updateCanvasBounds);
            return () => window.removeEventListener('resize', updateCanvasBounds);
        }
    }, [isOnline, dismissed, updateCanvasBounds]);

    // Particle emission helpers
    const emitHopParticles = (x: number, y: number) => {
        const p = stateRef.current.particles;
        for (let i = 0; i < 4; i++) {
            p.push({
                x: x - 4,
                y: y + 8 + (Math.random() - 0.5) * 4,
                vx: -1.5 + (Math.random() - 0.5) * 2,
                vy: Math.random() * 3 + 1.5,
                size: Math.random() * 3 + 1.5,
                color: Math.random() > 0.4 ? '#38bdf8' : '#818cf8',
                alpha: 0.85,
                decay: 0.04,
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
                decay: 0.03,
            });
        }
    };

    const emitExplosion = (x: number, y: number) => {
        const p = stateRef.current.particles;
        for (let i = 0; i < 22; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            p.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 1.5,
                color: Math.random() > 0.5 ? '#f87171' : '#fb923c',
                alpha: 1,
                decay: 0.025,
            });
        }
    };

    // Tap-tap Hop action
    const handleTap = useCallback(() => {
        if (gameState === 'IDLE') {
            const { topCeilingY, bottomFloorY } = stateRef.current;
            const midY = (topCeilingY + bottomFloorY) / 2;
            stateRef.current.playerY = midY;
            stateRef.current.velocity = stateRef.current.hopStrength;
            stateRef.current.score = 0;
            stateRef.current.speed = 3.2;
            stateRef.current.frameCount = 0;
            stateRef.current.obstacles = [];
            stateRef.current.coins = [];
            stateRef.current.particles = [];
            setScore(0);
            setGameState('PLAYING');
            emitHopParticles(stateRef.current.playerX, midY);
            haptics.impact('light');
            return;
        }

        if (gameState === 'PLAYING') {
            // Apply upward impulse
            stateRef.current.velocity = stateRef.current.hopStrength;
            emitHopParticles(stateRef.current.playerX, stateRef.current.playerY);
            haptics.impact('light');
            return;
        }

        if (gameState === 'GAMEOVER') {
            const { topCeilingY, bottomFloorY } = stateRef.current;
            const midY = (topCeilingY + bottomFloorY) / 2;
            stateRef.current.playerY = midY;
            stateRef.current.velocity = stateRef.current.hopStrength;
            stateRef.current.score = 0;
            stateRef.current.speed = 3.2;
            stateRef.current.frameCount = 0;
            stateRef.current.obstacles = [];
            stateRef.current.coins = [];
            stateRef.current.particles = [];
            setScore(0);
            setGameState('PLAYING');
            emitHopParticles(stateRef.current.playerX, midY);
            haptics.impact('medium');
        }
    }, [gameState]);

    const endGame = () => {
        haptics.notification('error');
        setGameState('GAMEOVER');

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

    // 60FPS Game Loop
    useEffect(() => {
        let lastTime = performance.now();

        const loop = (currentTime: number) => {
            const dt = Math.min((currentTime - lastTime) / 16.667, 2);
            lastTime = currentTime;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const s = stateRef.current;
            const { width, height, topCeilingY, bottomFloorY } = s;

            s.frameCount++;

            // 1. Clear
            ctx.clearRect(0, 0, width, height);

            // 2. Stars
            for (const star of s.stars) {
                star.x -= star.speed * dt;
                if (star.x < 0) star.x = width;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // 3. Play Zone Guidelines (Ceiling and Floor lines)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);

            // Ceiling line (below writings)
            ctx.beginPath();
            ctx.moveTo(0, topCeilingY);
            ctx.lineTo(width, topCeilingY);
            ctx.stroke();

            // Floor line (above bottom bar)
            ctx.beginPath();
            ctx.moveTo(0, bottomFloorY);
            ctx.lineTo(width, bottomFloorY);
            ctx.stroke();

            ctx.setLineDash([]);

            // 4. Update Physics if Playing
            if (gameState === 'PLAYING') {
                // Gravity pulls down
                s.velocity += s.gravity * dt;
                s.playerY += s.velocity * dt;

                // Rotation based on velocity
                const targetRotation = Math.max(-0.45, Math.min(s.velocity * 0.06, 0.5));
                s.rotation += (targetRotation - s.rotation) * 0.2;

                // Ceiling constraint: CANNOT BOUNCE BEYOND WRITINGS
                const radius = 13;
                if (s.playerY - radius < topCeilingY) {
                    s.playerY = topCeilingY + radius;
                    s.velocity = 0; // Bonk on ceiling
                }

                // Floor collision (falls down if not tapped)
                if (s.playerY + radius > bottomFloorY) {
                    s.playerY = bottomFloorY - radius;
                    emitExplosion(s.playerX, s.playerY);
                    endGame();
                    return;
                }

                // 5. Spawn Obstacles within the play zone (between ceiling & floor)
                const playZoneHeight = bottomFloorY - topCeilingY;
                const spawnInterval = Math.max(85, 120 - Math.floor(s.score / 150));

                if (s.frameCount % spawnInterval === 0) {
                    const gap = Math.max(120, 150 - Math.floor(s.score / 200));
                    const minPillar = 30;
                    const maxTop = playZoneHeight - gap - minPillar;
                    const topH = Math.floor(Math.random() * Math.max(10, maxTop)) + minPillar;

                    s.obstacles.push({
                        x: width + 20,
                        topHeight: topCeilingY + topH,
                        bottomY: topCeilingY + topH + gap,
                        width: 44,
                        passed: false,
                    });

                    // Golden coin in middle
                    if (Math.random() > 0.3) {
                        s.coins.push({
                            x: width + 42,
                            y: topCeilingY + topH + gap / 2,
                            radius: 12,
                            collected: false,
                            bobOffset: Math.random() * Math.PI,
                        });
                    }
                }

                // 6. Update Obstacles
                for (let i = s.obstacles.length - 1; i >= 0; i--) {
                    const obs = s.obstacles[i];
                    obs.x -= s.speed * dt;

                    // Pass score
                    if (!obs.passed && obs.x + obs.width < s.playerX) {
                        obs.passed = true;
                        s.score += 25;
                        setScore(s.score);
                        s.speed = Math.min(5.5, s.speed + 0.03);
                    }

                    ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
                    ctx.lineWidth = 1.5;

                    // Top pillar (starts from ceiling down)
                    const topBlockH = obs.topHeight - topCeilingY;
                    ctx.beginPath();
                    ctx.roundRect(obs.x, topCeilingY, obs.width, topBlockH, [0, 0, 10, 10]);
                    ctx.fill();
                    ctx.stroke();

                    // Bottom pillar (starts from bottomY to floor)
                    const btmBlockH = bottomFloorY - obs.bottomY;
                    ctx.beginPath();
                    ctx.roundRect(obs.x, obs.bottomY, obs.width, btmBlockH, [10, 10, 0, 0]);
                    ctx.fill();
                    ctx.stroke();

                    // Red warning indicator at tips
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(obs.x + 3, obs.topHeight - 2, obs.width - 6, 2);
                    ctx.fillRect(obs.x + 3, obs.bottomY, obs.width - 6, 2);

                    // Collision check
                    const inX = s.playerX + radius > obs.x && s.playerX - radius < obs.x + obs.width;
                    const hitTop = s.playerY - radius < obs.topHeight;
                    const hitBottom = s.playerY + radius > obs.bottomY;

                    if (inX && (hitTop || hitBottom)) {
                        emitExplosion(s.playerX, s.playerY);
                        endGame();
                        return;
                    }

                    if (obs.x + obs.width < -30) {
                        s.obstacles.splice(i, 1);
                    }
                }

                // 7. Update Coins
                for (let i = s.coins.length - 1; i >= 0; i--) {
                    const c = s.coins[i];
                    c.x -= s.speed * dt;

                    const bob = Math.sin(s.frameCount * 0.08 + c.bobOffset) * 3;
                    const currentY = c.y + bob;

                    if (!c.collected) {
                        const dist = Math.hypot(s.playerX - c.x, s.playerY - currentY);
                        if (dist < 24) {
                            c.collected = true;
                            s.score += 50;
                            setScore(s.score);
                            emitCoinBurst(c.x, currentY);
                            haptics.impact('light');
                        }
                    }

                    if (!c.collected) {
                        ctx.save();
                        ctx.shadowColor = '#fbbf24';
                        ctx.shadowBlur = 10;
                        ctx.fillStyle = '#f59e0b';
                        ctx.beginPath();
                        ctx.arc(c.x, currentY, c.radius, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.strokeStyle = '#fef08a';
                        ctx.lineWidth = 1.2;
                        ctx.stroke();

                        ctx.shadowBlur = 0;
                        ctx.fillStyle = '#ffffff';
                        ctx.font = '900 8.5px Inter, system-ui, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('G', c.x, currentY + 0.5);
                        ctx.restore();
                    }

                    if (c.x < -30 || c.collected) {
                        s.coins.splice(i, 1);
                    }
                }
            } else if (gameState === 'IDLE') {
                // Gentle floating bob in the center
                const midY = (topCeilingY + bottomFloorY) / 2;
                s.playerY = midY + Math.sin(s.frameCount * 0.05) * 8;
                s.rotation = 0;
            }

            // 8. Render Particles
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

            // 9. Render Player (Grip Ball / Falcon Token)
            ctx.save();
            ctx.translate(s.playerX, s.playerY);
            ctx.rotate(s.rotation);

            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;

            const pGrad = ctx.createLinearGradient(-13, -13, 13, 13);
            pGrad.addColorStop(0, '#38bdf8');
            pGrad.addColorStop(1, '#1d4ed8');
            ctx.fillStyle = pGrad;

            // Rounded ball
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();

            // Inner Accent
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
            ctx.stroke();

            // G initial
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 9.5px Inter, system-ui, sans-serif';
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

    // Keyboard support for spacebar tap
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
                e.preventDefault();
                handleTap();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleTap]);

    if (isOnline || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onPointerDown={(e) => {
                    // Check if clicked inside a button; if not, trigger game tap
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) return;
                    handleTap();
                }}
                className="fixed inset-0 z-[100] bg-[#07080c] text-white flex flex-col justify-between overflow-hidden select-none touch-manipulation cursor-pointer"
            >
                {/* 1. FULLSCREEN BACKGROUND CANVAS */}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

                {/* 2. TOP OVERLAY: Header + WiFi + Brand + Offline Writings */}
                <div
                    ref={topOverlayRef}
                    className="relative z-10 w-full max-w-md mx-auto pt-safe px-5 pt-3 flex flex-col items-center text-center pointer-events-none"
                >
                    {/* Header Row */}
                    <div className="w-full flex items-center justify-between pointer-events-auto">
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded-xl bg-white/5 border border-white/10 shadow-sm">
                                <Logo size={22} />
                            </div>
                            <span className="text-sm font-extrabold tracking-tight text-white heading-apple">
                                Grip
                            </span>
                        </div>

                        {/* Top Right: Offline Pill + High Score */}
                        <div className="flex items-center gap-2">
                            {highScore > 0 && (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                                    <Trophy size={11} />
                                    <span>{highScore.toLocaleString()} PTS</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                <span className="text-[10px] font-bold tracking-wider uppercase">
                                    Offline
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Wifi Icon & Status Statements (Shifted towards top) */}
                    <div className="mt-2.5 flex flex-col items-center">
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-red-400 mb-1 shadow-sm">
                            <WifiOff size={18} />
                        </div>
                        <h1 className="text-base sm:text-lg font-black tracking-tight text-white heading-apple leading-tight">
                            Grip is Offline
                        </h1>
                        <p className="text-[11px] text-text-muted mt-0.5 max-w-[280px] leading-relaxed">
                            No internet connection. Grip will automatically sync when signal returns.
                        </p>
                    </div>

                    {/* Tap-tap Hint / In-Game Score */}
                    {gameState === 'IDLE' && (
                        <div className="mt-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/80 text-[10px] font-bold tracking-wide animate-pulse">
                            Tap to hop • Tap-tap to stay airborne
                        </div>
                    )}

                    {gameState === 'PLAYING' && (
                        <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white tabular-nums tracking-tight font-mono drop-shadow-md">
                                {score.toLocaleString()}
                            </span>
                            <span className="text-xs text-white/50 font-sans font-bold tracking-wider">
                                PTS
                            </span>
                        </div>
                    )}

                    {gameState === 'GAMEOVER' && (
                        <div className="mt-1 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-white text-[11px] font-extrabold flex items-center gap-1.5 animate-bounce">
                            <RotateCcw size={12} />
                            <span>Score: {score.toLocaleString()} PTS • Tap anywhere to try again</span>
                        </div>
                    )}
                </div>

                {/* 3. BOTTOM OVERLAY: Smaller actions + Creator Attribution Footer */}
                <div
                    ref={bottomOverlayRef}
                    className="relative z-10 w-full max-w-md mx-auto pb-safe px-5 pb-3 flex flex-col items-center gap-2.5 pointer-events-auto"
                >
                    {/* Smaller Action Buttons at bottom */}
                    <div className="w-full flex items-center gap-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRetry();
                            }}
                            disabled={isChecking}
                            className="flex-1 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-[11px] active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                            <RefreshCw size={11} className={isChecking ? 'animate-spin' : ''} />
                            <span>{isChecking ? 'Checking...' : 'Try Reconnecting'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                haptics.selection();
                                setDismissed(true);
                            }}
                            className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold text-[11px] active:scale-95 transition-all flex items-center gap-1"
                        >
                            <span>Browse Cached</span>
                            <ArrowRight size={11} />
                        </button>
                    </div>

                    {/* Reusable Creator Attribution Footer */}
                    <Footer className="select-none text-center pt-0.5" />
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
