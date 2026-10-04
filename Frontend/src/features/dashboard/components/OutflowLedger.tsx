import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

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
    const [showInfo, setShowInfo] = useState(false);

    if (isLoading) {
        return (
            <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] flex flex-col gap-4 animate-pulse">
                <div className="flex justify-between">
                    <div className="h-3 w-32 bg-white/[0.05] rounded" />
                    <div className="h-3 w-20 bg-white/[0.05] rounded" />
                </div>
                <div className="space-y-6 my-2">
                    <div className="space-y-2">
                        <div className="flex justify-between"><div className="h-2 w-16 bg-white/[0.05] rounded" /><div className="h-2 w-12 bg-white/[0.05] rounded" /></div>
                        <div className="h-1.5 w-full bg-white/[0.05] rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between"><div className="h-2 w-16 bg-white/[0.05] rounded" /><div className="h-2 w-12 bg-white/[0.05] rounded" /></div>
                        <div className="h-1.5 w-full bg-white/[0.05] rounded-full" />
                    </div>
                </div>
                <div className="pt-3 border-t border-white/[0.05] flex justify-between items-center">
                    <div className="h-2 w-20 bg-white/[0.05] rounded" />
                    <div className="h-4 w-24 bg-white/[0.05] rounded" />
                </div>
            </div>
        );
    }

    // Resolve direct and credit components
    const resolvedDirect = directExpense !== undefined ? directExpense : Math.max(0, currentExpense - (creditExpense || 0));
    const resolvedCredit = creditExpense !== undefined ? creditExpense : Math.max(0, currentExpense - resolvedDirect);
    const resolvedCashDrain = cashOutflow !== undefined ? cashOutflow : (resolvedDirect + priorSettlement);

    const accrualTotal = currentExpense; // SUM(DIRECT_EXPENSE) + SUM(CREDIT_EXPENSE)
    const cashTotal = resolvedCashDrain; // SUM(DIRECT_EXPENSE) + SUM(DEBT_TRANSFER)

    const isAccrual = viewMode === 'ACCRUAL';
    const activeTotal = isAccrual ? accrualTotal : cashTotal;
    const maxVal = Math.max(activeTotal, 1);

    return (
        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[3px]">Outflow Ledger</h2>
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className="text-gray-500 hover:text-gray-300 transition-colors"
                        title="About accounting views"
                    >
                        <HelpCircle size={12} />
                    </button>
                </div>

                {/* Perspective Mode Switcher */}
                <div className="flex items-center bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.08]">
                    <button
                        onClick={() => setViewMode('ACCRUAL')}
                        className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                            isAccrual
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Accrual
                    </button>
                    <button
                        onClick={() => setViewMode('CASH')}
                        className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                            !isAccrual
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Cash Drain
                    </button>
                </div>
            </div>

            {/* Info Drawer */}
            <AnimatePresence>
                {showInfo && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-xl text-[9px] text-gray-300 space-y-1.5 leading-relaxed"
                    >
                        <p><strong className="text-cyan-400">Accrual View:</strong> Actual goods &amp; services consumed this period (Direct + Card Swipes). Credit Card bill payments are balance sheet debt settlements, so they are excluded to prevent double-counting.</p>
                        <p><strong className="text-amber-400">Cash Drain:</strong> Real liquid cash that exited bank and cash accounts (Direct + Card Bill Payments). Unsettled card swipes do not pull cash until settled.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dynamic Breakdown Bars */}
            <div className="space-y-3.5">
                {isAccrual ? (
                    <>
                        {/* Accrual: Direct Expenses (Bank/Cash) */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Liquid Purchases</span>
                                <span className="text-[9px] font-black text-white">{formatCurrency(resolvedDirect)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: Math.min(1, resolvedDirect / maxVal) }}
                                    style={{ transformOrigin: 'left' }}
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-full"
                                />
                            </div>
                            <p className="text-[8px] text-gray-400 mt-1 font-medium">Outflow from Bank &amp; Cash for goods/services</p>
                        </div>

                        {/* Accrual: Credit Card Incurred */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">Card Swipes (Liability)</span>
                                <span className="text-[9px] font-black text-purple-200">{formatCurrency(resolvedCredit)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: Math.min(1, resolvedCredit / maxVal) }}
                                    style={{ transformOrigin: 'left' }}
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full w-full"
                                />
                            </div>
                            <p className="text-[8px] text-gray-400 mt-1 font-medium">Expenses charged to credit cards this period</p>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Cash: Direct Expenses */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Direct Expenses</span>
                                <span className="text-[9px] font-black text-white">{formatCurrency(resolvedDirect)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: Math.min(1, resolvedDirect / maxVal) }}
                                    style={{ transformOrigin: 'left' }}
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-full"
                                />
                            </div>
                            <p className="text-[8px] text-gray-400 mt-1 font-medium">Liquid cash spent directly from bank/cash</p>
                        </div>

                        {/* Cash: Prior Settlement (Debt Servicing) */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Prior Settlement (Debt Servicing)</span>
                                <span className="text-[9px] font-black text-amber-300">{formatCurrency(priorSettlement)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: Math.min(1, priorSettlement / maxVal) }}
                                    style={{ transformOrigin: 'left' }}
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full w-full"
                                />
                            </div>
                            <p className="text-[8px] text-gray-400 mt-1 font-medium">Bank payments to settle credit card bills</p>
                        </div>
                    </>
                )}
            </div>

            {/* Footer Total */}
            <div className="pt-3 border-t border-white/[0.05] flex justify-between items-center">
                <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                        {isAccrual ? 'Expenses Incurred' : 'Actual Cash Drain'}
                    </span>
                    <span className="text-[8px] text-gray-400">
                        {isAccrual ? 'Accrual Accounting' : 'Cash Accounting Outflow'}
                    </span>
                </div>
                <span className="text-sm font-black text-white">{formatCurrency(activeTotal)}</span>
            </div>
        </div>
    );
});
