import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, Loader2, KeyRound } from 'lucide-react';
import { api } from '../../lib/api';
import { haptics } from '../../lib/haptics';

interface PasswordVerifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const PasswordVerifyModal: React.FC<PasswordVerifyModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shakeKey, setShakeKey] = useState(0);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await api.post('/auth/verify', { password });
            haptics.notification('success');
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
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
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
                        initial={{ opacity: 0, scale: 0.94, y: 8 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            x: shakeKey > 0 ? [0, -10, 10, -8, 8, -4, 4, 0] : 0
                        }}
                        exit={{ opacity: 0, scale: 0.94, y: 8 }}
                        transition={{
                            type: 'spring',
                            damping: 28,
                            stiffness: 350,
                            mass: 0.8
                        }}
                        className="relative w-full max-w-md bg-raised/95 backdrop-blur-3xl border border-border-default rounded-[2.5rem] overflow-hidden z-50 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-border-subtle flex justify-between items-center bg-gradient-to-b from-white/[0.04] to-transparent shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center border border-white/10 shadow-inner text-white">
                                    <Lock size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary tracking-tight heading-apple">Security Access</h3>
                                    <p className="text-[10px] text-text-muted font-semibold uppercase tracking-[0.1em] mt-0.5">Authentication Required</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    haptics.selection();
                                    onClose();
                                }}
                                className="w-10 h-10 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all touch-manipulation"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 sm:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2.5">
                                    <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-[0.08em] pl-1 select-none">
                                        Passphrase
                                    </label>
                                    <div className="relative">
                                        <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                        <input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-sunken border border-border-subtle rounded-2xl px-5 pl-12 py-4 text-base text-text-primary tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-accent-solid/30 focus:border-border-focus transition-all placeholder:text-text-disabled touch-manipulation"
                                            autoFocus
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
                                    disabled={isLoading || !password}
                                    className="w-full bg-white text-black font-bold uppercase tracking-wider text-xs py-4.5 rounded-2xl active:scale-[0.97] transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-3 shadow-xl touch-manipulation select-none"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Validating Key...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={16} />
                                            <span>Unlock Repository</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
