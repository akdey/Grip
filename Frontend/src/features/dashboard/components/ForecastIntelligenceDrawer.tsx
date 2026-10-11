import React, { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    Sparkles,
    Layers,
    TrendingUp,
    Repeat,
    CreditCard,
    Home,
    Utensils,
    ShoppingBag,
    Car,
    Zap,
    ShieldCheck,
    ChevronsUpDown,
    ArrowDownRight
} from 'lucide-react';
import { haptics } from '../../../lib/haptics';
import type { ForecastInfo, SafeToSpend } from '../hooks';

interface ForecastIntelligenceDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    forecast: ForecastInfo | undefined;
    safeToSpend: SafeToSpend | undefined;
    formatCurrency: (amount: number) => string;
}

interface SubcategoryItem {
    subCategoryName: string;
    categoryName: string;
    amount: number;
    percentageOfCategory: number;
    percentageOfTotal: number;
    reason: string;
    isFixed: boolean;
}

interface CategoryGroup {
    categoryName: string;
    totalAmount: number;
    percentageOfTotal: number;
    fixedAmount: number;
    variableAmount: number;
    subcategories: SubcategoryItem[];
}

const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('invest') || name.includes('mutual') || name.includes('sip') || name.includes('stock')) return TrendingUp;
    if (name.includes('debt') || name.includes('loan') || name.includes('emi') || name.includes('cc') || name.includes('card')) return CreditCard;
    if (name.includes('home') || name.includes('house') || name.includes('rent') || name.includes('build')) return Home;
    if (name.includes('food') || name.includes('dining') || name.includes('restaurant') || name.includes('grocery') || name.includes('eat')) return Utensils;
    if (name.includes('shop') || name.includes('cloth') || name.includes('store') || name.includes('purchase')) return ShoppingBag;
    if (name.includes('travel') || name.includes('cab') || name.includes('fuel') || name.includes('car') || name.includes('transport')) return Car;
    if (name.includes('bill') || name.includes('utilit') || name.includes('electric') || name.includes('power') || name.includes('recharge')) return Zap;
    if (name.includes('health') || name.includes('med') || name.includes('insur') || name.includes('doctor')) return ShieldCheck;
    return Layers;
};

export const ForecastIntelligenceDrawer: React.FC<ForecastIntelligenceDrawerProps> = memo(({
    isOpen,
    onClose,
    forecast,
    safeToSpend,
    formatCurrency
}) => {
    // Map tracking category collapsed state: false means expanded, true means collapsed
    const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});

    const totalBurden = Number(forecast?.predicted_burden_30d || 0);
    const breakdown = forecast?.breakdown || [];
    const dailyPace = totalBurden > 0 ? Math.round(totalBurden / 30) : 0;

    // Group breakdown items hierarchically by Category -> Subcategories
    const categoryGroups = useMemo<CategoryGroup[]>(() => {
        const map = new Map<string, {
            total: number;
            fixedTotal: number;
            variableTotal: number;
            items: Array<{
                subCategoryName: string;
                amount: number;
                reason: string;
                isFixed: boolean;
            }>;
        }>();

        for (const rawItem of breakdown) {
            const cat = (rawItem.category || 'Other').trim();
            const sub = (rawItem.sub_category || 'General').trim();
            const amt = Number(rawItem.predicted_amount) || 0;
            const reason = rawItem.reason || '';
            const isFixed = reason.toLowerCase().includes('fixed recurring') || reason.toLowerCase().includes('recurring');

            if (!map.has(cat)) {
                map.set(cat, { total: 0, fixedTotal: 0, variableTotal: 0, items: [] });
            }
            const group = map.get(cat)!;
            group.total += amt;
            if (isFixed) group.fixedTotal += amt;
            else group.variableTotal += amt;

            group.items.push({
                subCategoryName: sub,
                amount: amt,
                reason,
                isFixed
            });
        }

        const groups: CategoryGroup[] = [];
        map.forEach((value, cat) => {
            const sortedItems = [...value.items].sort((a, b) => b.amount - a.amount);
            groups.push({
                categoryName: cat,
                totalAmount: value.total,
                fixedAmount: value.fixedTotal,
                variableAmount: value.variableTotal,
                percentageOfTotal: totalBurden > 0 ? (value.total / totalBurden) * 100 : 0,
                subcategories: sortedItems.map(item => ({
                    subCategoryName: item.subCategoryName,
                    categoryName: cat,
                    amount: item.amount,
                    percentageOfCategory: value.total > 0 ? (item.amount / value.total) * 100 : 0,
                    percentageOfTotal: totalBurden > 0 ? (item.amount / totalBurden) * 100 : 0,
                    reason: item.reason,
                    isFixed: item.isFixed
                }))
            });
        });

        return groups.sort((a, b) => b.totalAmount - a.totalAmount);
    }, [breakdown, totalBurden]);

    // Spend composition: Fixed vs Variable
    const spendComposition = useMemo(() => {
        let fixedTotal = 0;
        let variableTotal = 0;

        for (const g of categoryGroups) {
            fixedTotal += g.fixedAmount;
            variableTotal += g.variableAmount;
        }

        const fixedPct = totalBurden > 0 ? Math.round((fixedTotal / totalBurden) * 100) : 0;
        const variablePct = totalBurden > 0 ? Math.max(0, 100 - fixedPct) : 0;

        return {
            fixedTotal,
            variableTotal,
            fixedPct,
            variablePct
        };
    }, [categoryGroups, totalBurden]);

    const isCategoryCollapsed = (catName: string, index: number) => {
        if (catName in collapsedState) {
            return collapsedState[catName];
        }
        // Expand the top 2 categories by default for immediate readability
        return index >= 2;
    };

    const toggleCategory = (catName: string, index: number) => {
        haptics.selection();
        const currentCollapsed = isCategoryCollapsed(catName, index);
        setCollapsedState(prev => ({
            ...prev,
            [catName]: !currentCollapsed
        }));
    };

    const toggleExpandAll = () => {
        haptics.selection();
        const allAreCollapsed = categoryGroups.every((g, i) => isCategoryCollapsed(g.categoryName, i));
        const nextState: Record<string, boolean> = {};
        for (const g of categoryGroups) {
            nextState[g.categoryName] = !allAreCollapsed;
        }
        setCollapsedState(nextState);
    };

    // Format reason safely (replace raw $xxx with current formatted currency)
    const formatReason = (reasonText: string) => {
        if (!reasonText) return '';
        return reasonText.replace(/\$(\d+(?:\.\d+)?)/g, (_, amt) => formatCurrency(Number(amt)));
    };

    // Confidence badge styling
    const confidenceBadge = useMemo(() => {
        const conf = (forecast?.confidence || 'medium').toLowerCase();
        if (conf === 'high') {
            return {
                label: 'High Reliability',
                pillClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
                dotClass: 'bg-emerald-500'
            };
        }
        if (conf === 'low') {
            return {
                label: 'Limited History',
                pillClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
                dotClass: 'bg-amber-500'
            };
        }
        return {
            label: 'Standard ML',
            pillClass: 'bg-accent-subtle text-accent-text border-accent-border',
            dotClass: 'bg-accent-text'
        };
    }, [forecast?.confidence]);

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

                    {/* Bottom Sheet Drawer Surface */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.85 }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-[90vh] max-h-[90vh] glass-drawer rounded-t-[2.5rem] flex flex-col shadow-2xl overflow-hidden pointer-events-auto z-[2000]"
                    >
                        {/* Apple Grabber Handle Area */}
                        <div
                            className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
                            onClick={() => {
                                haptics.selection();
                                onClose();
                            }}
                        >
                            <div className="w-10 h-1.5 bg-border-strong rounded-full transition-colors active:scale-95" />
                        </div>

                        {/* Drawer Header */}
                        <div className="px-5 sm:px-6 py-3 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-md">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-surface-pill border border-border-subtle flex items-center justify-center text-primary shrink-0 shadow-xs">
                                    <Sparkles size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-black text-text-primary tracking-tight truncate heading-apple">
                                        Forecast Intelligence
                                    </h3>
                                    <p className="text-[11px] text-text-muted font-bold tracking-wider truncate">
                                        {forecast?.time_frame || 'Next 30 Days'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${confidenceBadge.pillClass}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${confidenceBadge.dotClass}`} />
                                    {confidenceBadge.label}
                                </span>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        haptics.selection();
                                        onClose();
                                    }}
                                    className="w-9 h-9 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all shadow-xs"
                                    aria-label="Close"
                                >
                                    <ChevronDown size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Single-Page Content */}
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 custom-scrollbar touch-pan-y overscroll-contain">
                            {/* Hero Summary Card */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3.5 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                            Total Predicted 30-Day Outflow
                                        </span>
                                        <p className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mt-0.5 tabular-nums">
                                            {formatCurrency(totalBurden)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                            Daily Spend Pace
                                        </span>
                                        <p className="text-sm sm:text-base font-extrabold text-text-primary mt-0.5 tabular-nums">
                                            ~{formatCurrency(dailyPace)}/day
                                        </p>
                                    </div>
                                </div>

                                {/* Fixed vs Variable Segmented Mini-Bar */}
                                <div className="space-y-1.5 pt-1 border-t border-border-subtle/60">
                                    <div className="w-full h-1.5 bg-surface-pill rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-accent"
                                            style={{ width: `${spendComposition.fixedPct}%` }}
                                            title={`Fixed: ${spendComposition.fixedPct}%`}
                                        />
                                        <div
                                            className="h-full bg-border-strong"
                                            style={{ width: `${spendComposition.variablePct}%` }}
                                            title={`Variable: ${spendComposition.variablePct}%`}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-accent" />
                                            <span>Fixed: {formatCurrency(spendComposition.fixedTotal)} ({spendComposition.fixedPct}%)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-border-strong" />
                                            <span>Variable: {formatCurrency(spendComposition.variableTotal)} ({spendComposition.variablePct}%)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Predictive AI Rationale Insight Card */}
                            {forecast?.description && (
                                <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle flex items-start gap-3 shadow-xs">
                                    <div className="w-7 h-7 rounded-lg bg-surface-pill border border-border-subtle flex items-center justify-center text-primary shrink-0 mt-0.5">
                                        <Sparkles size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                            Predictive Synthesis
                                        </p>
                                        <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
                                            {forecast.description}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Category Forecast Breakdown */}
                            <div className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                                        Category Projections ({categoryGroups.length})
                                    </h4>
                                    <button
                                        onClick={toggleExpandAll}
                                        className="text-[11px] font-bold text-text-muted hover:text-text-primary flex items-center gap-1 active:scale-95 transition-all"
                                    >
                                        <ChevronsUpDown size={13} />
                                        <span>Toggle All</span>
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {categoryGroups.map((group, groupIdx) => {
                                        const collapsed = isCategoryCollapsed(group.categoryName, groupIdx);
                                        const IconComp = getCategoryIcon(group.categoryName);

                                        return (
                                            <div
                                                key={group.categoryName}
                                                className="rounded-2xl bg-surface border border-border-subtle overflow-hidden transition-all shadow-xs"
                                            >
                                                {/* Category Header Row */}
                                                <div
                                                    onClick={() => toggleCategory(group.categoryName, groupIdx)}
                                                    className="p-3.5 sm:p-4 cursor-pointer hover:bg-surface-hover transition-colors select-none flex items-center justify-between gap-3"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-xl bg-surface-pill border border-border-subtle flex items-center justify-center text-primary shrink-0">
                                                            <IconComp size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h5 className="text-sm font-bold text-text-primary truncate">
                                                                {group.categoryName}
                                                            </h5>
                                                            <p className="text-[11px] text-text-muted font-medium mt-0.5 truncate">
                                                                {group.subcategories.length} {group.subcategories.length === 1 ? 'item' : 'items'}
                                                                {group.fixedAmount > 0 && (
                                                                    <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                                        • {formatCurrency(group.fixedAmount)} fixed
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <p className="text-sm sm:text-base font-extrabold text-text-primary tabular-nums">
                                                                {formatCurrency(group.totalAmount)}
                                                            </p>
                                                            <p className="text-[10px] text-text-muted font-bold mt-0.5">
                                                                {group.percentageOfTotal.toFixed(1)}% of total
                                                            </p>
                                                        </div>
                                                        <div className="w-5 h-5 flex items-center justify-center text-text-muted">
                                                            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Subcategories */}
                                                {!collapsed && (
                                                    <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-border-subtle/60 bg-surface-subtle/40">
                                                        {group.subcategories.map((sub, subIdx) => (
                                                            <div
                                                                key={`${group.categoryName}-${sub.subCategoryName}-${subIdx}`}
                                                                className="p-2.5 rounded-xl bg-surface border border-border-subtle/80 space-y-1 shadow-xs"
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className="text-xs font-bold text-text-primary truncate">
                                                                            {sub.subCategoryName}
                                                                        </span>
                                                                        {sub.isFixed ? (
                                                                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                                                                                <Repeat size={9} /> Fixed
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-pill text-text-muted border border-border-subtle shrink-0">
                                                                                Variable
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="text-right shrink-0">
                                                                        <span className="text-xs font-extrabold text-text-primary tabular-nums">
                                                                            {formatCurrency(sub.amount)}
                                                                        </span>
                                                                        <span className="text-[10px] text-text-muted font-medium ml-1">
                                                                            ({sub.percentageOfCategory.toFixed(0)}%)
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Quiet rationale whisper */}
                                                                {sub.reason && (
                                                                    <div className="text-[10px] text-text-secondary leading-snug pl-1.5 border-l-2 border-border-subtle mt-1 flex items-start gap-1">
                                                                        <ArrowDownRight size={11} className="text-text-muted shrink-0 mt-0.5" />
                                                                        <span className="min-w-0">
                                                                            {formatReason(sub.reason)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Safe-to-Spend Liquidity Check (Compact Footer Insight) */}
                            {safeToSpend && (
                                <div className="p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-between gap-3 text-left">
                                    <div className="min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                            Liquidity Reserve Check
                                        </span>
                                        <p className="text-xs text-text-secondary leading-snug mt-0.5">
                                            {safeToSpend.recommendation || 'Maintain planned liquidity buffer to cushion against cycle spikes.'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                            Safe Buffer
                                        </span>
                                        <span className="text-sm font-black text-status-success-text tabular-nums">
                                            {formatCurrency(safeToSpend.buffer_amount || 0)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
