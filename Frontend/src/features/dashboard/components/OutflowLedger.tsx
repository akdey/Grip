import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface OutflowLedgerProps {
    currentExpense: number;
    priorSettlement: number;
    isLoading: boolean;
    formatCurrency: (amount: number) => string;
}

export const OutflowLedger: React.FC<OutflowLedgerProps> = memo(({
    currentExpense,
    priorSettlement,
    isLoading,
    formatCurrency
}) => {
    if (isLoading) {
        return (
            <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] animate-pulse">
                <div className="h-3 w-32 bg-white/[0.05] rounded mb-6" />
                <div className="space-y-4">
                    <div className="h-8 w-full bg-white/[0.05] rounded" />
                    <div className="h-8 w-full bg-white/[0.05] rounded" />
                </div>
            </div>
        );
    }

    const total = currentExpense + priorSettlement;
    const max = Math.max(total, 1);

    return (
        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[3px]">Outflow Ledger</h2>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Accrual View
                </span>
            </div>

            <div className="space-y-3">
                {/* Current Period Expense */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Current Period</span>
                        <span className="text-[9px] font-black text-white">{formatCurrency(currentExpense)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: Math.min(1, currentExpense / max) }}
                            style={{ transformOrigin: 'left' }}
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-full"
                        />
                    </div>
                    <p className="text-[8px] text-gray-600 mt-1 font-medium">Expenses incurred this period</p>
                </div>

                {/* Prior Period Settlement */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Prior Settlement</span>
                        <span className="text-[9px] font-black text-gray-400">{formatCurrency(priorSettlement)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: Math.min(1, priorSettlement / max) }}
                            style={{ transformOrigin: 'left' }}
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full w-full"
                        />
                    </div>
                    <p className="text-[8px] text-gray-600 mt-1 font-medium">Credit card bills paid from prior period</p>
                </div>
            </div>

            <div className="pt-3 border-t border-white/[0.05] flex justify-between items-center">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Total Outflow</span>
                <span className="text-sm font-black text-white">{formatCurrency(total)}</span>
            </div>
        </div>
    );
});
