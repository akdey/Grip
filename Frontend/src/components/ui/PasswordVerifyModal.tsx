import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, Loader2, KeyRound, Fingerprint, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { haptics } from '../../lib/haptics';
import {
    checkBiometricsSupport,
    getBiometricsStatus,
    unlockWithBiometrics,
    registerBiometricCredential,
    type BiometricsStatus
} from '../../lib/webauthn';

interface PasswordVerifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const PasswordVerifyModal: React.FC<PasswordVerifyModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBioLoading, setIsBioLoading] = useState(false);
    const [bioStatus, setBioStatus] = useState<BiometricsStatus | null>(null);
    const [enableBiometricsOnPass, setEnableBiometricsOnPass] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shakeKey, setShakeKey] = useState(0);
    const autoTriggeredRef = useRef(false);

    // Handle Native Fingerprint / Biometric Unlock
    const handleBiometricUnlock = async () => {
        setError(null);
        setIsBioLoading(true);
        haptics.impact('light');

        try {
            const success = await unlockWithBiometrics();
            if (success) {
                haptics.notification('success');
                onSuccess();
                onClose();
            } else {
                setError('Biometric verification failed');
            }
        } catch (err: any) {
            console.warn('Biometric unlock issue:', err);
            // If user simply cancelled the prompt, keep it clean
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

    // Check biometrics capability & auto-trigger native fingerprint sensor when modal opens
    useEffect(() => {
        if (!isOpen) {
            autoTriggeredRef.current = false;
            return;
        }
        setError(null);
        setPassword('');

        let isMounted = true;
        const isEnrolledLocally = localStorage.getItem('grip_biometrics_enrolled') === 'true';

        // Instant fast-path: If biometrics are enrolled on this device, trigger sensor immediately
        // Zero arbitrary delays and zero waiting for serial /status network round-trip
        if (isEnrolledLocally && !autoTriggeredRef.current) {
            autoTriggeredRef.current = true;
            handleBiometricUnlock();
        }

        // Concurrently fetch/refresh status for device details & fallback
        getBiometricsStatus().then((status) => {
            if (!isMounted) return;
            setBioStatus(status);

            // Fallback trigger if not caught by local fast-path
            if (status.hasBiometrics && status.platformAvailable && !autoTriggeredRef.current) {
                autoTriggeredRef.current = true;
                handleBiometricUnlock();
            }
        }).catch(() => {
            // Graceful fallback to password
        });

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    // Escape key dismiss
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

    // Enroll fingerprint right from the modal if supported
    const handleEnrollBiometrics = async () => {
        setIsBioLoading(true);
        setError(null);
        haptics.selection();

        try {
            await registerBiometricCredential();
            haptics.notification('success');
            setBioStatus(prev => prev ? { ...prev, hasBiometrics: true } : null);
            // After successful enrollment, immediately unlock
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to register fingerprint');
            setShakeKey(prev => prev + 1);
        } finally {
            setIsBioLoading(false);
        }
    };

    // Standard Passphrase Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await api.post('/auth/verify', { password });
            haptics.notification('success');

            // If user checked "Enable Fingerprint", trigger enrollment right now
            if (enableBiometricsOnPass && bioStatus?.platformAvailable) {
                try {
                    await registerBiometricCredential();
                } catch (bioErr) {
                    console.warn('Could not enroll fingerprint after pass:', bioErr);
                }
            }

            onSuccess();
            setPassword('');
            onClose();
        } catch {
            haptics.notification('error');
            setError('Incorrect password');
            setShakeKey(prev => prev + 1);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            haptics.selection();
                            onClose();
                        }}
                        className="absolute inset-0 bg-overlay backdrop-blur-md"
                    />

                    {/* Modal Dialog with Apple Spring Physics */}
                    <motion.div
                        key="modal-dialog"
                        initial={{ opacity: 0, scale: 0.94, y: 12 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            x: shakeKey > 0 ? [0, -10, 10, -8, 8, -4, 4, 0] : 0
                        }}
                        exit={{ opacity: 0, scale: 0.94, y: 12 }}
                        transition={{
                            type: 'spring',
                            damping: 28,
                            stiffness: 350,
                            mass: 0.8
                        }}
                        className="relative w-full max-w-md bg-raised/95 backdrop-blur-3xl border border-border-default rounded-[2.5rem] overflow-hidden z-50 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 sm:p-7 border-b border-border-subtle flex justify-between items-center bg-gradient-to-b from-white/[0.04] to-transparent shrink-0">
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent-text shadow-inner">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight heading-apple">
                                        Security Access
                                    </h3>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.1em] mt-0.5">
                                        Authentication Required
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    haptics.selection();
                                    onClose();
                                }}
                                className="w-9 h-9 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all touch-manipulation"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 sm:p-7 space-y-5">
                            {/* Option 1: Native Fingerprint Unlock Button (When Enrolled) */}
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
                                        Passphrase
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

                                {/* Option 3: Quick Enroll Checkbox if Platform Supports Biometrics */}
                                {bioStatus?.platformAvailable && !bioStatus.hasBiometrics && (
                                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-subtle border border-border-subtle/80 cursor-pointer text-left select-none active:scale-[0.99] transition-transform">
                                        <input
                                            type="checkbox"
                                            checked={enableBiometricsOnPass}
                                            onChange={(e) => setEnableBiometricsOnPass(e.target.checked)}
                                            className="w-4 h-4 rounded text-accent-text focus:ring-accent-solid/30 cursor-pointer"
                                        />
                                        <div className="min-w-0 flex items-center gap-1.5">
                                            <Fingerprint size={14} className="text-accent-text shrink-0" />
                                            <span className="text-[11px] font-bold text-text-secondary truncate">
                                                Enable {bioStatus?.deviceType || 'Fingerprint'} Unlock for this device
                                            </span>
                                        </div>
                                    </label>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || !password}
                                    className="w-full bg-primary text-text-inverse font-bold uppercase tracking-wider text-xs py-3.5 rounded-2xl active:scale-[0.97] transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2.5 shadow-md touch-manipulation select-none"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Validating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={15} />
                                            <span>Unlock Repository</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Direct Enroll Button if Supported but Not Enrolled */}
                            {bioStatus?.platformAvailable && !bioStatus.hasBiometrics && (
                                <div className="pt-1 text-center">
                                    <button
                                        type="button"
                                        onClick={handleEnrollBiometrics}
                                        disabled={isBioLoading}
                                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent-text hover:underline active:scale-95 transition-all"
                                    >
                                        <Fingerprint size={13} />
                                        <span>Set up {bioStatus?.deviceType || 'Fingerprint'} sensor now</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
