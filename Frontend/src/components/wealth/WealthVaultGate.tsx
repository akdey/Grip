import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Fingerprint, Lock, KeyRound, Sparkles } from 'lucide-react';
import { useWealthVaultStore } from '../../lib/store';
import {
    getDeviceBiometricName,
    unlockWithBiometrics,
    checkBiometricsSupport
} from '../../lib/webauthn';
import { haptics } from '../../lib/haptics';
import { PasswordVerifyModal } from '../ui/PasswordVerifyModal';

interface WealthVaultGateProps {
    children: React.ReactNode;
}

export const WealthVaultGate: React.FC<WealthVaultGateProps> = ({ children }) => {
    const { isVaultUnlocked, setVaultUnlocked } = useWealthVaultStore();
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [hasBiometricHardware, setHasBiometricHardware] = useState(true);
    const autoTriggeredRef = useRef(false);

    const biometricName = getDeviceBiometricName();

    // Check hardware support once on mount
    useEffect(() => {
        checkBiometricsSupport().then((res) => {
            setHasBiometricHardware(res.platformAvailable);
        }).catch(() => {});
    }, []);

    // Fast-path: Auto-trigger biometric prompt immediately upon landing on Wealth
    useEffect(() => {
        if (isVaultUnlocked || autoTriggeredRef.current) return;

        const isEnrolled = localStorage.getItem('grip_biometrics_enrolled') === 'true';
        if (isEnrolled) {
            autoTriggeredRef.current = true;
            handleBiometricUnlock();
        }
    }, [isVaultUnlocked]);

    const handleBiometricUnlock = async () => {
        setError(null);
        setIsAuthenticating(true);
        haptics.impact('light');

        try {
            const success = await unlockWithBiometrics();
            if (success) {
                haptics.notification('success');
                setVaultUnlocked(true);
            } else {
                setError('Biometric authentication failed. Please try again or use your passphrase.');
            }
        } catch (err: any) {
            console.warn('Vault biometric unlock error:', err);
            if (err?.message?.includes('cancel') || err?.message?.includes('abort')) {
                setError(null);
            } else {
                setError(err?.message || 'Biometric check failed. You can unlock with your passphrase.');
            }
        } finally {
            setIsAuthenticating(false);
        }
    };

    if (isVaultUnlocked) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full max-w-md bg-raised/95 backdrop-blur-3xl border border-border-default rounded-3xl sm:rounded-[2.5rem] p-7 sm:p-8 relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] text-center flex flex-col items-center"
            >
                {/* Background decorative glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent-subtle/50 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent-subtle/50 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 w-full flex flex-col items-center space-y-5">
                    {/* Vault Icon with Shield Badge */}
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-surface-pill border border-border-subtle flex items-center justify-center text-primary shadow-inner">
                            <Lock size={34} className="text-primary" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-accent-contrast flex items-center justify-center shadow-lg border-2 border-surface">
                            <ShieldCheck size={16} strokeWidth={2.5} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-subtle border border-accent-border/50 text-[9px] font-black uppercase tracking-widest text-accent-text mb-0.5">
                            <Sparkles size={11} />
                            Encrypted Financial Vault
                        </div>
                        <h2 className="text-2xl font-black text-text-primary tracking-tight heading-apple">
                            Wealth Vault Locked
                        </h2>
                        <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                            Your investment holdings, folios, and net worth calculations are protected under biometric security.
                        </p>
                    </div>

                    {error && (
                        <div className="w-full p-3 rounded-xl bg-status-danger-bg border border-status-danger-border text-status-danger-text text-xs text-center font-medium">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="w-full space-y-2.5 pt-1">
                        {hasBiometricHardware && (
                            <button
                                onClick={handleBiometricUnlock}
                                disabled={isAuthenticating}
                                className="w-full h-12 rounded-xl bg-primary text-text-inverse font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-all hover:opacity-90 disabled:opacity-50 touch-manipulation"
                            >
                                <Fingerprint size={18} className={isAuthenticating ? 'animate-pulse' : ''} />
                                {isAuthenticating ? 'Scanning...' : `Unlock with ${biometricName}`}
                            </button>
                        )}

                        <button
                            onClick={() => {
                                haptics.selection();
                                setShowPasswordModal(true);
                            }}
                            className="w-full h-11 rounded-xl bg-surface-subtle hover:bg-surface-hover text-text-secondary hover:text-text-primary font-bold text-xs uppercase tracking-wider border border-border-subtle flex items-center justify-center gap-2 active:scale-[0.98] transition-all touch-manipulation"
                        >
                            <KeyRound size={16} />
                            Enter Passphrase
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Passphrase Fallback Modal (Matches the exact same visual identity) */}
            <PasswordVerifyModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                onSuccess={() => {
                    setShowPasswordModal(false);
                    setVaultUnlocked(true);
                }}
            />
        </div>
    );
};
