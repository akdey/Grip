import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, Loader2, KeyRound } from 'lucide-react';
import { api } from '../../lib/api';

interface PasswordVerifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const PasswordVerifyModal: React.FC<PasswordVerifyModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await api.post('/auth/verify', { password });
            onSuccess();
            setPassword('');
            onClose();
        } catch (err: any) {
            setError('Incorrect password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[#121212] border border-white/10 rounded-3xl p-6 z-50 shadow-2xl shadow-purple-500/10"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/5">
                                    <Lock size={18} className="text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-none">Security Check</h3>
                                    <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-wider">Authentication Required</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <div className="relative">
                                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 pl-11 py-3.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all placeholder:text-gray-600"
                                        autoFocus
                                    />
                                </div>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-xs text-rose-400 ml-1 font-medium"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !password}
                                className="w-full bg-white text-black font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <span>Unlock Data</span>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
