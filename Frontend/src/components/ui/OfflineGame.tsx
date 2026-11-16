import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Trophy, ArrowRight, Play, RotateCcw } from 'lucide-react';
import { haptics } from '../../lib/haptics';

interface Obstacle {
    x: number;
    y: number;
    width: number;
    height: number;
    passed: boolean;
}

interface Coin {
    x: number;
    y: number;
    radius: number;
    collected: boolean;
}

export const OfflineGame: React.FC = () => {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
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

    // Game physics state stored in refs for 60fps loop
    const stateRef = useRef({
        playerY: 130,
        playerVelocity: 0,
        gravity: 0.58,
        jumpStrength: -10.5,
        isGrounded: true,
        obstacles: [] as Obstacle[],
        coins: [] as Coin[],
        score: 0,
        speed: 4.2,
        frameCount: 0,
        groundY: 140,
    });

    // Check connectivity
    const handleRetry = useCallback(async () => {
        setIsChecking(true);
        haptics.selection();
        try {
            // Quick ping to check true network connectivity
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

    const jump = useCallback(() => {
        const s = stateRef.current;
        if (s.isGrounded) {
            s.playerVelocity = s.jumpStrength;
            s.isGrounded = false;
            haptics.impact('light');
        }
    }, []);

    const startGame = useCallback(() => {
        const s = stateRef.current;
        s.playerY = 130;
        s.playerVelocity = 0;
        s.isGrounded = true;
        s.obstacles = [];
        s.coins = [];
        s.score = 0;
        s.speed = 4.2;
        s.frameCount = 0;

        setScore(0);
        setGameState('PLAYING');
        haptics.impact('medium');
    }, []);

    // Main 60fps Canvas Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let active = true;

        const loop = () => {
            if (!active) return;
            const s = stateRef.current;
            s.frameCount++;

            const width = canvas.width;
            const height = canvas.height;

            // Clear frame
            ctx.clearRect(0, 0, width, height);

            // 1. Draw Starfield / Financial Grid Background
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            const gridOffset = (s.frameCount * (s.speed * 0.5)) % 40;
            for (let x = -gridOffset; x < width; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }

            // 2. Draw Neon Ground Line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, s.groundY + 20);
            ctx.lineTo(width, s.groundY + 20);
            ctx.stroke();

            // 3. Update Player Physics
            s.playerVelocity += s.gravity;
            s.playerY += s.playerVelocity;

            if (s.playerY >= s.groundY) {
                s.playerY = s.groundY;
                s.playerVelocity = 0;
                s.isGrounded = true;
            }

            // 4. Draw Player (Grip Shield Token)
            const playerX = 45;
            const playerY = s.playerY;
            const playerSize = 22;

            // Glow effect
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 12;

            // Outer Shield
            ctx.fillStyle = '#2563eb';
            ctx.beginPath();
            ctx.roundRect(playerX - playerSize / 2, playerY - playerSize / 2, playerSize, playerSize, 6);
            ctx.fill();

            // Inner Accent Ring
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('₹', playerX, playerY + 1);

            // 5. Spawn Obstacles (Expense Spikes)
            if (s.frameCount % 95 === 0) {
                const obsHeight = 22 + Math.random() * 18;
                s.obstacles.push({
                    x: width,
                    y: s.groundY + 20 - obsHeight,
                    width: 16,
                    height: obsHeight,
                    passed: false,
                });
            }

            // 6. Spawn Coins (Rupee Buffers)
            if (s.frameCount % 120 === 0) {
                s.coins.push({
                    x: width + 50,
                    y: s.groundY - 30 - Math.random() * 40,
                    radius: 9,
                    collected: false,
                });
            }

            // 7. Update & Draw Obstacles
            for (let i = s.obstacles.length - 1; i >= 0; i--) {
                const obs = s.obstacles[i];
                obs.x -= s.speed;

                // Draw Red Hazard Spike
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(obs.x, s.groundY + 20);
                ctx.lineTo(obs.x + obs.width / 2, obs.y);
                ctx.lineTo(obs.x + obs.width, s.groundY + 20);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;

                // Score for passing obstacle
                if (!obs.passed && obs.x < playerX) {
                    obs.passed = true;
                    s.score += 50;
                    setScore(s.score);
                }

                // Collision Detection with Player
                const hitBoxShrink = 4;
                if (
                    playerX + playerSize / 2 - hitBoxShrink > obs.x &&
                    playerX - playerSize / 2 + hitBoxShrink < obs.x + obs.width &&
                    playerY + playerSize / 2 - hitBoxShrink > obs.y
                ) {
                    // Game Over
                    haptics.notification('error');
                    setGameState('GAMEOVER');
                    setHighScore((prev) => {
                        const newHigh = Math.max(prev, s.score);
                        try {
                            localStorage.setItem('grip_offline_highscore', String(newHigh));
                        } catch {}
                        return newHigh;
                    });
                    return;
                }

                // Cleanup off-screen
                if (obs.x < -30) {
                    s.obstacles.splice(i, 1);
                }
            }

            // 8. Update & Draw Coins
            for (let i = s.coins.length - 1; i >= 0; i--) {
                const c = s.coins[i];
                c.x -= s.speed;

                if (!c.collected) {
                    // Draw Golden Rupee Coin
                    ctx.fillStyle = '#f59e0b';
                    ctx.shadowColor = '#f59e0b';
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 9px Inter, system-ui';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('₹', c.x, c.y + 0.5);

                    // Coin Collision
                    const dist = Math.hypot(playerX - c.x, playerY - c.y);
                    if (dist < playerSize / 2 + c.radius) {
                        c.collected = true;
                        s.score += 100;
                        setScore(s.score);
                        haptics.selection();
                    }
                }

                if (c.x < -30 || c.collected) {
                    s.coins.splice(i, 1);
                }
            }

            // Increase speed gradually
            if (s.frameCount % 300 === 0 && s.speed < 8.5) {
                s.speed += 0.35;
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);

        return () => {
            active = false;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [gameState]);

    // Handle touch & keyboard controls
    useEffect(() => {
        if (!isOnline && !dismissed) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.code === 'Space') {
                    e.preventDefault();
                    if (gameState === 'PLAYING') jump();
                    else startGame();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOnline, dismissed, gameState, jump, startGame]);

    if (isOnline || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col justify-between p-5 pb-safe overflow-hidden select-none"
            >
                {/* Header */}
                <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                            <WifiOff size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black tracking-tight text-white uppercase heading-apple">
                                Signal Lost
                            </h2>
                            <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
                                Grip Vault Runner
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleRetry}
                        disabled={isChecking}
                        className="px-3.5 py-1.5 rounded-full bg-surface-subtle border border-border-subtle hover:bg-surface-hover text-xs font-bold text-text-primary flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
                        <span>{isChecking ? 'Reconnecting...' : 'Reconnect'}</span>
                    </button>
                </div>

                {/* Game Container */}
                <div className="my-auto w-full max-w-md mx-auto flex flex-col items-center">
                    {/* Live Scoreboard */}
                    <div className="w-full flex items-center justify-between px-2 mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-white tabular-nums">
                            <span className="text-[10px] text-text-muted uppercase tracking-wider">Score:</span>
                            <span>₹{score.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 tabular-nums">
                            <Trophy size={13} />
                            <span>₹{highScore.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div
                        onClick={() => {
                            if (gameState === 'PLAYING') jump();
                            else startGame();
                        }}
                        className="w-full h-48 bg-gradient-to-b from-surface/30 to-surface/80 border border-border-subtle rounded-3xl relative overflow-hidden flex items-center justify-center cursor-pointer touch-manipulation active:scale-[0.99] transition-transform shadow-2xl"
                    >
                        <canvas
                            ref={canvasRef}
                            width={360}
                            height={192}
                            className="w-full h-full block"
                        />

                        {/* IDLE / START OVERLAY */}
                        {gameState === 'IDLE' && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-primary text-text-inverse flex items-center justify-center shadow-lg mb-2 animate-bounce">
                                    <Play size={22} className="ml-0.5" />
                                </div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                    Tap to Jump & Dodge Hazards
                                </h3>
                                <p className="text-[10px] text-text-muted mt-1 font-medium max-w-[220px]">
                                    Collect golden ₹ coins and avoid red inflation spikes while signal reconnects.
                                </p>
                            </div>
                        )}

                        {/* GAMEOVER OVERLAY */}
                        {gameState === 'GAMEOVER' && (
                            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200">
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
                                    Vault Breached
                                </p>
                                <p className="text-xl font-black text-white tabular-nums mb-3">
                                    ₹{score.toLocaleString()}
                                </p>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startGame();
                                    }}
                                    className="px-4 py-2 rounded-full bg-primary text-text-inverse text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-md transition-all"
                                >
                                    <RotateCcw size={13} />
                                    <span>Play Again</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <p className="text-[10px] text-text-muted font-medium mt-3 tracking-wide">
                        {gameState === 'PLAYING' ? 'Tap anywhere to jump' : 'Press Space or Tap to Play'}
                    </p>
                </div>

                {/* Footer Controls */}
                <div className="flex flex-col items-center gap-2 pb-2">
                    <button
                        onClick={() => {
                            haptics.selection();
                            setDismissed(true);
                        }}
                        className="text-xs text-text-muted hover:text-text-primary font-medium transition-colors underline decoration-border-subtle hover:decoration-text-primary underline-offset-4 flex items-center gap-1"
                    >
                        <span>Continue browsing cached pages</span>
                        <ArrowRight size={13} />
                    </button>
                    <p className="text-[9px] text-text-muted/40 font-mono tracking-wider">
                        Grip Offline Resilience Engine
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
