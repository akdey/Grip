import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';

interface OutflowLedgerProps {
    currentExpense: number;       // Accrual View: SUM(DIRECT_EXPENSE) + SUM(CREDIT_EXPENSE)
    priorSettlement: number;      // Prior Settlement: SUM(DEBT_TRANSFER)
    directExpense?: number;       // SUM(DIRECT_EXPENSE)
    creditExpense?: number;       // SUM(CREDIT_EXPENSE)
    capitalInvestments?: number;  // SUM(CAPITAL_OUTFLOW)
    cashOutflow?: number;         // Cash Outflow: SUM(DIRECT_EXPENSE) + SUM(DEBT_TRANSFER) + SUM(CAPITAL_OUTFLOW)
    isLoading: boolean;
    formatCurrency: (amount: number) => string;
}

export const OutflowLedger: React.FC<OutflowLedgerProps> = memo(({
    currentExpense,
    priorSettlement,
    directExpense,
    creditExpense,
    capitalInvestments = 0,
    cashOutflow,
    isLoading,
    formatCurrency
}) => {
    const [viewMode, setViewMode] = useState<'CASH' | 'ACCRUAL'>('CASH');

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
    const resolvedInvestments = capitalInvestments;
    const resolvedCashDrain = cashOutflow !== undefined ? cashOutflow : (resolvedDirect + priorSettlement + resolvedInvestments);

    const isCash = viewMode === 'CASH';
    const activeTotal = isCash ? resolvedCashDrain : currentExpense;
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
                        {isCash ? 'Actual Cash Drain' : 'Expenses Incurred'}
                    </p>
                </div>

                {/* Minimal Segmented Toggle */}
                <div className="flex items-center bg-surface-pill p-1 rounded-xl border border-border-subtle shrink-0">
                    <button
                        onClick={() => setViewMode('CASH')}
                        className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-lg transition-all ${
                            isCash
                                ? 'bg-accent-subtle text-accent-text border border-accent-border font-semibold shadow-sm'
                                : 'text-text-muted hover:text-primary'
                        }`}
                    >
                        Cash Drain
                    </button>
                    <button
                        onClick={() => setViewMode('ACCRUAL')}
                        className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-lg transition-all ${
                            !isCash
                                ? 'bg-accent-subtle text-accent-text border border-accent-border font-semibold shadow-sm'
                                : 'text-text-muted hover:text-primary'
                        }`}
                    >
                        Accrual
                    </button>
                </div>
            </div>

            {/* Active Total Display */}
            <div className="flex items-baseline justify-between pt-1 border-b border-border-subtle pb-4">
                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                    {isCash ? 'Total Liquid Outflow' : 'Total Incurred Spend'}
                </span>
                <span className="text-lg font-black text-primary tracking-tight">
                    {formatCurrency(activeTotal)}
                </span>
            </div>

            {/* Breakdown Bars */}
            <div className="space-y-4">
                {isCash ? (
                    <>
                        {/* Direct Lifestyle Expenses */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-secondary tracking-wide">
                                    Direct Lifestyle Expenses
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

                        {/* Capital Investments (SIP, RD, FD, Wealth) */}
                        {resolvedInvestments > 0 && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-secondary tracking-wide">
                                        Capital Investments (SIP / RD)
                                        <span className="text-[9px] text-text-muted ml-1.5 font-normal">({calcPct(resolvedInvestments)})</span>
                                    </span>
                                    <span className="font-black text-primary">{formatCurrency(resolvedInvestments)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-pill rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: Math.min(1, resolvedInvestments / maxVal) }}
                                        style={{ transformOrigin: 'left' }}
                                        className="h-full bg-emerald-500/80 rounded-full w-full"
                                    />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Direct Lifestyle Expenses */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-secondary tracking-wide">
                                    Direct Lifestyle Expenses
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
                )}
            </div>
        </div>
    );
});

