import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
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
            <div className="relative p-5 sm:p-7 rounded-[2.5rem] sm:rounded-[3rem] bg-surface-subtle border border-border-subtle overflow-hidden animate-pulse min-h-[380px] flex flex-col items-center">
                <div className="h-6 w-24 bg-surface-pill rounded-full mb-6" />
                <div className="h-16 w-48 bg-surface-pill rounded-lg mb-3" />
                <div className="h-3 w-40 bg-surface-pill rounded mb-8" />
                <div className="w-full max-w-xs sm:max-w-sm h-1.5 bg-surface-pill rounded-full mb-10" />
                <div className="w-full grid grid-cols-2 gap-8 pt-8 border-t border-border-subtle">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-2 w-16 bg-surface-pill rounded" />
                        <div className="h-6 w-24 bg-surface-pill rounded" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-2 w-16 bg-surface-pill rounded" />
                        <div className="h-6 w-24 bg-surface-pill rounded" />
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
            border: 'border-red-500/30',
            text: 'text-red-500 dark:text-red-400',
            amountText: 'text-red-500 dark:text-red-400',
            shadow: 'shadow-lg shadow-red-500/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
            pill: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
            dot: 'bg-red-500 dark:bg-red-400'
        },
        critical: {
            border: 'border-rose-500/30',
            text: 'text-rose-500 dark:text-rose-400',
            amountText: 'text-rose-500 dark:text-rose-400',
            shadow: 'shadow-lg shadow-rose-500/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
            pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
            dot: 'bg-rose-500 dark:bg-rose-400'
        },
        warning: {
            border: 'border-amber-500/20',
            text: 'text-amber-600 dark:text-amber-500',
            amountText: 'text-primary',
            shadow: 'shadow-lg shadow-amber-500/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)]',
            pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20',
            dot: 'bg-amber-500 dark:bg-amber-400'
        },
        success: {
            border: 'border-accent-border',
            text: 'text-primary',
            amountText: 'text-primary',
            shadow: 'shadow-lg shadow-black/[0.04] dark:shadow-[0_20px_50px_rgba(0,0,0,0.25)]',
            pill: 'bg-accent-subtle text-accent-text border-accent-border',
            dot: 'bg-emerald-500 dark:bg-emerald-400'
        }
    };

    const theme = themes[status];

    return (
        <div
            className={`relative p-5 sm:p-7 rounded-[2.5rem] sm:rounded-[3rem] bg-surface-subtle backdrop-blur-3xl border ${theme.border} overflow-hidden ${theme.shadow} cursor-pointer group transition-all duration-500 hover:border-accent-border/60 active:scale-[0.99]`}
            onClick={onNavigate}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
                <div className={`flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border ${theme.pill} backdrop-blur-md`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                    <h2 className="text-[10px] font-black uppercase tracking-[3px]">Safe Liquid</h2>
                </div>

                <h3 className={`text-5xl sm:text-6xl font-black tracking-tighter mb-3 ${theme.amountText} flex items-center justify-center gap-1`}>
                    {safe < 0 && <span className={theme.text}>-</span>}
                    <span>{formatCurrency(Math.abs(safe))}</span>
                </h3>

                <p className={`text-xs font-medium max-w-sm leading-relaxed px-2 ${status === 'negative' ? theme.text : 'text-text-muted'}`}>
                    {safeToSpend?.recommendation}
                </p>

                <div className="w-full max-w-xs sm:max-w-sm mt-7 space-y-2.5 px-2">
                    <div className="h-1.5 w-full bg-surface-pill rounded-full overflow-hidden border border-border-subtle">
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: Math.max(0, Math.min((safe / Math.max(balance, 1)), 1)) }}
                            style={{ transformOrigin: 'left' }}
                            transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                            className="h-full bg-gradient-to-r from-accent to-accent-hover shadow-[0_0_20px_var(--color-accent-subtle)] w-full"
                        />
                    </div>
                    <div className="flex justify-between text-[7px] font-black uppercase tracking-[2px] text-text-muted">
                        <span>Risk</span>
                        <span>Capacity</span>
                    </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-6 sm:gap-8 mt-8 border-t border-border-subtle pt-6">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 mb-1 opacity-60">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Gross Liquid</p>
                            {!showSensitive && <Lock size={8} className="text-text-muted" aria-hidden="true" />}
                        </div>
                        <p className="text-xl font-black text-primary">
                            {showSensitive ? formatCurrency(balance) : '******'}
                        </p>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1 opacity-60">Buffer</p>
                        <p className="text-xl font-black text-secondary">{formatCurrency(Number(safeToSpend?.buffer_amount || 0))}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});
