import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Trophy, ArrowRight, RotateCcw, Play, Gamepad2, Sparkles } from 'lucide-react';
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

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const arenaRef = useRef<HTMLDivElement | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const thrustingRef = useRef(false);

    // Physics state
    const stateRef = useRef({
        width: 360,
        height: 220,
        playerX: 60,
        playerY: 110,
        velocity: 0,
        rotation: 0,
        gravity: 0.36,
        thrust: -0.65,
        maxVelocity: 7.5,
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

    // Resize canvas with device pixel ratio
    const updateCanvasDimensions = useCallback(() => {
        const canvas = canvasRef.current;
        const arena = arenaRef.current;
        if (!canvas || !arena) return;

        const rect = arena.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }

        stateRef.current.width = rect.width;
        stateRef.current.height = rect.height;

        if (stateRef.current.stars.length === 0) {
            const stars: Star[] = [];
            for (let i = 0; i < 30; i++) {
                stars.push({
                    x: Math.random() * rect.width,
                    y: Math.random() * rect.height,
                    radius: Math.random() * 1.4 + 0.5,
                    speed: Math.random() * 0.7 + 0.3,
                    alpha: Math.random() * 0.5 + 0.2,
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

    // Thrust handlers
    const startThrust = useCallback(() => {
        thrustingRef.current = true;
        haptics.impact('light');
    }, []);

    const stopThrust = useCallback(() => {
        thrustingRef.current = false;
    }, []);

    const startGame = useCallback(() => {
        const h = stateRef.current.height || 220;
        stateRef.current = {
            ...stateRef.current,
            playerX: 60,
            playerY: h / 2,
            velocity: 0,
            rotation: 0,
            speed: 3.2,
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
        haptics.impact('medium');
    }, []);

    // Particle helpers
    const emitJetParticles = (x: number, y: number) => {
        const p = stateRef.current.particles;
        for (let i = 0; i < 2; i++) {
            p.push({
                x: x - 12,
                y: y + (Math.random() - 0.5) * 6,
                vx: -stateRef.current.speed - Math.random() * 2.5,
                vy: (Math.random() - 0.5) * 1.5,
                size: Math.random() * 3 + 1.5,
                color: Math.random() > 0.4 ? '#38bdf8' : '#818cf8',
                alpha: 0.85,
                decay: 0.04,
            });
        }
    };

    const emitCoinBurst = (x: number, y: number) => {
        const p = stateRef.current.particles;
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3.5 + 1.5;
            p.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 2.5 + 1.5,
                color: Math.random() > 0.3 ? '#fbbf24' : '#f59e0b',
                alpha: 1,
                decay: 0.03,
            });
        }
    };

    const emitExplosion = (x: number, y: number) => {
        const p = stateRef.current.particles;
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            p.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3.5 + 1.5,
                color: Math.random() > 0.5 ? '#f87171' : '#fb923c',
                alpha: 1,
                decay: 0.025,
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

            // 3. Bottom guideline
            const horizonY = height - 6;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, horizonY);
            ctx.lineTo(width, horizonY);
            ctx.stroke();

            // 4. Update Player
            if (thrustingRef.current) {
                s.velocity += s.thrust * dt;
                emitJetParticles(s.playerX, s.playerY);
            } else {
                s.velocity += s.gravity * dt;
            }

            s.velocity = Math.max(-s.maxVelocity, Math.min(s.velocity, s.maxVelocity));
            s.playerY += s.velocity * dt;

            const targetRotation = Math.max(-0.4, Math.min(s.velocity * 0.06, 0.5));
            s.rotation += (targetRotation - s.rotation) * 0.15;

            // Boundaries
            if (s.playerY < 16) {
                s.playerY = 16;
                s.velocity = 0;
            }
            if (s.playerY > height - 18) {
                s.playerY = height - 18;
                emitExplosion(s.playerX, s.playerY);
                endGame();
                return;
            }

            // 5. Spawn Obstacles
            const spawnInterval = Math.max(80, 115 - Math.floor(s.score / 150));
            if (s.frameCount % spawnInterval === 0) {
                const gap = Math.max(105, 125 - Math.floor(s.score / 250));
                const minH = 30;
                const maxTop = height - gap - minH - 15;
                const topH = Math.floor(Math.random() * Math.max(10, maxTop - minH)) + minH;

                s.obstacles.push({
                    x: width + 15,
                    topHeight: topH,
                    bottomY: topH + gap,
                    width: 40,
                    passed: false,
                });

                if (Math.random() > 0.3) {
                    s.coins.push({
                        x: width + 35,
                        y: topH + gap / 2,
                        radius: 11,
                        collected: false,
                        bobOffset: Math.random() * Math.PI,
                    });
                }
            }

            // 6. Obstacles
            for (let i = s.obstacles.length - 1; i >= 0; i--) {
                const obs = s.obstacles[i];
                obs.x -= s.speed * dt;

                if (!obs.passed && obs.x + obs.width < s.playerX) {
                    obs.passed = true;
                    s.score += 25;
                    setScore(s.score);
                    s.speed = Math.min(5.5, s.speed + 0.03);
                }

                ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
                ctx.lineWidth = 1.5;

                // Top pillar
                ctx.beginPath();
                ctx.roundRect(obs.x, -5, obs.width, obs.topHeight + 5, [0, 0, 10, 10]);
                ctx.fill();
                ctx.stroke();

                // Bottom pillar
                const btmH = height - obs.bottomY;
                ctx.beginPath();
                ctx.roundRect(obs.x, obs.bottomY, obs.width, btmH + 5, [10, 10, 0, 0]);
                ctx.fill();
                ctx.stroke();

                // Collision check
                const pr = 12;
                const inX = s.playerX + pr > obs.x && s.playerX - pr < obs.x + obs.width;
                const hitTop = s.playerY - pr < obs.topHeight;
                const hitBottom = s.playerY + pr > obs.bottomY;

                if (inX && (hitTop || hitBottom)) {
                    emitExplosion(s.playerX, s.playerY);
                    endGame();
                    return;
                }

                if (obs.x + obs.width < -30) {
                    s.obstacles.splice(i, 1);
                }
            }

            // 7. Coins
            for (let i = s.coins.length - 1; i >= 0; i--) {
                const c = s.coins[i];
                c.x -= s.speed * dt;

                const bob = Math.sin(s.frameCount * 0.08 + c.bobOffset) * 3;
                const currentY = c.y + bob;

                if (!c.collected) {
                    const dist = Math.hypot(s.playerX - c.x, s.playerY - currentY);
                    if (dist < 22) {
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
                    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('₹', c.x, currentY + 0.5);
                    ctx.restore();
                }

                if (c.x < -30 || c.collected) {
                    s.coins.splice(i, 1);
                }
            }

            // 8. Particles
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

            // 9. Player (Grip Falcon Logo)
            ctx.save();
            ctx.translate(s.playerX, s.playerY);
            ctx.rotate(s.rotation);

            ctx.shadowColor = thrustingRef.current ? '#38bdf8' : '#6366f1';
            ctx.shadowBlur = 12;

            const pGrad = ctx.createLinearGradient(-12, -12, 12, 12);
            pGrad.addColorStop(0, '#38bdf8');
            pGrad.addColorStop(1, '#1d4ed8');
            ctx.fillStyle = pGrad;

            ctx.beginPath();
            ctx.roundRect(-12, -12, 24, 24, 7);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = '900 9px Inter, system-ui, sans-serif';
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

    // Keyboard controls for desktop
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
                if (gameState === 'PLAYING') {
                    e.preventDefault();
                    startThrust();
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
                if (gameState === 'PLAYING') {
                    e.preventDefault();
                    stopThrust();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState, startThrust, stopThrust]);

    if (isOnline || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-[#090a0f] text-white flex flex-col justify-between overflow-y-auto select-none p-5 sm:p-7"
            >
                {/* 1. TOP BRAND HEADER */}
                <header className="pt-safe flex items-center justify-between w-full max-w-md mx-auto">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1 rounded-xl bg-white/5 border border-white/10 shadow-sm">
                            <Logo size={24} />
                        </div>
                        <span className="text-sm font-extrabold tracking-tight text-white heading-apple">
                            Grip
                        </span>
                    </div>

                    {/* Offline Signal Badge */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-wider uppercase">
                            Offline
                        </span>
                    </div>
                </header>

                {/* 2. HERO STATEMENT: Clear, human, direct */}
                <div className="my-auto py-4 w-full max-w-md mx-auto flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 mb-3 shadow-inner">
                        <WifiOff size={26} className="text-red-400" />
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white heading-apple">
                        Grip is Offline
                    </h1>
                    <p className="text-xs text-text-muted mt-1.5 max-w-xs leading-relaxed">
                        No internet connection detected. Grip will automatically reconnect once your signal is restored.
                    </p>

                    {/* Quick Action Buttons */}
                    <div className="mt-5 w-full flex items-center gap-3">
                        <button
                            onClick={handleRetry}
                            disabled={isChecking}
                            className="flex-1 py-3 px-4 rounded-xl bg-white text-black font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={isChecking ? 'animate-spin' : ''} />
                            <span>{isChecking ? 'Reconnecting...' : 'Try Reconnecting'}</span>
                        </button>

                        <button
                            onClick={() => {
                                haptics.selection();
                                setDismissed(true);
                            }}
                            className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/90 font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5"
                        >
                            <span>Browse Cached</span>
                            <ArrowRight size={13} />
                        </button>
                    </div>

                    {/* 3. OPTIONAL MINI-GAME CARD ("Play if you wish") */}
                    <div className="mt-6 w-full rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 flex flex-col text-left">
                        {/* Mini-Game Header */}
                        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Gamepad2 size={14} className="text-sky-400" />
                                <span className="text-[11px] font-bold text-white/90">
                                    Play while you wait
                                </span>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 tabular-nums">
                                <Trophy size={11} />
                                <span>₹{highScore.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Interactive Arena */}
                        <div
                            ref={arenaRef}
                            onPointerDown={() => {
                                if (gameState === 'PLAYING') startThrust();
                                else if (gameState === 'IDLE') startGame();
                            }}
                            onPointerUp={stopThrust}
                            onPointerCancel={stopThrust}
                            className="relative w-full h-44 sm:h-48 rounded-xl bg-[#07080d] border border-white/5 overflow-hidden flex items-center justify-center cursor-pointer select-none touch-none"
                        >
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

                            {/* In-game live score */}
                            {gameState === 'PLAYING' && (
                                <div className="absolute top-2.5 inset-x-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-xl font-black text-white tabular-nums drop-shadow-md">
                                        ₹{score.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* IDLE: Play if you wish prompt */}
                            {gameState === 'IDLE' && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center">
                                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg mb-2 active:scale-95 transition-transform">
                                        <Play size={16} className="ml-0.5 fill-black" />
                                    </div>
                                    <p className="text-xs font-bold text-white">
                                        Tap to play Grip Glider
                                    </p>
                                    <p className="text-[10px] text-white/40 mt-0.5 font-medium">
                                        Hold to thrust upward • Collect ₹ coins
                                    </p>
                                </div>
                            )}

                            {/* GAMEOVER */}
                            {gameState === 'GAMEOVER' && (
                                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center">
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                                        Game Over
                                    </span>
                                    <span className="text-xl font-black text-white tabular-nums my-1">
                                        ₹{score.toLocaleString()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startGame();
                                        }}
                                        className="mt-1 px-3.5 py-1.5 rounded-full bg-white text-black font-extrabold text-[11px] flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                                    >
                                        <RotateCcw size={11} />
                                        <span>Play Again</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. FOOTER NOTE */}
                <footer className="pb-safe pt-2 text-center w-full max-w-md mx-auto">
                    <p className="text-[10px] text-white/30 font-medium">
                        Grip will automatically sync your data when back online
                    </p>
                </footer>
            </motion.div>
        </AnimatePresence>
    );
};
