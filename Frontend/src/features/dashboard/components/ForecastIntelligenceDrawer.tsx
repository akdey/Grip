import React, { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    ChevronUp,
    Sparkles,
    Layers,
    Activity,
    TrendingUp,
    ShieldCheck,
    Repeat,
    ArrowUpRight,
    Info,
    Flame,
    Filter,
    Check
} from 'lucide-react';
import { haptics } from '../../../lib/haptics';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';
import type { ForecastInfo, SafeToSpend } from '../hooks';

interface ForecastIntelligenceDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    forecast: ForecastInfo | undefined;
    safeToSpend: SafeToSpend | undefined;
    formatCurrency: (amount: number) => string;
}

type ForecastViewMode = 'category' | 'subcategories' | 'think';

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
    subcategories: SubcategoryItem[];
}

export const ForecastIntelligenceDrawer: React.FC<ForecastIntelligenceDrawerProps> = memo(({
    isOpen,
    onClose,
    forecast,
    safeToSpend,
    formatCurrency
}) => {
    const [viewMode, setViewMode] = useState<ForecastViewMode>('category');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    const totalBurden = Number(forecast?.predicted_burden_30d || 0);
    const breakdown = forecast?.breakdown || [];

    // Group breakdown items by Category
    const categoryGroups = useMemo<CategoryGroup[]>(() => {
        const map = new Map<string, {
            total: number;
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
                map.set(cat, { total: 0, items: [] });
            }
            const group = map.get(cat)!;
            group.total += amt;
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

    // Flat list of all subcategories ranked by amount
    const allRankedSubcategories = useMemo<SubcategoryItem[]>(() => {
        const items: SubcategoryItem[] = [];
        for (const group of categoryGroups) {
            items.push(...group.subcategories);
        }
        return items.sort((a, b) => b.amount - a.amount);
    }, [categoryGroups]);

    // Filtered categories
    const displayedCategoryGroups = useMemo(() => {
        if (selectedCategoryFilter === 'all') return categoryGroups;
        return categoryGroups.filter(g => g.categoryName.toLowerCase() === selectedCategoryFilter.toLowerCase());
    }, [categoryGroups, selectedCategoryFilter]);

    // Fixed vs Variable Split for Think View
    const spendComposition = useMemo(() => {
        let fixedTotal = 0;
        let variableTotal = 0;

        for (const item of allRankedSubcategories) {
            if (item.isFixed) {
                fixedTotal += item.amount;
            } else {
                variableTotal += item.amount;
            }
        }

        const fixedPct = totalBurden > 0 ? Math.round((fixedTotal / totalBurden) * 100) : 0;
        const variablePct = totalBurden > 0 ? Math.max(0, 100 - fixedPct) : 0;

        return {
            fixedTotal,
            variableTotal,
            fixedPct,
            variablePct
        };
    }, [allRankedSubcategories, totalBurden]);

    // Top 3 Concentration Stats
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

    const toggleCategoryCollapse = (catName: string) => {
        haptics.selection();
        setCollapsedCategories(prev => ({
            ...prev,
            [catName]: !prev[catName]
        }));
    };

    // Confidence badge styling
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

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex justify-center pointer-events-none">
                    {/* Progressive Backdrop */}
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

                    {/* Bottom Sheet Surface */}
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
                        {/* Grabber Pill */}
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
                                        {forecast?.time_frame || 'Next 30 Days'} • Tabular ML Forecast
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

                        {/* Top View Selector Tabs */}
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
                                    <span className="truncate">By Category</span>
                                </button>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setViewMode('subcategories');
                                    }}
                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                                        viewMode === 'subcategories'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'text-text-muted hover:text-primary hover:bg-surface-hover'
                                    }`}
                                >
                                    <TrendingUp size={13} />
                                    <span className="truncate">Top Ranked</span>
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

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 space-y-6 custom-scrollbar select-text overflow-x-hidden">
                            {/* KPI Overview Strip */}
                            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-subtle border border-border-subtle">
                                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Total Burden
                                    </span>
                                    <p className="text-base sm:text-xl font-black text-primary tracking-tight mt-1 truncate">
                                        {formatCurrency(totalBurden)}
                                    </p>
                                    <span className="text-[8px] font-semibold text-text-muted/80 block mt-0.5 truncate">
                                        30-Day Exposure
                                    </span>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-subtle border border-border-subtle">
                                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Model Accuracy
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${confidenceBadge.dotClass}`} />
                                        <span className="text-xs sm:text-sm font-black text-primary uppercase tracking-tight truncate">
                                            {forecast?.confidence || 'High'}
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-semibold text-text-muted/80 block mt-0.5 truncate">
                                        Reliability Index
                                    </span>
                                </div>

                                <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-subtle border border-border-subtle">
                                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Categories
                                    </span>
                                    <p className="text-base sm:text-xl font-black text-primary tracking-tight mt-1 truncate">
                                        {categoryGroups.length}
                                    </p>
                                    <span className="text-[8px] font-semibold text-text-muted/80 block mt-0.5 truncate">
                                        {breakdown.length} Subcategories
                                    </span>
                                </div>
                            </div>

                            {/* View 1: Category with Subcategory Distribution (Core User Request) */}
                            {viewMode === 'category' && (
                                <div className="space-y-4 animate-fadeIn">
                                    {/* Category Filter Chips */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[9px] font-black uppercase tracking-[3px] text-text-muted flex items-center gap-1.5">
                                                <Filter size={11} />
                                                Filter Category
                                            </span>
                                            <span className="text-[9px] font-semibold text-text-muted">
                                                Showing {displayedCategoryGroups.length} of {categoryGroups.length}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                                            <button
                                                onClick={() => {
                                                    haptics.selection();
                                                    setSelectedCategoryFilter('all');
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                                                    selectedCategoryFilter === 'all'
                                                        ? 'bg-primary text-text-inverse border-primary shadow-sm'
                                                        : 'bg-surface-subtle text-text-muted border-border-subtle hover:text-primary hover:bg-surface-hover'
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
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                                                        selectedCategoryFilter.toLowerCase() === g.categoryName.toLowerCase()
                                                            ? 'bg-primary text-text-inverse border-primary shadow-sm'
                                                            : 'bg-surface-subtle text-text-muted border-border-subtle hover:text-primary hover:bg-surface-hover'
                                                    }`}
                                                >
                                                    <span>{g.categoryName}</span>
                                                    <span className="text-[8px] opacity-75 font-semibold">
                                                        ({g.subcategories.length})
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Grouped Category Cards */}
                                    <div className="space-y-3.5 pt-1">
                                        {displayedCategoryGroups.map((group, groupIdx) => {
                                            const isCollapsed = !!collapsedCategories[group.categoryName];

                                            return (
                                                <div
                                                    key={group.categoryName}
                                                    className="rounded-3xl bg-surface-subtle border border-border-subtle overflow-hidden hover:border-border-default/60 transition-all shadow-none hover:shadow-sm"
                                                >
                                                    {/* Category Header Card */}
                                                    <div
                                                        onClick={() => toggleCategoryCollapse(group.categoryName)}
                                                        className="p-4 sm:p-5 cursor-pointer bg-surface/30 hover:bg-surface/60 transition-colors flex items-center justify-between gap-3"
                                                    >
                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                            <div className="w-11 h-11 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center text-primary shrink-0 shadow-inner">
                                                                <CategoryIcon name={group.categoryName.toLowerCase()} size={20} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="text-sm sm:text-base font-bold text-primary truncate">
                                                                        {group.categoryName}
                                                                    </h4>
                                                                    <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-subtle border border-accent-border text-accent-text shrink-0">
                                                                        {group.percentageOfTotal.toFixed(1)}% of budget
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] font-semibold text-text-muted mt-0.5 truncate">
                                                                    Rank #{groupIdx + 1} • {group.subcategories.length} {group.subcategories.length === 1 ? 'subcategory' : 'subcategories'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="text-right">
                                                                <p className="text-base sm:text-lg font-black text-primary tracking-tight">
                                                                    {formatCurrency(group.totalAmount)}
                                                                </p>
                                                            </div>
                                                            <div className="w-7 h-7 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary transition-colors">
                                                                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Budget Share Progress Bar */}
                                                    <div className="px-4 sm:px-5 pb-2">
                                                        <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-accent-text/80 rounded-full transition-all duration-500"
                                                                style={{ width: `${Math.max(3, group.percentageOfTotal)}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Subcategories Nested Distribution List */}
                                                    {!isCollapsed && (
                                                        <div className="p-3 sm:p-4 pt-1 border-t border-border-subtle/50 space-y-2 bg-surface/10">
                                                            {group.subcategories.map((sub, subIdx) => (
                                                                <div
                                                                    key={`${group.categoryName}-${sub.subCategoryName}-${subIdx}`}
                                                                    className="p-3 sm:p-3.5 rounded-2xl bg-surface border border-border-subtle/70 space-y-2 hover:border-border-default transition-all"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="text-xs sm:text-sm font-bold text-primary truncate">
                                                                                    {sub.subCategoryName}
                                                                                </span>
                                                                                {sub.isFixed ? (
                                                                                    <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                                                                                        <Repeat size={9} /> Fixed
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-accent-subtle text-accent-text border border-accent-border flex items-center gap-1">
                                                                                        <Activity size={9} /> ML Trend
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-[9px] text-text-muted font-semibold mt-0.5 block">
                                                                                {sub.percentageOfCategory.toFixed(0)}% of {group.categoryName}
                                                                            </span>
                                                                        </div>

                                                                        <div className="text-right shrink-0">
                                                                            <span className="text-sm sm:text-base font-black text-primary tracking-tight">
                                                                                {formatCurrency(sub.amount)}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Intra-Category Proportion Bar */}
                                                                    <div className="w-full h-1 bg-surface-subtle rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-primary/70 rounded-full transition-all duration-500"
                                                                            style={{ width: `${Math.max(4, sub.percentageOfCategory)}%` }}
                                                                        />
                                                                    </div>

                                                                    {/* Model Reasoning Quote */}
                                                                    {sub.reason && (
                                                                        <p className="text-[10px] text-text-muted font-medium leading-relaxed bg-surface-subtle/60 px-2.5 py-1.5 rounded-xl border border-border-subtle/40">
                                                                            {sub.reason}
                                                                        </p>
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

                            {/* View 2: All Subcategories Ranked (Flat Leaderboard) */}
                            {viewMode === 'subcategories' && (
                                <div className="space-y-3.5 animate-fadeIn">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={14} className="text-accent-text" />
                                            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[3px]">
                                                All Subcategories Ranked ({allRankedSubcategories.length})
                                            </h4>
                                        </div>
                                        <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">
                                            Highest to Lowest
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {allRankedSubcategories.map((item, idx) => (
                                            <div
                                                key={`${item.categoryName}-${item.subCategoryName}-${idx}`}
                                                className="p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start justify-between gap-3 hover:border-border-default transition-all"
                                            >
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-xs font-black text-text-muted shrink-0 mt-0.5">
                                                        #{idx + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="text-xs sm:text-sm font-bold text-primary truncate">
                                                                {item.subCategoryName}
                                                            </p>
                                                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-surface border border-border-subtle text-text-muted uppercase tracking-wider">
                                                                {item.categoryName}
                                                            </span>
                                                            {item.isFixed && (
                                                                <span className="text-[7px] font-black uppercase px-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                    Fixed
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[9.5px] text-text-muted mt-0.5 line-clamp-1">
                                                            {item.reason}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-black text-primary tracking-tight">
                                                        {formatCurrency(item.amount)}
                                                    </p>
                                                    <span className="text-[8px] font-semibold text-text-muted">
                                                        {item.percentageOfTotal.toFixed(1)}% total
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* View 3: Think & AI Intelligence */}
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

                                    {/* Fixed Commitments vs Variable Trend Split */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Repeat size={16} className="text-emerald-500" />
                                                <h4 className="text-xs font-bold text-primary">
                                                    Fixed Commitments vs Variable Run-Rate
                                                </h4>
                                            </div>
                                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                                                Expense Type Split
                                            </span>
                                        </div>

                                        {/* Split Bar */}
                                        <div className="w-full h-2 bg-surface rounded-full overflow-hidden flex">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-500"
                                                style={{ width: `${spendComposition.fixedPct}%` }}
                                                title={`Fixed: ${spendComposition.fixedPct}%`}
                                            />
                                            <div
                                                className="h-full bg-accent-text transition-all duration-500"
                                                style={{ width: `${spendComposition.variablePct}%` }}
                                                title={`Variable: ${spendComposition.variablePct}%`}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                                            <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-muted">
                                                        Fixed / Recurring ({spendComposition.fixedPct}%)
                                                    </span>
                                                </div>
                                                <p className="text-sm font-black text-emerald-500">
                                                    {formatCurrency(spendComposition.fixedTotal)}
                                                </p>
                                                <span className="text-[8px] text-text-muted">
                                                    SIPs, EMIs, P2P loans, fixed dues
                                                </span>
                                            </div>

                                            <div className="p-3 rounded-xl bg-surface border border-border-subtle">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className="w-2 h-2 rounded-full bg-accent-text" />
                                                    <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-muted">
                                                        Variable Trend ({spendComposition.variablePct}%)
                                                    </span>
                                                </div>
                                                <p className="text-sm font-black text-primary">
                                                    {formatCurrency(spendComposition.variableTotal)}
                                                </p>
                                                <span className="text-[8px] text-text-muted">
                                                    Living expenses, discretionary burn
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Spend Concentration Insight */}
                                    <div className="p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Flame size={16} className="text-amber-500" />
                                                <h4 className="text-xs font-bold text-primary">
                                                    Top Category Concentration
                                                </h4>
                                            </div>
                                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                                {topThreeConcentration.pct}% of Forecast
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-muted leading-relaxed">
                                            Your top 3 spending categories account for <strong className="text-primary">{topThreeConcentration.pct}% ({formatCurrency(topThreeConcentration.sum)})</strong> of your forecasted 30-day burden:
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {topThreeConcentration.categories.map((c, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2.5 py-1 rounded-xl bg-surface border border-border-subtle text-[10px] font-bold text-primary flex items-center gap-1.5"
                                                >
                                                    <span>{c.categoryName}</span>
                                                    <span className="text-accent-text font-black">{formatCurrency(c.totalAmount)}</span>
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
                                            <strong>Engine Details:</strong> Hybrid deterministic recurring expense recognition blended with small-sample regularized LightGBM regression and 3-month continuous EWMA trend decay.
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
