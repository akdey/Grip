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
    portfolioShare?: number;
    showSensitive?: boolean;
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
    portfolioShare,
    showSensitive = true,
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

    // Format currency
    const formatCurrency = (val: number) => {
        if (!showSensitive) return '••••••';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <motion.div
            layout
            className="bg-surface-subtle border border-border-subtle rounded-2xl overflow-hidden hover:border-border-default transition-colors"
        >
            <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-pill border border-border-subtle flex items-center justify-center text-primary shrink-0">
                            {icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-primary tracking-tight">{title}</h3>
                                {portfolioShare !== undefined && portfolioShare > 0 && (
                                    <span className="text-[10px] font-semibold text-text-muted px-1.5 py-0.5 rounded-md bg-surface-pill border border-border-subtle">
                                        {portfolioShare.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">{holdings.length} {holdings.length === 1 ? 'Holding' : 'Holdings'}</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-base font-black text-primary tracking-tight font-mono">{formatCurrency(totalValue)}</p>
                        <div className={`flex items-center justify-end gap-1 text-xs font-semibold ${absoluteReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {absoluteReturn >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>
                                {showSensitive
                                    ? `${absoluteReturn >= 0 ? "+" : ""}${formatCurrency(absoluteReturn)} (${returnPercentage.toFixed(1)}%)`
                                    : '••••••'
                                }
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions for Specific Types */}
                {(type === 'MUTUAL_FUND' || type === 'STOCK') && (
                    <div className="flex gap-2 mb-3 pt-1">
                        {onSimulate && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSimulate(); }}
                                className="flex-1 py-1.5 px-3 bg-surface-pill hover:bg-surface-hover text-text-secondary hover:text-primary rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-border-subtle"
                            >
                                <Calculator size={13} />
                                What-If Simulator
                            </button>
                        )}
                        {onAnalyze && type === 'MUTUAL_FUND' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
                                className="flex-1 py-1.5 px-3 bg-surface-pill hover:bg-surface-hover text-text-secondary hover:text-primary rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-border-subtle"
                            >
                                <CalendarClock size={13} />
                                SIP Analysis
                            </button>
                        )}
                    </div>
                )}

                {/* Subtle Divider & Toggle */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between text-xs text-text-muted hover:text-primary pt-2 border-t border-border-subtle/50 transition-colors"
                >
                    <span className="text-[11px] font-medium">{isExpanded ? "Collapse Holdings" : `View ${holdings.length} Holdings`}</span>
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
                        className="bg-surface/40 border-t border-border-subtle"
                    >
                        <div className="p-2 space-y-1">
                            {holdings.map(h => (
                                <div
                                    key={h.id}
                                    onClick={() => onHoldingClick(h.id)}
                                    role="button"
                                    tabIndex={0}
                                    className={`flex justify-between items-center p-3 rounded-xl border transition-all duration-150 group cursor-pointer ${
                                        loadingHoldingId === h.id
                                            ? 'border-border-default bg-surface-hover scale-[0.99]'
                                            : 'border-transparent hover:border-border-subtle bg-surface-subtle/50 hover:bg-surface-hover active:scale-[0.99]'
                                    }`}
                                >
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm font-semibold text-primary truncate group-hover:text-primary transition-colors">
                                            {h.name}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            {h.xirr !== null && h.xirr !== undefined && (
                                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-medium">
                                                    XIRR {h.xirr.toFixed(1)}%
                                                </span>
                                            )}
                                            {h.interest_rate && (
                                                <span className="text-[10px] text-text-muted bg-surface-pill border border-border-subtle px-1.5 py-0.5 rounded font-mono">
                                                    {h.interest_rate}% p.a.
                                                </span>
                                            )}
                                            {h.maturity_amount && (
                                                <span className="text-[10px] text-text-muted bg-surface-pill border border-border-subtle px-1.5 py-0.5 rounded font-mono">
                                                    Mat: {formatCurrency(h.maturity_amount)}
                                                </span>
                                            )}
                                            {h.maturity_date && (() => {
                                                const isMatured = new Date(h.maturity_date).getTime() <= Date.now();
                                                return isMatured ? (
                                                    <span className="text-[10px] text-text-secondary bg-surface-pill border border-border-default px-1.5 py-0.5 rounded font-mono">
                                                        Matured {new Date(h.maturity_date).toLocaleDateString([], { month: 'short', year: '2-digit' })}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-text-muted">
                                                        Matures {new Date(h.maturity_date).toLocaleDateString([], { month: 'short', year: '2-digit' })}
                                                    </span>
                                                );
                                            })()}
                                            <span className="text-[10px] text-text-muted">
                                                Inv: {formatCurrency(h.total_invested)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-primary font-mono">{formatCurrency(h.current_value)}</p>
                                            <div className={`flex items-center justify-end gap-1 text-[10px] font-semibold ${(h.current_value - h.total_invested) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                {(h.current_value - h.total_invested) >= 0 ? "+" : ""}
                                                {showSensitive
                                                    ? `${((h.current_value - h.total_invested) / (h.total_invested || 1) * 100).toFixed(1)}%`
                                                    : '••••'
                                                }
                                            </div>
                                        </div>
                                        {loadingHoldingId === h.id ? (
                                            <Loader2 size={15} className="text-text-muted animate-spin shrink-0" />
                                        ) : (
                                            <ChevronRight size={15} className="text-text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
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
