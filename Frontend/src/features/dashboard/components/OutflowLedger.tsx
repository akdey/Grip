import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';

interface OutflowLedgerProps {
    currentExpense: number;       // Accrual View: SUM(DIRECT_EXPENSE) + SUM(CREDIT_EXPENSE)
    priorSettlement: number;      // Prior Settlement: SUM(DEBT_TRANSFER)
    directExpense?: number;       // SUM(DIRECT_EXPENSE)
    creditExpense?: number;       // SUM(CREDIT_EXPENSE)
    cashOutflow?: number;         // Cash Outflow: SUM(DIRECT_EXPENSE) + SUM(DEBT_TRANSFER)
    isLoading: boolean;
    formatCurrency: (amount: number) => string;
}

export const OutflowLedger: React.FC<OutflowLedgerProps> = memo(({
    currentExpense,
    priorSettlement,
    directExpense,
    creditExpense,
    cashOutflow,
    isLoading,
    formatCurrency
}) => {
    const [viewMode, setViewMode] = useState<'ACCRUAL' | 'CASH'>('ACCRUAL');

    if (isLoading) {
        return (
            <div className="bg-surface-subtle border border-border-subtle p-5 rounded-[2rem] flex flex-col gap-4 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-3 w-28 bg-surface-pill rounded" />
                    <div className="h-6 w-32 bg-surface-pill rounded-xl" />
                </div>
                <div className="space-y-4 my-1">
                    <div className="space-y-2">
                        <div className="flex justify-between"><div className="h-2.5 w-24 bg-surface-pill rounded" /><div className="h-2.5 w-16 bg-surface-pill rounded" /></div>
                        <div className="h-1.5 w-full bg-surface-pill rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between"><div className="h-2.5 w-24 bg-surface-pill rounded" /><div className="h-2.5 w-16 bg-surface-pill rounded" /></div>
                        <div className="h-1.5 w-full bg-surface-pill rounded-full" />
                    </div>
                </div>
            </div>
        );
    }

    // Resolve unified direct expense (Bank & Cash Spends)
    const resolvedDirect = directExpense !== undefined ? directExpense : Math.max(0, currentExpense - (creditExpense || 0));
    const resolvedCredit = creditExpense !== undefined ? creditExpense : Math.max(0, currentExpense - resolvedDirect);
    const resolvedCashDrain = cashOutflow !== undefined ? cashOutflow : (resolvedDirect + priorSettlement);

    const isAccrual = viewMode === 'ACCRUAL';
    const activeTotal = isAccrual ? currentExpense : resolvedCashDrain;
    const maxVal = Math.max(activeTotal, 1);

    const calcPct = (val: number) => {
        if (activeTotal <= 0) return '0%';
        return `${Math.round((val / maxVal) * 100)}%`;
    };

    return (
        <div className="bg-surface-subtle border border-border-subtle p-5 sm:p-6 rounded-[2rem] flex flex-col gap-5 relative overflow-hidden transition-all">
            {/* Header: Title + Perspective Switcher */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-[10px] font-black text-text-muted uppercase tracking-[2.5px]">Outflow Ledger</h2>
                    <p className="text-[8px] text-text-muted font-semibold uppercase tracking-wider mt-0.5">
                        {isAccrual ? 'Expenses Incurred' : 'Actual Cash Drain'}
                    </p>
                </div>

                {/* Minimal Segmented Toggle */}
                <div className="flex items-center bg-surface-pill p-1 rounded-xl border border-border-subtle shrink-0">
                    <button
                        onClick={() => setViewMode('ACCRUAL')}
                        className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-lg transition-all ${
                            isAccrual
                                ? 'bg-accent-subtle text-accent-text border border-accent-border font-semibold shadow-sm'
                                : 'text-text-muted hover:text-primary'
                        }`}
                    >
                        Accrual
                    </button>
                    <button
                        onClick={() => setViewMode('CASH')}
                        className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-lg transition-all ${
                            !isAccrual
                                ? 'bg-accent-subtle text-accent-text border border-accent-border font-semibold shadow-sm'
                                : 'text-text-muted hover:text-primary'
                        }`}
                    >
                        Cash Drain
                    </button>
                </div>
            </div>

            {/* Active Total Display */}
            <div className="flex items-baseline justify-between pt-1 border-b border-border-subtle pb-4">
                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                    {isAccrual ? 'Total Incurred Spend' : 'Total Liquid Outflow'}
                </span>
                <span className="text-lg font-black text-primary tracking-tight">
                    {formatCurrency(activeTotal)}
                </span>
            </div>

            {/* Breakdown Bars */}
            <div className="space-y-4">
                {isAccrual ? (
                    <>
                        {/* Direct Bank Expenses */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-secondary tracking-wide">
                                    Direct Bank Expenses
                                    <span className="text-[9px] text-text-muted ml-1.5 font-normal">({calcPct(resolvedDirect)})</span>
                                </span>
                                <span className="font-black text-primary">{formatCurrency(resolvedDirect)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-pill rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: Math.min(1, resolvedDirect / maxVal) }}
                                    style={{ transformOrigin: 'left' }}
                                    className="h-full bg-accent rounded-full w-full"
                                />
                            </div>
                        </div>

                        {/* Credit Card Incurred */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-secondary tracking-wide">
                                    Credit Card Swipes
                                    <span className="text-[9px] text-text-muted ml-1.5 font-normal">({calcPct(resolvedCredit)})</span>
                                </span>
                                <span className="font-black text-primary">{formatCurrency(resolvedCredit)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-pill rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: Math.min(1, resolvedCredit / maxVal) }}
                                    style={{ transformOrigin: 'left' }}
                                    className="h-full bg-secondary/50 rounded-full w-full"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Direct Bank Expenses */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-secondary tracking-wide">
                                    Direct Bank Expenses
                                    <span className="text-[9px] text-text-muted ml-1.5 font-normal">({calcPct(resolvedDirect)})</span>
                                </span>
                                <span className="font-black text-primary">{formatCurrency(resolvedDirect)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-pill rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: Math.min(1, resolvedDirect / maxVal) }}
                                    style={{ transformOrigin: 'left' }}
                                    className="h-full bg-accent rounded-full w-full"
                                />
                            </div>
                        </div>

                        {/* Prior Debt Settlement */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-secondary tracking-wide">
                                    Credit Card Bills Paid
                                    <span className="text-[9px] text-text-muted ml-1.5 font-normal">({calcPct(priorSettlement)})</span>
                                </span>
                                <span className="font-black text-primary">{formatCurrency(priorSettlement)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-pill rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: Math.min(1, priorSettlement / maxVal) }}
                                    style={{ transformOrigin: 'left' }}
                                    className="h-full bg-secondary/40 rounded-full w-full"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});
