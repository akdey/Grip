import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, ChevronUp, ChevronRight, TrendingUp, TrendingDown,
    MoreHorizontal, Calculator, CalendarClock, PieChart, Loader2
} from 'lucide-react';

interface Holding {
    id: string;
    name: string;
    asset_type: string;
    current_value: number;
    total_invested: number;
    xirr: number | null;
    ticker_symbol: string | null;
    interest_rate?: number | null;
    maturity_date?: string | null;
    maturity_amount?: number | null;
}

interface WealthCategoryCardProps {
    title: string;
    type: string; // 'MUTUAL_FUND', 'STOCK', 'GOLD', 'FD', etc.
    icon: React.ReactNode;
    holdings: Holding[];
    onSimulate?: () => void;
    onAnalyze?: (holdingId?: string) => void;
    onHoldingClick: (id: string) => void;
    loadingHoldingId?: string | null;
}

export const WealthCategoryCard: React.FC<WealthCategoryCardProps> = ({
    title,
    type,
    icon,
    holdings,
    onSimulate,
    onAnalyze,
    onHoldingClick,
    loadingHoldingId
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

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
            className="bg-surface-subtle border border-border-subtle rounded-2xl overflow-hidden hover:border-border-default transition-colors"
        >
            <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-accent-subtle text-primary">
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-primary">{title}</h3>
                            <p className="text-xs text-text-muted font-medium">{holdings.length} Holdings</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-lg font-bold text-primary">{formatCurrency(totalValue)}</p>
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
                                className="flex-1 py-2 px-3 bg-surface hover:bg-surface-hover text-primary rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-border-subtle"
                            >
                                <Calculator size={14} />
                                What-If Simulator
                            </button>
                        )}
                        {onAnalyze && type === 'MUTUAL_FUND' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
                                className="flex-1 py-2 px-3 bg-surface hover:bg-surface-hover text-primary rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-border-subtle"
                            >
                                <CalendarClock size={14} />
                                SIP Analysis
                            </button>
                        )}
                    </div>
                )}

                {/* Progress Bar / Visual Indicator */}
                <div className="w-full h-1.5 bg-surface rounded-full mb-4 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(returnPercentage, 100)}%` }} // Just a visual rep of return, capped
                        className={`h-full ${returnPercentage >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                    />
                </div>

                {/* Expanded Content Toggle */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center gap-2 text-xs text-text-muted hover:text-primary py-2 transition-colors"
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
                        className="bg-surface/50 border-t border-border-subtle"
                    >
                        <div className="p-2 space-y-1">
                            {holdings.map(h => (
                                <div
                                    key={h.id}
                                    onClick={() => onHoldingClick(h.id)}
                                    role="button"
                                    tabIndex={0}
                                    className={`flex justify-between items-center p-3 rounded-xl border transition-all duration-150 group cursor-pointer shadow-none hover:shadow-sm ${
                                        loadingHoldingId === h.id
                                            ? 'border-accent/40 bg-accent-subtle/30 scale-[0.99]'
                                            : 'border-transparent hover:border-border-default/60 bg-surface/30 hover:bg-surface-hover/80 active:scale-[0.985] active:bg-surface-hover'
                                    }`}
                                >
                                    <div className="min-w-0 pr-2">
                                        <p className={`text-sm font-semibold transition-colors truncate ${loadingHoldingId === h.id ? 'text-accent-text' : 'text-primary group-hover:text-accent-text'}`}>
                                            {h.name}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                                            {h.xirr && <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold">XIRR {h.xirr.toFixed(1)}%</span>}
                                            {h.interest_rate && <span className="text-[10px] text-accent-text bg-accent-subtle px-1.5 py-0.5 rounded font-mono font-bold">{h.interest_rate}% p.a.</span>}
                                            {h.maturity_amount && <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono font-semibold">Mat: {formatCurrency(h.maturity_amount)}</span>}
                                            {h.maturity_date && <span className="text-[10px] text-text-muted">Matures {new Date(h.maturity_date).toLocaleDateString([], { month: 'short', year: '2-digit' })}</span>}
                                            <span className="text-[10px] text-text-muted">Inv: {formatCurrency(h.total_invested)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-primary group-hover:text-primary transition-colors">{formatCurrency(h.current_value)}</p>
                                            <div className={`flex items-center justify-end gap-1 text-[10px] font-semibold ${(h.current_value - h.total_invested) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                {(h.current_value - h.total_invested) >= 0 ? "+" : ""}
                                                {((h.current_value - h.total_invested) / h.total_invested * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                        {loadingHoldingId === h.id ? (
                                            <Loader2 size={16} className="text-accent-text animate-spin shrink-0" />
                                        ) : (
                                            <ChevronRight size={16} className="text-text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                                        )}
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
