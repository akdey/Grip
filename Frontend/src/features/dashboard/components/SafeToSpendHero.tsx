import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lock } from 'lucide-react';
import type { SafeToSpend } from '../hooks';

interface SafeToSpendHeroProps {
    safeToSpend: SafeToSpend | undefined;
    isLoading: boolean;
    showSensitive: boolean;
    formatCurrency: (amount: number) => string;
    onNavigate: () => void;
}

export const SafeToSpendHero: React.FC<SafeToSpendHeroProps> = memo(({
    safeToSpend,
    isLoading,
    showSensitive,
    formatCurrency,
    onNavigate
}) => {
    if (isLoading) {
        return (
            <div className="relative p-8 rounded-[3.5rem] bg-white/[0.01] border border-white/[0.05] overflow-hidden animate-pulse min-h-[400px] flex flex-col items-center">
                <div className="h-6 w-24 bg-white/[0.05] rounded-full mb-6" />
                <div className="h-16 w-48 bg-white/[0.05] rounded-lg mb-3" />
                <div className="h-3 w-40 bg-white/[0.05] rounded mb-8" />
                <div className="w-full max-w-[200px] h-1 bg-white/[0.05] rounded-full mb-10" />
                <div className="w-full grid grid-cols-2 gap-8 pt-8 border-t border-white/[0.05]">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-2 w-16 bg-white/[0.05] rounded" />
                        <div className="h-6 w-24 bg-white/[0.05] rounded" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-2 w-16 bg-white/[0.05] rounded" />
                        <div className="h-6 w-24 bg-white/[0.05] rounded" />
                    </div>
                </div>
            </div>
        );
    }

    const safe = Number(safeToSpend?.safe_to_spend || 0);
    const balance = Number(safeToSpend?.current_balance || 0);
    const status = safeToSpend?.status || 'success';

    const themes = {
        negative: {
            glow: 'bg-red-600/30',
            border: 'border-red-600/30',
            text: 'text-red-500',
            amountText: 'text-red-500',
            shadow: 'shadow-[0_40px_80px_-15px_rgba(220,38,38,0.25)]',
            pill: 'bg-red-600/20 text-red-400 border-red-600/30',
            bgIntensity: 'bg-red-600/10'
        },
        critical: {
            glow: 'bg-rose-500/20',
            border: 'border-rose-500/20',
            text: 'text-rose-400',
            amountText: 'text-rose-500',
            shadow: 'shadow-[0_40px_80px_-15px_rgba(225,29,72,0.15)]',
            pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            bgIntensity: 'bg-rose-500/5'
        },
        warning: {
            glow: 'bg-amber-500/20',
            border: 'border-amber-500/20',
            text: 'text-amber-400',
            amountText: 'text-white',
            shadow: 'shadow-[0_40px_80px_-15px_rgba(245,158,11,0.15)]',
            pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            bgIntensity: 'bg-amber-500/5'
        },
        success: {
            glow: 'bg-indigo-500/20',
            border: 'border-white/[0.08]',
            text: 'text-indigo-400',
            amountText: 'text-white',
            shadow: 'shadow-[0_40px_80px_-15px_rgba(79,70,229,0.2)]',
            pill: 'bg-white/[0.05] text-indigo-300 border-white/[0.05]',
            bgIntensity: 'bg-white/[0.01]'
        }
    };

    const theme = themes[status];

    return (
        <div
            className={`relative p-8 rounded-[3.5rem] bg-white/[0.01] backdrop-blur-3xl border ${theme.border} overflow-hidden ${theme.shadow} cursor-pointer group transition-all duration-700 hover:scale-[1.01] active:scale-[0.99]`}
            onClick={onNavigate}
        >
            <div className={`absolute -right-20 -top-20 w-80 h-80 ${theme.glow} rounded-full blur-[100px] opacity-50 group-hover:opacity-80 transition-all duration-700`} />
            <div className={`absolute -left-20 -bottom-20 w-64 h-64 ${theme.glow} rounded-full blur-[80px] opacity-30`} />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
                <div className={`flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border ${theme.pill} backdrop-blur-md`}>
                    <Sparkles size={12} aria-hidden="true" />
                    <h2 className="text-[10px] font-black uppercase tracking-[3px]">Safe Liquid</h2>
                </div>

                <h3 className={`text-6xl font-black tracking-tighter mb-3 ${theme.amountText} flex items-center justify-center gap-1`}>
                    {safe < 0 && <span className={theme.text}>-</span>}
                    <span>{formatCurrency(Math.abs(safe))}</span>
                </h3>

                <p className={`text-[11px] font-medium max-w-[240px] leading-relaxed ${status === 'negative' ? theme.text : 'text-gray-400'}`}>
                    {safeToSpend?.recommendation}
                </p>

                <div className="w-full max-w-[200px] mt-8 space-y-3">
                    <div className="h-1 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: Math.max(0, Math.min((safe / Math.max(balance, 1)), 1)) }}
                            style={{ transformOrigin: 'left' }}
                            transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                            className="h-full bg-gradient-to-r from-white to-white/60 shadow-[0_0_20px_rgba(255,255,255,0.3)] w-full"
                        />
                    </div>
                    <div className="flex justify-between text-[7px] font-black uppercase tracking-[2px] text-gray-400">
                        <span>Risk</span>
                        <span>Capacity</span>
                    </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-8 mt-10 border-t border-white/[0.05] pt-8">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Gross Liquid</p>
                            {!showSensitive && <Lock size={8} className="text-gray-400" aria-hidden="true" />}
                        </div>
                        <p className="text-xl font-black text-white/90">
                            {showSensitive ? formatCurrency(balance) : '******'}
                        </p>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Buffer</p>
                        <p className="text-xl font-black text-white/70">{formatCurrency(Number(safeToSpend?.buffer_amount || 0))}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});
