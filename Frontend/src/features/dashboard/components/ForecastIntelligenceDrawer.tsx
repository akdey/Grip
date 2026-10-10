import React, { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    Sparkles,
    Calendar,
    Layers,
    Activity,
    TrendingUp,
    ShieldCheck,
    AlertTriangle,
    Clock,
    CheckCircle2,
    ArrowUpRight,
    Info,
    Flame
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { haptics } from '../../../lib/haptics';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';
import type { ForecastInfo, SafeToSpend, IdentifiedObligation } from '../hooks';

interface ForecastIntelligenceDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    forecast: ForecastInfo | undefined;
    safeToSpend: SafeToSpend | undefined;
    formatCurrency: (amount: number) => string;
}

type ForecastViewMode = 'category' | 'date' | 'think';

export const ForecastIntelligenceDrawer: React.FC<ForecastIntelligenceDrawerProps> = memo(({
    isOpen,
    onClose,
    forecast,
    safeToSpend,
    formatCurrency
}) => {
    const [viewMode, setViewMode] = useState<ForecastViewMode>('category');

    const totalBurden = forecast?.predicted_burden_30d || 0;
    const dailyBurn = Math.round(totalBurden / 30);
    const breakdown = forecast?.breakdown || [];

    // Sort categories by highest predicted spend
    const sortedBreakdown = useMemo(() => {
        return [...breakdown].sort((a, b) => b.predicted_amount - a.predicted_amount);
    }, [breakdown]);

    // Calculate Top 3 Concentration for the "Think" view
    const concentrationStats = useMemo(() => {
        if (!sortedBreakdown.length || totalBurden <= 0) {
            return { topThreeTotal: 0, topThreePercentage: 0, topCategories: [] };
        }
        const topThree = sortedBreakdown.slice(0, 3);
        const topThreeTotal = topThree.reduce((sum, item) => sum + item.predicted_amount, 0);
        const topThreePercentage = Math.min(100, Math.round((topThreeTotal / totalBurden) * 100));
        return {
            topThreeTotal,
            topThreePercentage,
            topCategories: topThree
        };
    }, [sortedBreakdown, totalBurden]);

    // 4-phase monthly outflow distribution for "Date / Timeline" view
    const timelinePhases = useMemo(() => {
        return [
            {
                phase: 'Week 1 (Days 1–7)',
                title: 'Fixed & Early-Month Commitments',
                ratio: 0.35,
                amount: Math.round(totalBurden * 0.35),
                desc: 'Beginning-of-month fixed obligations, rent, EMIs, and initial essentials.'
            },
            {
                phase: 'Week 2 (Days 8–14)',
                title: 'Mid-Month Utilities & Staples',
                ratio: 0.25,
                amount: Math.round(totalBurden * 0.25),
                desc: 'Recurring utilities, recurring grocery runs, and routine subscriptions.'
            },
            {
                phase: 'Week 3 (Days 15–21)',
                title: 'Lifestyle & Discretionary Burn',
                ratio: 0.20,
                amount: Math.round(totalBurden * 0.20),
                desc: 'Dining out, leisure, discretionary shopping, and social expenses.'
            },
            {
                phase: 'Week 4 (Days 22–30)',
                title: 'End-of-Cycle Settling & Buffer',
                ratio: 0.20,
                amount: Math.round(totalBurden * 0.20),
                desc: 'Month-end wrap, credit card settlements, and ad-hoc incidental costs.'
            }
        ];
    }, [totalBurden]);

    // Scheduled obligations from Safe-to-Spend
    const scheduledObligations = safeToSpend?.frozen_funds?.obligations || [];

    // Confidence badge helpers
    const confidenceBadge = useMemo(() => {
        const conf = (forecast?.confidence || 'medium').toLowerCase();
        if (conf === 'high') {
            return {
                label: 'High Confidence',
                pillClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
            };
        }
        if (conf === 'low') {
            return {
                label: 'Low Data',
                pillClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
            };
        }
        return {
            label: 'Medium Model',
            pillClass: 'bg-accent-subtle text-accent-text border-accent-border',
            dotClass: 'bg-accent-text shadow-[0_0_8px_rgba(139,92,246,0.5)]'
        };
    }, [forecast?.confidence]);

    const formatObligationDate = (dateStr: string) => {
        try {
            const parsed = parseISO(dateStr);
            if (isValid(parsed)) return format(parsed, 'MMM dd');
        } catch {
            // fallback
        }
        return dateStr;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex justify-center pointer-events-none">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            haptics.selection();
                            onClose();
                        }}
                        className="absolute inset-0 bg-overlay backdrop-blur-md pointer-events-auto"
                    />

                    {/* Drawer Surface */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.85 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0.14, bottom: 0.8 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 140 || info.velocity.y > 550) {
                                haptics.impact('light');
                                onClose();
                            } else {
                                haptics.selection();
                            }
                        }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[92vh] max-h-[92vh] glass-drawer rounded-t-[32px] sm:rounded-t-[40px] flex flex-col shadow-2xl overflow-hidden pointer-events-auto z-[2000] select-none touch-none"
                    >
                        {/* Apple-style Grabber Pill */}
                        <div
                            className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                            onClick={() => {
                                haptics.selection();
                                onClose();
                            }}
                        >
                            <div className="w-10 h-1.5 bg-border-strong rounded-full transition-colors active:scale-95" />
                        </div>

                        {/* Drawer Header */}
                        <div className="px-5 sm:px-8 py-3.5 sm:py-4 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface/40 backdrop-blur-md">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent-text shrink-0 shadow-inner">
                                    <Sparkles size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg sm:text-xl font-black text-primary tracking-tight truncate heading-apple">
                                        Forecast Intelligence
                                    </h3>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5 truncate">
                                        {forecast?.time_frame || 'Next 30 Days'} • Predictive Engine
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    haptics.selection();
                                    onClose();
                                }}
                                className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all shadow-sm shrink-0"
                                aria-label="Close forecast details"
                            >
                                <ChevronDown size={20} />
                            </button>
                        </div>

                        {/* View Selector Controls */}
                        <div className="px-5 sm:px-8 pt-3 pb-2 border-b border-border-subtle/50 shrink-0 bg-surface/20">
                            <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-subtle border border-border-subtle rounded-2xl">
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setViewMode('category');
                                    }}
                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                        viewMode === 'category'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-muted hover:text-primary hover:bg-surface-hover'
                                    }`}
                                >
                                    <Layers size={13} />
                                    <span className="truncate">Category</span>
                                </button>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setViewMode('date');
                                    }}
                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                        viewMode === 'date'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-muted hover:text-primary hover:bg-surface-hover'
                                    }`}
                                >
                                    <Calendar size={13} />
                                    <span className="truncate">Date & Cycle</span>
                                </button>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setViewMode('think');
                                    }}
                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                        viewMode === 'think'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-muted hover:text-primary hover:bg-surface-hover'
                                    }`}
                                >
                                    <Sparkles size={13} />
                                    <span className="truncate">Think & AI</span>
                                </button>
                            </div>
                        </div>

                        {/* Content Scroll Container */}
                        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 space-y-6 custom-scrollbar select-text overflow-x-hidden">
                            {/* Top KPI Summary Strip */}
                            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-subtle border border-border-subtle">
                                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Total Exposure
                                    </span>
                                    <p className="text-base sm:text-xl font-black text-primary tracking-tight mt-1 truncate">
                                        {formatCurrency(totalBurden)}
                                    </p>
                                    <span className="text-[8px] font-semibold text-text-muted/80 block mt-0.5 truncate">
                                        30-Day Predicted
                                    </span>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-subtle border border-border-subtle">
                                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Confidence
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${confidenceBadge.dotClass}`} />
                                        <span className="text-xs sm:text-sm font-black text-primary uppercase tracking-tight truncate">
                                            {forecast?.confidence || 'High'}
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-semibold text-text-muted/80 block mt-0.5 truncate">
                                        Model Reliability
                                    </span>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-subtle border border-border-subtle">
                                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Daily Burn Rate
                                    </span>
                                    <p className="text-base sm:text-xl font-black text-primary tracking-tight mt-1 truncate">
                                        {formatCurrency(dailyBurn)}
                                    </p>
                                    <span className="text-[8px] font-semibold text-text-muted/80 block mt-0.5 truncate">
                                        Projected / Day
                                    </span>
                                </div>
                            </div>

                            {/* View 1: Category Wise */}
                            {viewMode === 'category' && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <Layers size={14} className="text-accent-text" />
                                            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[3px]">
                                                Category Allocations ({sortedBreakdown.length})
                                            </h4>
                                        </div>
                                        <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">
                                            Ranked by Burden
                                        </span>
                                    </div>

                                    {sortedBreakdown.length === 0 ? (
                                        <div className="p-12 rounded-3xl bg-surface-subtle border border-border-subtle text-center space-y-2 opacity-60">
                                            <Layers size={32} className="mx-auto text-text-muted" />
                                            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                                                No category predictions generated yet
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {sortedBreakdown.map((item, idx) => {
                                                const percentage = totalBurden > 0
                                                    ? Math.min(100, Math.round((item.predicted_amount / totalBurden) * 100))
                                                    : 0;

                                                return (
                                                    <div
                                                        key={`${item.category}-${item.sub_category || idx}`}
                                                        className="p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border-subtle hover:border-border-default transition-all group"
                                                    >
                                                        <div className="flex items-start justify-between gap-3 mb-2.5">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-primary group-hover:border-accent-border transition-colors shrink-0 shadow-inner">
                                                                    <CategoryIcon name={item.category.toLowerCase()} size={18} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-sm font-bold text-primary tracking-tight truncate">
                                                                            {item.category}
                                                                        </span>
                                                                        {item.sub_category && (
                                                                            <span className="text-[8.5px] font-bold px-2 py-0.5 rounded-full bg-accent-subtle border border-accent-border text-accent-text uppercase tracking-wider">
                                                                                {item.sub_category}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-0.5 block">
                                                                        Rank #{idx + 1} • {percentage}% of total
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="text-right shrink-0">
                                                                <p className="text-base sm:text-lg font-black text-primary tracking-tight">
                                                                    {formatCurrency(item.predicted_amount)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Distribution Progress Bar */}
                                                        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden mb-2.5 border border-border-subtle/40">
                                                            <div
                                                                className="h-full bg-accent-text/80 rounded-full transition-all duration-500"
                                                                style={{ width: `${Math.max(4, percentage)}%` }}
                                                            />
                                                        </div>

                                                        {/* AI Reasoning & Driver Text */}
                                                        {item.reason && (
                                                            <div className="p-2.5 rounded-xl bg-surface/50 border border-border-subtle/50 text-[11px] text-text-muted font-medium leading-relaxed">
                                                                {item.reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* View 2: Date & Cycle-Wise Timeline */}
                            {viewMode === 'date' && (
                                <div className="space-y-6 animate-fadeIn">
                                    {/* Phased 4-Week Distribution */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-accent-text" />
                                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[3px]">
                                                    30-Day Phased Outflow Cycle
                                                </h4>
                                            </div>
                                            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">
                                                {formatCurrency(dailyBurn)} / day avg
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {timelinePhases.map((phase, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle flex flex-col justify-between space-y-2.5"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-subtle border border-accent-border text-accent-text">
                                                            {phase.phase}
                                                        </span>
                                                        <span className="text-sm font-black text-primary">
                                                            {formatCurrency(phase.amount)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-primary">
                                                            {phase.title}
                                                        </p>
                                                        <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                                                            {phase.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Scheduled Due Dates from Safe-to-Spend Obligations */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-accent-text" />
                                                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[3px]">
                                                    Scheduled Due Dates & Commitments ({scheduledObligations.length})
                                                </h4>
                                            </div>
                                            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">
                                                Identified in Cycle
                                            </span>
                                        </div>

                                        {scheduledObligations.length === 0 ? (
                                            <div className="p-8 rounded-2xl bg-surface-subtle border border-border-subtle text-center space-y-1.5 opacity-70">
                                                <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
                                                <p className="text-xs font-bold text-primary">
                                                    No Pending Commitments
                                                </p>
                                                <p className="text-[10px] text-text-muted">
                                                    No overdue or fixed bill deadlines detected in this active cycle.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {scheduledObligations.map((obl) => (
                                                    <div
                                                        key={obl.id}
                                                        className="p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-between gap-3"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                                                <Calendar size={16} className="text-accent-text" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <p className="text-xs font-bold text-primary truncate">
                                                                        {obl.title}
                                                                    </p>
                                                                    <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-surface border border-border-subtle text-text-muted">
                                                                        {obl.type}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[9px] font-semibold text-text-muted mt-0.5 truncate">
                                                                    Due {formatObligationDate(obl.due_date)} • {obl.status}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="text-right shrink-0">
                                                            <p className="text-xs sm:text-sm font-black text-primary">
                                                                {formatCurrency(obl.amount)}
                                                            </p>
                                                            <span className={`inline-block text-[7.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded mt-0.5 border ${
                                                                obl.status === 'OVERDUE'
                                                                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                            }`}>
                                                                {obl.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* View 3: Think & AI Insights */}
                            {viewMode === 'think' && (
                                <div className="space-y-4 animate-fadeIn">
                                    {/* AI Context Hero Card */}
                                    <div className="p-5 sm:p-6 rounded-3xl bg-accent-subtle border border-accent-border space-y-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-primary text-text-inverse flex items-center justify-center">
                                                <Sparkles size={14} />
                                            </div>
                                            <span className="text-xs font-black text-accent-text uppercase tracking-widest">
                                                AI Context & Predictive Reasoning
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-medium text-primary leading-relaxed italic">
                                            "{forecast?.description || "Analysis generated by LightGBM machine learning models analyzing recurring commitments, 3-month rolling EWMA trend, and seasonal cyclicality."}"
                                        </p>
                                    </div>

                                    {/* Spend Concentration Insight */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Flame size={16} className="text-amber-500" />
                                                <h4 className="text-xs font-bold text-primary">
                                                    Spend Concentration Analysis
                                                </h4>
                                            </div>
                                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                                {concentrationStats.topThreePercentage}% Burden
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-muted leading-relaxed">
                                            Your top 3 spending categories account for <strong className="text-primary">{concentrationStats.topThreePercentage}% ({formatCurrency(concentrationStats.topThreeTotal)})</strong> of your forecasted 30-day burden.
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {concentrationStats.topCategories.map((c, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2.5 py-1 rounded-xl bg-surface border border-border-subtle text-[10px] font-bold text-primary flex items-center gap-1.5"
                                                >
                                                    <span>{c.category}</span>
                                                    <span className="text-accent-text font-black">{formatCurrency(c.predicted_amount)}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Liquidity Cushion vs Forecast */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck size={16} className="text-emerald-500" />
                                                <h4 className="text-xs font-bold text-primary">
                                                    Liquidity Cushion & Safe-to-Spend
                                                </h4>
                                            </div>
                                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                                                Reserve Assessment
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                                            <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                                                <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">
                                                    Current Liquid
                                                </span>
                                                <p className="text-sm font-black text-primary mt-0.5">
                                                    {formatCurrency(safeToSpend?.current_balance || 0)}
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                                                <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">
                                                    Buffer Safety Cushion
                                                </span>
                                                <p className="text-sm font-black text-emerald-500 mt-0.5">
                                                    {formatCurrency(safeToSpend?.buffer_amount || 0)}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-text-muted leading-relaxed">
                                            {safeToSpend?.recommendation || "Maintain your planned liquidity buffer to cushion against ad-hoc cycle spikes."}
                                        </p>
                                    </div>

                                    {/* Model Architecture Transparency */}
                                    <div className="p-4 rounded-2xl bg-surface-subtle/50 border border-border-subtle/60 flex items-start gap-3">
                                        <Info size={16} className="text-text-muted mt-0.5 shrink-0" />
                                        <div className="text-[10px] text-text-muted leading-relaxed">
                                            <strong>Engine Details:</strong> Blended predictive ensemble combining gradient-boosted trees (LightGBM) with recency-gated exponential decay (EWMA) and cyclical month calendar encoding.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Drawer Bottom Bar */}
                        <div className="px-5 sm:px-8 py-3.5 border-t border-border-subtle bg-surface/60 shrink-0 flex items-center justify-between">
                            <div>
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-[2px] block">
                                    Next Cycle Horizon
                                </span>
                                <span className="text-xs font-bold text-primary">
                                    Grip Predictive Intelligence
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-black text-primary tracking-tight">
                                    {formatCurrency(totalBurden)}
                                </span>
                                <p className="text-[8px] text-accent-text font-black uppercase tracking-widest">
                                    Projected Limit
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
