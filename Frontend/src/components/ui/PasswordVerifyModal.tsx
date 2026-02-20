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
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 0 }}
                        className="relative w-full max-w-md bg-[#050505] border border-white/10 rounded-[2.5rem] overflow-hidden z-50 shadow-[0_0_100px_rgba(168,85,247,0.15)] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 sm:p-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/5 shadow-inner">
                                    <Lock size={28} className="text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">Security Access</h3>
                                    <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-[4px]">Neural Key Required</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all shadow-xl"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 sm:p-10">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Passphrase</label>
                                    <div className="relative">
                                        <KeyRound size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" />
                                        <input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 pl-14 py-5 text-lg text-white tracking-[0.3em] focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all placeholder:text-gray-700"
                                            autoFocus
                                        />
                                    </div>
                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-xs text-rose-500 ml-1 font-bold uppercase tracking-widest"
                                        >
                                            {error}
                                        </motion.p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !password}
                                    className="w-full bg-white text-black font-black uppercase tracking-widest text-xs py-5 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 shadow-2xl shadow-white/5"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Validating Key...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={18} />
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
