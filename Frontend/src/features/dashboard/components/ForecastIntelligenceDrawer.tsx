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
    Flame,
    ChevronsUpDown,
    CheckCircle2,
    Calendar,
    ArrowDownRight,
    PieChart,
    Scale
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

type ForecastViewMode = 'categories' | 'insights';

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

// Mobile-first robust category icon resolver driven directly from index.css semantic design tokens
const getCategoryMeta = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('invest') || name.includes('mutual') || name.includes('sip') || name.includes('stock')) {
        return {
            icon: TrendingUp,
            badgeBg: 'badge-success',
            color: 'text-status-success'
        };
    }
    if (name.includes('debt') || name.includes('loan') || name.includes('emi') || name.includes('cc') || name.includes('card')) {
        return {
            icon: CreditCard,
            badgeBg: 'badge-danger',
            color: 'text-status-danger'
        };
    }
    if (name.includes('home') || name.includes('house') || name.includes('rent') || name.includes('build')) {
        return {
            icon: Home,
            badgeBg: 'badge-neutral',
            color: 'text-primary'
        };
    }
    if (name.includes('food') || name.includes('dining') || name.includes('restaurant') || name.includes('grocery') || name.includes('eat')) {
        return {
            icon: Utensils,
            badgeBg: 'badge-neutral',
            color: 'text-primary'
        };
    }
    if (name.includes('shop') || name.includes('cloth') || name.includes('store') || name.includes('purchase')) {
        return {
            icon: ShoppingBag,
            badgeBg: 'badge-neutral',
            color: 'text-primary'
        };
    }
    if (name.includes('travel') || name.includes('cab') || name.includes('fuel') || name.includes('car') || name.includes('transport')) {
        return {
            icon: Car,
            badgeBg: 'badge-neutral',
            color: 'text-primary'
        };
    }
    if (name.includes('bill') || name.includes('utilit') || name.includes('electric') || name.includes('power') || name.includes('recharge')) {
        return {
            icon: Zap,
            badgeBg: 'badge-neutral',
            color: 'text-primary'
        };
    }
    if (name.includes('health') || name.includes('med') || name.includes('insur') || name.includes('doctor')) {
        return {
            icon: ShieldCheck,
            badgeBg: 'badge-neutral',
            color: 'text-primary'
        };
    }
    return {
        icon: Layers,
        badgeBg: 'badge-neutral',
        color: 'text-primary'
    };
};

export const ForecastIntelligenceDrawer: React.FC<ForecastIntelligenceDrawerProps> = memo(({
    isOpen,
    onClose,
    forecast,
    safeToSpend,
    formatCurrency
}) => {
    const [viewMode, setViewMode] = useState<ForecastViewMode>('categories');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    // Map tracking category collapsed state: false means expanded, true means collapsed
    const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});

    const totalBurden = Number(forecast?.predicted_burden_30d || 0);
    const breakdown = forecast?.breakdown || [];

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

    // Top categories expanded by default (indices 0 and 1)
    const isCategoryCollapsed = (catName: string, index: number) => {
        if (selectedCategoryFilter !== 'all') {
            // When user explicitly filters to a specific category, always expand it
            return false;
        }
        if (catName in collapsedState) {
            return collapsedState[catName];
        }
        // Expand the top 2 categories by default for high readability
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

    // Filtered categories
    const displayedCategoryGroups = useMemo(() => {
        if (selectedCategoryFilter === 'all') return categoryGroups;
        return categoryGroups.filter(g => g.categoryName.toLowerCase() === selectedCategoryFilter.toLowerCase());
    }, [categoryGroups, selectedCategoryFilter]);

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

    // Top 3 Concentration
    const topThreeConcentration = useMemo(() => {
        const topThree = categoryGroups.slice(0, 3);
        const topThreeSum = topThree.reduce((sum, g) => sum + g.totalAmount, 0);
        const topThreePct = totalBurden > 0 ? Math.round((topThreeSum / totalBurden) * 100) : 0;
        return {
            categories: topThree,
            sum: topThreeSum,
            pct: topThreePct
        };
    }, [categoryGroups, totalBurden]);

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

                    {/* Bottom Sheet Surface (Mobile-First Container) */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.85 }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[92vh] max-h-[92vh] glass-drawer rounded-t-[32px] flex flex-col shadow-2xl overflow-hidden pointer-events-auto z-[2000]"
                    >
                        {/* Apple Grabber Handle Area (Dedicated Drag & Tap Dismiss) */}
                        <div
                            className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
                            onClick={() => {
                                haptics.selection();
                                onClose();
                            }}
                        >
                            <div className="w-10 h-1.5 bg-border-strong rounded-full transition-colors active:scale-95" />
                        </div>

                        {/* Mobile Header: Crisp Title & Subtitle + Close Chevron */}
                        <div className="px-4 sm:px-6 py-3 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-md">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent-text shrink-0 shadow-sm">
                                    <Sparkles size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-black text-primary tracking-tight truncate heading-apple">
                                        Forecast Intelligence
                                    </h3>
                                    <p className="text-[11px] text-text-muted font-bold tracking-wider truncate">
                                        {forecast?.time_frame || 'Next 30 Days'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    haptics.selection();
                                    onClose();
                                }}
                                className="w-9 h-9 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all shadow-sm shrink-0"
                                aria-label="Close"
                            >
                                <ChevronDown size={20} />
                            </button>
                        </div>

                        {/* Top View Selector: 2 Spacious Full-Width Tabs */}
                        <div className="px-4 sm:px-6 pt-2.5 pb-2 border-b border-border-subtle/50 shrink-0 bg-surface/30">
                            <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-subtle border border-border-subtle rounded-2xl">
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setViewMode('categories');
                                    }}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                        viewMode === 'categories'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-muted hover:text-primary'
                                    }`}
                                >
                                    <Layers size={15} />
                                    <span>Categories ({categoryGroups.length})</span>
                                </button>

                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setViewMode('insights');
                                    }}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                        viewMode === 'insights'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-muted hover:text-primary'
                                    }`}
                                >
                                    <Sparkles size={15} />
                                    <span>Insights</span>
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content Container (Smooth touch-pan-y, no scroll lock) */}
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 custom-scrollbar touch-pan-y overscroll-contain">
                            {/* Summary Card (Mobile-First: Big Bold Number, High Contrast) */}
                            <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-between gap-3 shadow-sm">
                                <div className="min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                        Total Predicted 30-Day Burden
                                    </span>
                                    <p className="text-2xl sm:text-3xl font-black text-primary tracking-tight mt-0.5 truncate">
                                        {formatCurrency(totalBurden)}
                                    </p>
                                    <p className="text-xs text-text-muted font-medium mt-1 truncate">
                                        {categoryGroups.length} Categories • {breakdown.length} Subcategories
                                    </p>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${confidenceBadge.pillClass}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${confidenceBadge.dotClass}`} />
                                        {confidenceBadge.label}
                                    </span>
                                    <p className="text-xs font-bold text-text-secondary mt-1.5">
                                        ~{formatCurrency(Math.round(totalBurden / 30))}/day
                                    </p>
                                </div>
                            </div>

                            {/* View 1: Categories Breakdown (Hierarchical: Category -> Subcategories) */}
                            {viewMode === 'categories' && (
                                <div className="space-y-3.5 animate-fadeIn">
                                    {/* Sub-header Controls: Category Filter Chips & Expand All Toggle */}
                                    <div className="flex items-center justify-between gap-2">
                                        {/* Horizontal Category Filter Pills */}
                                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 touch-pan-x flex-1 min-w-0">
                                            <button
                                                onClick={() => {
                                                    haptics.selection();
                                                    setSelectedCategoryFilter('all');
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                                                    selectedCategoryFilter === 'all'
                                                        ? 'bg-primary text-text-inverse border-primary shadow-sm'
                                                        : 'bg-surface-subtle text-text-muted border-border-subtle hover:text-primary'
                                                }`}
                                            >
                                                All ({categoryGroups.length})
                                            </button>
                                            {categoryGroups.map(g => (
                                                <button
                                                    key={g.categoryName}
                                                    onClick={() => {
                                                        haptics.selection();
                                                        setSelectedCategoryFilter(g.categoryName);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 ${
                                                        selectedCategoryFilter.toLowerCase() === g.categoryName.toLowerCase()
                                                            ? 'bg-primary text-text-inverse border-primary shadow-sm'
                                                            : 'bg-surface-subtle text-text-muted border-border-subtle hover:text-primary'
                                                    }`}
                                                >
                                                    <span>{g.categoryName}</span>
                                                    <span className="text-[10px] opacity-75 font-semibold">
                                                        ({g.subcategories.length})
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Expand/Collapse All Button */}
                                        <button
                                            onClick={toggleExpandAll}
                                            className="px-2.5 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-bold text-text-muted hover:text-primary flex items-center gap-1 shrink-0 active:scale-95 transition-all"
                                            title="Toggle Expand All"
                                        >
                                            <ChevronsUpDown size={13} />
                                            <span className="hidden sm:inline">Toggle All</span>
                                        </button>
                                    </div>

                                    {/* Category Cards List */}
                                    <div className="space-y-3">
                                        {displayedCategoryGroups.map((group, groupIdx) => {
                                            const collapsed = isCategoryCollapsed(group.categoryName, groupIdx);
                                            const meta = getCategoryMeta(group.categoryName);
                                            const IconComp = meta.icon;

                                            return (
                                                <div
                                                    key={group.categoryName}
                                                    className="rounded-2xl bg-surface-subtle border border-border-subtle overflow-hidden transition-all shadow-none"
                                                >
                                                    {/* Category Header (Mobile-First: Dedicated Lines for Title and Details) */}
                                                    <div
                                                        onClick={() => toggleCategory(group.categoryName, groupIdx)}
                                                        className="p-3.5 sm:p-4 cursor-pointer bg-surface/40 hover:bg-surface/70 transition-colors select-none"
                                                    >
                                                        {/* Line 1: Icon + Big Readable Category Name on Left, Formatted Total on Right */}
                                                        <div className="flex items-center justify-between gap-2.5">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.badgeBg}`}>
                                                                    <IconComp size={18} />
                                                                </div>
                                                                <h4 className="text-base sm:text-lg font-black text-primary truncate tracking-tight">
                                                                    {group.categoryName}
                                                                </h4>
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-base sm:text-lg font-black text-primary tracking-tight">
                                                                    {formatCurrency(group.totalAmount)}
                                                                </span>
                                                                <div className="w-6 h-6 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted">
                                                                    {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Line 2: Subtitle Info (Item Count & % of Total Budget) */}
                                                        <div className="flex items-center justify-between gap-2 mt-2 pt-1">
                                                            <span className="text-xs text-text-muted font-medium">
                                                                {group.subcategories.length} {group.subcategories.length === 1 ? 'subcategory' : 'subcategories'}
                                                                {group.fixedAmount > 0 && (
                                                                    <span className="ml-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                                                        • {formatCurrency(group.fixedAmount)} fixed
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="text-xs font-bold text-accent-text shrink-0">
                                                                {group.percentageOfTotal.toFixed(1)}% of total
                                                            </span>
                                                        </div>

                                                        {/* Line 3: Category Budget Share Visual Bar */}
                                                        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden mt-2">
                                                            <div
                                                                className="h-full bg-accent-text/80 rounded-full transition-all duration-500"
                                                                style={{ width: `${Math.max(4, group.percentageOfTotal)}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Nested Subcategories Breakdown (Indented hierarchically) */}
                                                    {!collapsed && (
                                                        <div className="p-3 space-y-2.5 border-t border-border-subtle/40 bg-surface/20">
                                                            <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider px-1">
                                                                <span>Subcategory Breakdown</span>
                                                                <span>Share of {group.categoryName}</span>
                                                            </div>

                                                            {group.subcategories.map((sub, subIdx) => (
                                                                <div
                                                                    key={`${group.categoryName}-${sub.subCategoryName}-${subIdx}`}
                                                                    className="p-3 rounded-xl bg-surface border border-border-subtle space-y-2 shadow-xs"
                                                                >
                                                                    {/* Subcategory Row: Name + Commitment Badge on Left, Amount on Right */}
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="text-sm font-bold text-primary truncate">
                                                                                {sub.subCategoryName}
                                                                            </span>
                                                                            {sub.isFixed ? (
                                                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 flex items-center gap-1">
                                                                                    <Repeat size={10} /> Fixed
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-subtle text-accent-text border border-accent-border shrink-0">
                                                                                    Variable
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="text-right shrink-0">
                                                                            <span className="text-sm font-black text-primary">
                                                                                {formatCurrency(sub.amount)}
                                                                            </span>
                                                                            <span className="text-xs text-text-muted font-bold ml-1.5">
                                                                                ({sub.percentageOfCategory.toFixed(0)}%)
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Intra-Category Proportion Bar */}
                                                                    <div className="w-full h-1 bg-surface-subtle rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-primary/70 rounded-full"
                                                                            style={{ width: `${Math.max(4, sub.percentageOfCategory)}%` }}
                                                                        />
                                                                    </div>

                                                                    {/* ML Reason / Justification Callout */}
                                                                    {sub.reason && (
                                                                        <div className="text-xs text-text-secondary leading-relaxed bg-surface-subtle/80 px-2.5 py-1.5 rounded-lg border border-border-subtle/50 flex items-start gap-1.5">
                                                                            <ArrowDownRight size={13} className="text-accent-text shrink-0 mt-0.5" />
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
                            )}

                            {/* View 2: Insights & Rationale */}
                            {viewMode === 'insights' && (
                                <div className="space-y-3.5 animate-fadeIn">
                                    {/* Model Rationale Quote */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-accent-subtle border border-accent-border space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-accent-text" />
                                            <span className="text-xs font-black text-accent-text uppercase tracking-wider">
                                                Predictive Synthesis
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-medium text-primary leading-relaxed italic">
                                            "{forecast?.description || "Analysis generated by LightGBM machine learning models looking at recurring commitments, 3-month rolling EWMA trend, and seasonal cyclicality."}"
                                        </p>
                                    </div>

                                    {/* Fixed vs Variable Split */}
                                    <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs sm:text-sm font-bold text-primary">
                                                Fixed Commitments vs Variable Trend
                                            </span>
                                            <span className="text-[10px] font-bold text-text-muted uppercase">
                                                Breakdown
                                            </span>
                                        </div>

                                        {/* Split Bar */}
                                        <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden flex">
                                            <div
                                                className="h-full bg-emerald-500"
                                                style={{ width: `${spendComposition.fixedPct}%` }}
                                            />
                                            <div
                                                className="h-full bg-accent-text"
                                                style={{ width: `${spendComposition.variablePct}%` }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                                                    Fixed ({spendComposition.fixedPct}%)
                                                </span>
                                                <p className="text-sm sm:text-base font-black text-primary mt-0.5">
                                                    {formatCurrency(spendComposition.fixedTotal)}
                                                </p>
                                                <span className="text-[10px] text-text-muted block mt-0.5">
                                                    SIPs, EMIs, P2P dues
                                                </span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-text block">
                                                    Variable ({spendComposition.variablePct}%)
                                                </span>
                                                <p className="text-sm sm:text-base font-black text-primary mt-0.5">
                                                    {formatCurrency(spendComposition.variableTotal)}
                                                </p>
                                                <span className="text-[10px] text-text-muted block mt-0.5">
                                                    Living & lifestyle spend
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Top 3 Spend Concentration */}
                                    <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <Flame size={16} className="text-amber-500" />
                                                <span className="text-xs sm:text-sm font-bold text-primary">
                                                    Top 3 Categories Concentration
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25">
                                                {topThreeConcentration.pct}% Burden
                                            </span>
                                        </div>

                                        <p className="text-xs text-text-secondary leading-relaxed">
                                            Your top 3 categories account for <strong className="text-primary">{topThreeConcentration.pct}% ({formatCurrency(topThreeConcentration.sum)})</strong> of total upcoming burden:
                                        </p>

                                        <div className="flex flex-wrap gap-2 pt-0.5">
                                            {topThreeConcentration.categories.map((c, i) => (
                                                <span
                                                    key={i}
                                                    className="px-3 py-1.5 rounded-xl bg-surface border border-border-subtle text-xs font-bold text-primary flex items-center gap-1.5"
                                                >
                                                    <span>{c.categoryName}:</span>
                                                    <span className="text-accent-text font-black">{formatCurrency(c.totalAmount)}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Liquidity Assessment */}
                                    <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs sm:text-sm font-bold text-primary">
                                                Liquidity Reserve Check
                                            </span>
                                            <span className="text-[10px] font-bold text-text-muted uppercase">
                                                Safe-to-Spend
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                                            <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                    Current Balance
                                                </span>
                                                <p className="text-sm sm:text-base font-black text-primary mt-0.5">
                                                    {formatCurrency(safeToSpend?.current_balance || 0)}
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                                                    Buffer Reserve
                                                </span>
                                                <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                    {formatCurrency(safeToSpend?.buffer_amount || 0)}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-xs text-text-secondary leading-relaxed">
                                            {safeToSpend?.recommendation || "Maintain your planned liquidity buffer to cushion against ad-hoc cycle spikes."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sticky Bottom Bar: Horizon & Limit Summary */}
                        <div className="px-4 sm:px-6 py-3 border-t border-border-subtle bg-surface/80 backdrop-blur-md shrink-0 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                                    Next Cycle Horizon
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-primary">
                                    Grip Predictive Intelligence
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-base sm:text-lg font-black text-primary tracking-tight block">
                                    {formatCurrency(totalBurden)}
                                </span>
                                <span className="text-[9px] text-accent-text font-black uppercase tracking-wider">
                                    Projected 30-Day Exposure
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
