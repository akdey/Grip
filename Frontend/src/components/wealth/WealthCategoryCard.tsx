import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, ChevronUp, TrendingUp, TrendingDown,
    MoreHorizontal, Calculator, CalendarClock, PieChart
} from 'lucide-react';

interface Holding {
    id: string;
    name: string;
    asset_type: string;
    current_value: number;
    total_invested: number;
    xirr: number | null;
    ticker_symbol: string | null;
}

interface WealthCategoryCardProps {
    title: string;
    type: string; // 'MUTUAL_FUND', 'STOCK', 'GOLD', 'FD', etc.
    icon: React.ReactNode;
    holdings: Holding[];
    onSimulate?: () => void;
    onAnalyze?: (holdingId?: string) => void;
    onHoldingClick: (id: string) => void;
}

export const WealthCategoryCard: React.FC<WealthCategoryCardProps> = ({
    title,
    type,
    icon,
    holdings,
    onSimulate,
    onAnalyze,
    onHoldingClick
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
    const absoluteReturn = totalValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

    // Calculate aggregated XIRR (simplified weighted average for display if needed, or just show range)
    // For now, we'll show the top performing XIRR or just omitted if complex to calc on fly.
    const hasXirr = holdings.some(h => h.xirr !== null);

    // Format currency
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <motion.div
            layout
            className="bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
        >
            <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-white/5 text-gray-300`}>
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-100">{title}</h3>
                            <p className="text-xs text-gray-500 font-medium">{holdings.length} Holdings</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-lg font-bold text-gray-100">{formatCurrency(totalValue)}</p>
                        <div className={`flex items-center justify-end gap-1 text-xs font-bold ${absoluteReturn >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {absoluteReturn >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>{absoluteReturn >= 0 ? "+" : ""}{formatCurrency(absoluteReturn)} ({returnPercentage.toFixed(1)}%)</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions for Specific Types */}
                {(type === 'MUTUAL_FUND' || type === 'STOCK') && (
                    <div className="flex gap-2 mb-4">
                        {onSimulate && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSimulate(); }}
                                className="flex-1 py-2 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-indigo-500/20"
                            >
                                <Calculator size={14} />
                                What-If Simulator
                            </button>
                        )}
                        {onAnalyze && type === 'MUTUAL_FUND' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
                                className="flex-1 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-emerald-500/20"
                            >
                                <CalendarClock size={14} />
                                SIP Analysis
                            </button>
                        )}
                    </div>
                )}

                {/* Progress Bar / Visual Indicator */}
                <div className="w-full h-1.5 bg-white/5 rounded-full mb-4 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(returnPercentage, 100)}%` }} // Just a visual rep of return, capped
                        className={`h-full ${returnPercentage >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                    />
                </div>

                {/* Expanded Content Toggle */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 py-2 transition-colors"
                >
                    {isExpanded ? "Show Less" : "View Holdings"}
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            {/* Expanded Holdings List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-black/20 border-t border-white/5"
                    >
                        <div className="p-2 space-y-1">
                            {holdings.map(h => (
                                <div
                                    key={h.id}
                                    onClick={() => onHoldingClick(h.id)}
                                    className="flex justify-between items-center p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{h.name}</p>
                                        <div className="flex items-center gap-2">
                                            {h.xirr && <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">XIRR {h.xirr.toFixed(1)}%</span>}
                                            <span className="text-[10px] text-gray-600">Inv: {formatCurrency(h.total_invested)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-200">{formatCurrency(h.current_value)}</p>
                                        <div className={`flex items-center justify-end gap-1 text-[10px] ${(h.current_value - h.total_invested) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                            {((h.current_value - h.total_invested) / h.total_invested * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
