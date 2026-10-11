import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, KeyRound, Fingerprint, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { haptics } from '../../lib/haptics';
import { useWealthVaultStore } from '../../lib/store';
import {
    getBiometricsStatus,
    unlockWithBiometrics,
    type BiometricsStatus
} from '../../lib/webauthn';

interface WealthVaultGateProps {
    children: React.ReactNode;
}

export const WealthVaultGate: React.FC<WealthVaultGateProps> = ({ children }) => {
    const { isVaultUnlocked, setVaultUnlocked } = useWealthVaultStore();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBioLoading, setIsBioLoading] = useState(false);
    const [bioStatus, setBioStatus] = useState<BiometricsStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [shakeKey, setShakeKey] = useState(0);
    const autoTriggeredRef = useRef(false);

    // Biometric unlock handler
    const handleBiometricUnlock = async () => {
        setError(null);
        setIsBioLoading(true);
        haptics.impact('light');

        try {
            const success = await unlockWithBiometrics();
            if (success) {
                haptics.notification('success');
                setVaultUnlocked(true);
            } else {
                setError('Biometric verification failed');
                setShakeKey(prev => prev + 1);
            }
        } catch (err: any) {
            console.warn('Vault biometric unlock error:', err);
            if (err?.message?.includes('cancel') || err?.message?.includes('abort')) {
                setError('Biometric authentication cancelled');
            } else {
                setError(err?.message || 'Biometric check failed. You can use your passphrase.');
                setShakeKey(prev => prev + 1);
            }
        } finally {
            setIsBioLoading(false);
        }
    };

    // Auto-trigger biometrics on page load if enrolled
    useEffect(() => {
        if (isVaultUnlocked) return;

        let isMounted = true;
        const isEnrolledLocally = localStorage.getItem('grip_biometrics_enrolled') === 'true';

        if (isEnrolledLocally && !autoTriggeredRef.current) {
            autoTriggeredRef.current = true;
            handleBiometricUnlock();
        }

        getBiometricsStatus().then((status) => {
            if (!isMounted) return;
            setBioStatus(status);

            if (status.hasBiometrics && status.platformAvailable && !autoTriggeredRef.current) {
                autoTriggeredRef.current = true;
                handleBiometricUnlock();
            }
        }).catch(() => {});

        return () => {
            isMounted = false;
        };
    }, [isVaultUnlocked]);

    // Passphrase submit handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;

        setError(null);
        setIsLoading(true);

        try {
            await api.post('/auth/verify', { password });
            haptics.notification('success');
            setVaultUnlocked(true);
            setPassword('');
        } catch {
            haptics.notification('error');
            setError('Incorrect passphrase');
            setShakeKey(prev => prev + 1);
        } finally {
            setIsLoading(false);
        }
    };

    if (isVaultUnlocked) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <motion.div
                key="vault-gate-dialog"
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    x: shakeKey > 0 ? [0, -10, 10, -8, 8, -4, 4, 0] : 0
                }}
                transition={{
                    type: 'spring',
                    damping: 28,
                    stiffness: 350,
                    mass: 0.8
                }}
                className="relative w-full max-w-md bg-raised/95 backdrop-blur-3xl border border-border-default rounded-[2.5rem] overflow-hidden z-20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col"
            >
                {/* Header matching PasswordVerifyModal */}
                <div className="p-6 sm:p-7 border-b border-border-subtle flex justify-between items-center bg-gradient-to-b from-white/[0.04] to-transparent shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent-text shadow-inner">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight heading-apple">
                                Wealth Vault Locked
                            </h3>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.1em] mt-0.5">
                                Authentication Required
                            </p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted">
                        <ShieldCheck size={16} />
                    </div>
                </div>

                <div className="p-6 sm:p-7 space-y-5">
                    {/* Option 1: Native Biometric Unlock Button (Matching Dashboard Modal) */}
                    {bioStatus?.hasBiometrics && (
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={handleBiometricUnlock}
                                disabled={isBioLoading}
                                className="w-full relative group overflow-hidden bg-accent-subtle/70 hover:bg-accent-subtle border border-accent-border/60 hover:border-accent-border p-4 rounded-2xl transition-all active:scale-[0.98] shadow-sm flex items-center justify-between gap-3 text-left touch-manipulation"
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-accent-text/10 border border-accent-text/20 flex items-center justify-center text-accent-text shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                        {isBioLoading ? (
                                            <Loader2 size={24} className="animate-spin text-accent-text" />
                                        ) : (
                                            <Fingerprint size={26} className="text-accent-text" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-primary truncate">
                                            {isBioLoading ? 'Scanning Sensor...' : `Unlock with ${bioStatus?.deviceType || 'Fingerprint'}`}
                                        </p>
                                        <p className="text-[10px] text-text-muted font-medium mt-0.5 truncate">
                                            Touch sensor to authenticate
                                        </p>
                                    </div>
                                </div>

                                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-accent-text shrink-0 shadow-xs">
                                    Auto
                                </span>
                            </button>

                            <div className="relative flex items-center justify-center py-1">
                                <div className="border-t border-border-subtle w-full" />
                                <span className="bg-raised px-3 text-[8.5px] font-black uppercase tracking-[2px] text-text-muted absolute">
                                    Or enter passphrase
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Option 2: Passphrase Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.08em] pl-1 select-none">
                                Vault Passphrase
                            </label>
                            <div className="relative">
                                <KeyRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="password"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-sunken border border-border-subtle rounded-2xl px-4 pl-11 py-3.5 text-base text-text-primary tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-accent-solid/30 focus:border-border-focus transition-all placeholder:text-text-disabled touch-manipulation"
                                    autoFocus={!bioStatus?.hasBiometrics}
                                />
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-xs text-status-danger-text font-medium pl-1 select-none"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !password.trim()}
                            className="w-full h-12 rounded-2xl bg-accent hover:opacity-95 text-accent-contrast font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin text-accent-contrast" />
                            ) : (
                                <>
                                    <Lock size={15} />
                                    <span>Unlock Wealth Vault</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};
