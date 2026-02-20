import React, { memo } from 'react';
import { ArrowUpRight, ArrowDownRight, Lock } from 'lucide-react';

interface SummaryGridProps {
    totalIncome: number;
    totalExpense: number;
    isLoading: boolean;
    showSensitive: boolean;
    formatCurrency: (amount: number) => string;
}

export const SummaryGrid: React.FC<SummaryGridProps> = memo(({
    totalIncome,
    totalExpense,
    isLoading,
    showSensitive,
    formatCurrency
}) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden">
                {isLoading ? (
                    <div className="animate-pulse flex flex-col gap-4 h-full">
                        <div className="w-10 h-10 rounded-2xl bg-white/[0.05]" />
                        <div className="space-y-2">
                            <div className="h-2 w-12 bg-white/[0.05] rounded" />
                            <div className="h-6 w-24 bg-white/[0.05] rounded" />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <ArrowUpRight size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Inflow</p>
                                {!showSensitive && <Lock size={10} className="text-gray-600" />}
                            </div>
                            <p className="text-xl font-black text-white leading-none whitespace-nowrap">
                                {showSensitive ? formatCurrency(totalIncome) : '******'}
                            </p>
                        </div>
                    </>
                )}
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden">
                {isLoading ? (
                    <div className="animate-pulse flex flex-col gap-4 h-full">
                        <div className="w-10 h-10 rounded-2xl bg-white/[0.05]" />
                        <div className="space-y-2">
                            <div className="h-2 w-12 bg-white/[0.05] rounded" />
                            <div className="h-6 w-24 bg-white/[0.05] rounded" />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                            <ArrowDownRight size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Outflow</p>
                            <p className="text-xl font-black text-white leading-none whitespace-nowrap">{formatCurrency(totalExpense)}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});
