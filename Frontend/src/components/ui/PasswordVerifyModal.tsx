import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, Loader2, KeyRound, Fingerprint, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { haptics } from '../../lib/haptics';
import {
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
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [enableBiometricsOnPass, setEnableBiometricsOnPass] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shakeKey, setShakeKey] = useState(0);
    const autoTriggeredRef = useRef(false);

    // Native Biometric Unlock
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
                setShakeKey(prev => prev + 1);
            }
        } catch (err: any) {
            console.warn('Biometric unlock issue:', err);
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

    // Check biometrics capability & auto-trigger when modal opens
    useEffect(() => {
        if (!isOpen) {
            autoTriggeredRef.current = false;
            return;
        }
        setError(null);
        setPassword('');
        setShowPassphrase(false);

        let isMounted = true;
        const isEnrolledLocally = localStorage.getItem('grip_biometrics_enrolled') === 'true';

        if (isEnrolledLocally && !autoTriggeredRef.current) {
            autoTriggeredRef.current = true;
            handleBiometricUnlock();
        }

        getBiometricsStatus().then((status) => {
            if (!isMounted) return;
            setBioStatus(status);

            if (!status.hasBiometrics) {
                setShowPassphrase(true);
            }

            if (status.hasBiometrics && status.platformAvailable && !autoTriggeredRef.current) {
                autoTriggeredRef.current = true;
                handleBiometricUnlock();
            }
        }).catch(() => {
            setShowPassphrase(true);
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

    // Passphrase Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;

        setError(null);
        setIsLoading(true);

        try {
            await api.post('/auth/verify', { password });
            haptics.notification('success');

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
            setError('Incorrect passphrase');
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

                    {/* Modal Dialog mirroring Wealth Security styling */}
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
                        className="relative w-full max-w-md bg-raised/95 backdrop-blur-3xl border border-border-default rounded-3xl sm:rounded-[2.5rem] p-7 sm:p-8 overflow-hidden z-50 shadow-[0_20px_60px_rgba(0,0,0,0.7)] text-center flex flex-col items-center"
                    >
                        {/* Ambient decorative glow */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent-subtle/50 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent-subtle/50 rounded-full blur-3xl pointer-events-none" />

                        {/* Top Close Button */}
                        <button
                            onClick={() => {
                                haptics.selection();
                                onClose();
                            }}
                            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all z-10 touch-manipulation"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>

                        <div className="relative z-10 w-full flex flex-col items-center space-y-5">
                            {/* Vault Emblem with Shield Badge matching Wealth Security */}
                            <div className="relative">
                                <div className="w-20 h-20 rounded-2xl bg-surface-pill border border-border-subtle flex items-center justify-center text-primary shadow-inner">
                                    <Lock size={34} className="text-primary" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-accent-contrast flex items-center justify-center shadow-lg border-2 border-surface">
                                    <ShieldCheck size={16} strokeWidth={2.5} />
                                </div>
                            </div>

                            {/* Title & Tag */}
                            <div className="space-y-1.5">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-subtle border border-accent-border/50 text-[9px] font-black uppercase tracking-widest text-accent-text mb-0.5">
                                    <Sparkles size={11} />
                                    Security Verification
                                </div>
                                <h3 className="text-2xl font-black text-text-primary tracking-tight heading-apple">
                                    Security Access
                                </h3>
                                <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                                    Authenticate to view sensitive financial balances and protected records.
                                </p>
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full p-3 rounded-xl bg-status-danger-bg border border-status-danger-border text-status-danger-text text-xs text-center font-medium"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Main Content: Biometrics or Passphrase Form */}
                            <div className="w-full space-y-3 pt-1">
                                {!showPassphrase && bioStatus?.hasBiometrics ? (
                                    <>
                                        {/* Primary Action: Biometric Unlock */}
                                        <button
                                            type="button"
                                            onClick={handleBiometricUnlock}
                                            disabled={isBioLoading}
                                            className="w-full h-12 rounded-xl bg-primary text-text-inverse font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-all hover:opacity-90 disabled:opacity-50 touch-manipulation"
                                        >
                                            {isBioLoading ? (
                                                <Loader2 size={18} className="animate-spin text-text-inverse" />
                                            ) : (
                                                <Fingerprint size={18} />
                                            )}
                                            <span>
                                                {isBioLoading ? 'Scanning Sensor...' : `Unlock with ${bioStatus?.deviceType || 'Biometrics'}`}
                                            </span>
                                        </button>

                                        {/* Secondary Action: Enter Passphrase */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                haptics.selection();
                                                setShowPassphrase(true);
                                            }}
                                            className="w-full h-11 rounded-xl bg-surface-subtle hover:bg-surface-hover text-text-secondary hover:text-text-primary font-bold text-xs uppercase tracking-wider border border-border-subtle flex items-center justify-center gap-2 active:scale-[0.98] transition-all touch-manipulation"
                                        >
                                            <KeyRound size={16} />
                                            Enter Passphrase
                                        </button>
                                    </>
                                ) : (
                                    /* Passphrase Form */
                                    <form onSubmit={handleSubmit} className="space-y-3 text-left">
                                        <div className="space-y-1.5">
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
                                                    className="w-full bg-sunken border border-border-subtle rounded-2xl px-4 pl-11 py-3 text-base text-text-primary tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-accent-solid/30 focus:border-border-focus transition-all placeholder:text-text-disabled touch-manipulation"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        {/* Quick Enroll Checkbox */}
                                        {bioStatus?.platformAvailable && !bioStatus.hasBiometrics && (
                                            <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-subtle border border-border-subtle/80 cursor-pointer text-left select-none active:scale-[0.99] transition-transform">
                                                <input
                                                    type="checkbox"
                                                    checked={enableBiometricsOnPass}
                                                    onChange={(e) => setEnableBiometricsOnPass(e.target.checked)}
                                                    className="w-4 h-4 rounded text-accent-text focus:ring-accent-solid/30 cursor-pointer"
                                                />
                                                <div className="min-w-0 flex items-center gap-1.5">
                                                    <Fingerprint size={13} className="text-accent-text shrink-0" />
                                                    <span className="text-[10px] font-bold text-text-secondary truncate">
                                                        Enable {bioStatus?.deviceType || 'Biometrics'} for this device
                                                    </span>
                                                </div>
                                            </label>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isLoading || !password.trim()}
                                            className="w-full h-12 rounded-xl bg-primary text-text-inverse font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all hover:opacity-90 disabled:opacity-40 touch-manipulation"
                                        >
                                            {isLoading ? (
                                                <Loader2 size={16} className="animate-spin text-text-inverse" />
                                            ) : (
                                                <>
                                                    <Lock size={15} />
                                                    <span>Unlock Access</span>
                                                </>
                                            )}
                                        </button>

                                        {/* Back to Biometrics if available */}
                                        {bioStatus?.hasBiometrics && (
                                            <div className="text-center pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        haptics.selection();
                                                        setShowPassphrase(false);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent-text hover:underline active:scale-95 transition-all"
                                                >
                                                    <Fingerprint size={13} />
                                                    <span>Use {bioStatus?.deviceType || 'Biometrics'} instead</span>
                                                </button>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
