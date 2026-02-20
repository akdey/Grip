import React, { memo } from 'react';
import { Receipt, Lock, ArrowRight } from 'lucide-react';
import type { SafeToSpend } from '../hooks';

interface FrozenAllocationProps {
    safeToSpend: SafeToSpend | undefined;
    isLoading: boolean;
    formatCurrency: (amount: number) => string;
    onShowObligations: () => void;
}

export const FrozenAllocation: React.FC<FrozenAllocationProps> = memo(({
    safeToSpend,
    isLoading,
    formatCurrency,
    onShowObligations
}) => {
    if (isLoading) {
        return (
            <div className="space-y-4 pt-2 animate-pulse">
                <div className="flex items-center justify-between px-2">
                    <div className="h-3 w-32 bg-white/[0.05] rounded" />
                    <div className="h-6 w-16 bg-white/[0.05] rounded-full" />
                </div>
                <div className="grid grid-cols-1 gap-3">
                    <div className="h-24 bg-white/[0.05] rounded-[2rem]" />
                    <div className="h-24 bg-white/[0.05] rounded-[2rem]" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Frozen Allocation</h2>
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/10">
                    {formatCurrency(Number(safeToSpend?.frozen_funds?.total_frozen) || 0)}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <div
                    onClick={onShowObligations}
                    className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] flex items-center justify-between hover:bg-white/[0.04] transition-all cursor-pointer group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                            <Receipt size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white/90 uppercase tracking-tight">Obligations</p>
                            <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-0.5">Surety / Bills</p>
                        </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                        <div>
                            <p className="font-black text-white text-sm tracking-tighter">
                                {formatCurrency((Number(safeToSpend?.frozen_funds?.unpaid_bills) || 0) + (Number(safeToSpend?.frozen_funds?.projected_surety) || 0))}
                            </p>
                            <p className="text-[7px] text-gray-700 font-bold uppercase tracking-wider mt-0.5">Unpaid: {formatCurrency(Number(safeToSpend?.frozen_funds?.unpaid_bills) || 0)}</p>
                        </div>
                        <ArrowRight size={14} className="text-gray-700 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
                    </div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] flex items-center justify-between hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
                            <Lock size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white/90 uppercase tracking-tight">Card Exposure</p>
                            <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-0.5">Pending CC Swipes</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-white text-sm tracking-tighter">{formatCurrency(Number(safeToSpend?.frozen_funds?.unbilled_cc) || 0)}</p>
                        <p className="text-[7px] text-gray-700 font-bold uppercase tracking-wider mt-0.5">Settlement Limit</p>
                    </div>
                </div>
            </div>
        </div>
    );
});
