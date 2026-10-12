import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import {
    TrendingUp,
    TrendingDown,
    Layers,
    Sparkles,
    Calendar,
    ChevronRight,
    Filter,
    Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCategoryTrends } from '../../features/dashboard/hooks';
import { useCategories } from '../../features/transactions/categoryHooks';
import { haptics } from '../../lib/haptics';

const PALETTE = [
    '#38BDF8', // Arctic Cyan / Investment
    '#B89D72', // Muted Sandstone Gold
    '#B37D4D', // Warm Muted Clay
    '#5E8C7D', // Muted Sage
    '#687C99', // Muted Slate Navy
    '#A96F6F', // Dusty Rose
    '#64748B', // Slate
    '#4E8A6D', // Deep Emerald
    '#A38B52', // Antique Gold
    '#818CF8', // Indigo
    '#F472B6', // Rose
    '#94A3B8', // Graphite
];

interface CategoryTrendEvolutionProps {
    showSensitive?: boolean;
}

export const CategoryTrendEvolution: React.FC<CategoryTrendEvolutionProps> = ({
    showSensitive = true
}) => {
    const navigate = useNavigate();
    const [monthsHorizon, setMonthsHorizon] = useState<number>(6);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const { data: categoryTrends, isLoading } = useCategoryTrends(monthsHorizon);
    const { data: allCategoriesMeta } = useCategories();

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    // Map color per category directly from Database
    const categoryColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        allCategoriesMeta?.forEach(c => {
            if (c.name && c.color) {
                map[c.name.trim().toLowerCase()] = c.color;
            }
        });
        return map;
    }, [allCategoriesMeta]);

    const getCatColor = (catName: string, index: number) => {
        const normalized = catName.trim().toLowerCase();
        // Priority 1: Exact color stored in DB for this category
        if (categoryColorMap[normalized]) {
            return categoryColorMap[normalized];
        }
        // Priority 2: Fallback for investment if not explicitly assigned in DB
        if (normalized === 'investment') {
            return '#38bdf8';
        }
        // Priority 3: Fallback palette
        return PALETTE[(index + 1) % PALETTE.length];
    };

    // Flatten data for recharts
    const chartData = useMemo(() => {
        if (!categoryTrends?.trends) return [];
        return categoryTrends.trends.map(t => ({
            month: t.month,
            month_label: t.month_label,
            total: Number(t.total || 0),
            ...Object.fromEntries(
                Object.entries(t.categories).map(([k, v]) => [k, Number(v || 0)])
            )
        }));
    }, [categoryTrends]);

    // Categories list sorted: Investment first, then largest volume
    const categoriesList = useMemo(() => {
        if (!categoryTrends?.categories) return [];
        return categoryTrends.categories;
    }, [categoryTrends]);

    // Summary statistics for each category across the selected horizon
    const categoryStats = useMemo(() => {
        if (!categoryTrends?.trends || !categoriesList.length) return [];

        return categoriesList.map((catName, idx) => {
            const isInvestment = catName.toLowerCase() === 'investment';
            const color = getCatColor(catName, idx);
            const monthlyValues = categoryTrends.trends.map(t => Number(t.categories[catName] || 0));
            const total = monthlyValues.reduce((sum, v) => sum + v, 0);
            const avg = monthlyValues.length > 0 ? Math.round(total / monthlyValues.length) : 0;

            // Trend direction: compare last 2 months with spend
            const validPoints = monthlyValues.filter(v => v > 0);
            const first = monthlyValues[0] || 0;
            const last = monthlyValues[monthlyValues.length - 1] || 0;
            const deltaPct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;

            return {
                name: catName,
                isInvestment,
                color,
                total,
                avg,
                monthlyValues,
                deltaPct,
                trend: deltaPct > 10 ? 'up' : deltaPct < -10 ? 'down' : 'stable'
            };
        }).filter(stat => stat.total > 0);
    }, [categoryTrends, categoriesList]);

    return (
        <div className="p-5 sm:p-6 rounded-[2rem] bg-surface-subtle border border-border-subtle space-y-5 shadow-sm">
            {/* Header: Title + Time Horizon Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        <h3 className="text-base font-bold text-text-primary tracking-tight">
                            Category Multi-Month Trajectory
                        </h3>
                    </div>
                    <p className="text-[11px] text-text-muted font-medium mt-0.5">
                        Track how every category and investment evolves across all months
                    </p>
                </div>

                {/* Horizon Switcher */}
                <div className="flex bg-surface p-1 rounded-xl border border-border-subtle self-start sm:self-auto">
                    {[
                        { label: '3M', val: 3 },
                        { label: '6M', val: 6 },
                        { label: '12M', val: 12 }
                    ].map(h => (
                        <button
                            key={h.val}
                            onClick={() => {
                                haptics.selection();
                                setMonthsHorizon(h.val);
                            }}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                monthsHorizon === h.val
                                    ? 'bg-accent-subtle text-accent-text border border-accent-border font-semibold shadow-xs'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            {h.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter Pill Strip: Focus on All or a specific category */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                    onClick={() => {
                        haptics.selection();
                        setSelectedCategory(null);
                    }}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                        selectedCategory === null
                            ? 'bg-primary text-text-inverse border-primary shadow-xs'
                            : 'bg-surface border-border-subtle text-text-muted hover:text-text-primary'
                    }`}
                >
                    All Outflows (Stacked)
                </button>

                {categoriesList.slice(0, 8).map((catName, idx) => {
                    const isSelected = selectedCategory === catName;
                    const isInvestment = catName.toLowerCase() === 'investment';
                    const color = getCatColor(catName, idx);

                    return (
                        <button
                            key={catName}
                            onClick={() => {
                                haptics.selection();
                                setSelectedCategory(isSelected ? null : catName);
                            }}
                            className={`px-3 py-1 rounded-xl text-[10px] font-bold tracking-tight whitespace-nowrap flex items-center gap-1.5 transition-all border ${
                                isSelected
                                    ? 'bg-accent-subtle text-accent-text border-accent-border font-semibold shadow-xs'
                                    : 'bg-surface border-border-subtle text-text-muted hover:text-text-primary'
                            }`}
                        >
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                            />
                            <span>{catName}</span>
                            {isInvestment && (
                                <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 rounded-md bg-accent/20 text-accent-text font-black">
                                    Wealth
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Chart Container */}
            {isLoading ? (
                <div className="h-[280px] flex items-center justify-center animate-pulse text-xs text-text-muted uppercase tracking-wider font-bold">
                    Loading historical trajectory...
                </div>
            ) : chartData.length > 0 ? (
                <div className="h-[280px] sm:h-[320px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        {selectedCategory ? (
                            /* Individual Category Area Trend */
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="selectedCatGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={getCatColor(selectedCategory, 0)} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={getCatColor(selectedCategory, 0)} stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                                <XAxis
                                    dataKey="month_label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: '700' }}
                                    dy={8}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-bg-surface)',
                                        borderRadius: '1rem',
                                        border: '1px solid var(--color-border-subtle)',
                                        backdropFilter: 'blur(20px)',
                                        padding: '10px 14px',
                                        color: 'var(--color-text-primary)'
                                    }}
                                    formatter={(value) => [showSensitive ? formatCurrency(Number(value)) : '••••', selectedCategory]}
                                    labelStyle={{ fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '4px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey={selectedCategory}
                                    stroke={getCatColor(selectedCategory, 0)}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#selectedCatGrad)"
                                />
                            </AreaChart>
                        ) : (
                            /* All Categories Stacked Bar Outflow */
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                                <XAxis
                                    dataKey="month_label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: '700' }}
                                    dy={8}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-bg-surface)',
                                        borderRadius: '1rem',
                                        border: '1px solid var(--color-border-subtle)',
                                        backdropFilter: 'blur(20px)',
                                        padding: '10px 14px',
                                        color: 'var(--color-text-primary)'
                                    }}
                                    formatter={(value, name) => [
                                        showSensitive ? formatCurrency(Number(value)) : '••••',
                                        String(name)
                                    ]}
                                    labelStyle={{ fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '4px' }}
                                />
                                {categoriesList.map((catName, idx) => (
                                    <Bar
                                        key={catName}
                                        dataKey={catName}
                                        stackId="allCategories"
                                        fill={getCatColor(catName, idx)}
                                        radius={idx === categoriesList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="py-12 text-center text-text-muted text-xs font-bold uppercase tracking-wider">
                    No historical multi-month data available
                </div>
            )}

            {/* Performance Breakdown Table / Rows */}
            <div className="space-y-2 pt-2 border-t border-border-subtle/60">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-text-muted px-2">
                    <span>Category & Monthly Pace</span>
                    <span>Total Horizon Spend</span>
                </div>

                {categoryStats.map((stat) => {
                    const maxInSeries = Math.max(...stat.monthlyValues, 1);

                    return (
                        <div
                            key={stat.name}
                            onClick={() => {
                                haptics.selection();
                                setSelectedCategory(selectedCategory === stat.name ? null : stat.name);
                            }}
                            className={`p-3 sm:p-3.5 rounded-2xl bg-surface border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs ${
                                selectedCategory === stat.name
                                    ? 'border-accent-border ring-1 ring-accent-border bg-surface-hover'
                                    : 'border-border-subtle/80 hover:bg-surface-hover'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className="w-3 h-9 rounded-full shrink-0"
                                    style={{ backgroundColor: stat.color }}
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-bold text-text-primary truncate">
                                            {stat.name}
                                        </p>
                                        {stat.isInvestment && (
                                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-accent text-accent-contrast">
                                                Wealth
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-text-muted font-medium mt-0.5">
                                        Pace: {showSensitive ? `${formatCurrency(stat.avg)} / mo` : '••••'}
                                        {' • '}
                                        <span className={stat.deltaPct > 0 ? 'text-status-danger-text' : 'text-status-success-text'}>
                                            {stat.deltaPct > 0 ? `+${stat.deltaPct}%` : `${stat.deltaPct}%`} vs start
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Mini Sparkline Bar Sequence */}
                            <div className="hidden sm:flex items-end gap-1 h-7 px-3 py-1 rounded-xl bg-surface-subtle border border-border-subtle/50">
                                {stat.monthlyValues.map((val, mIdx) => {
                                    const heightPct = Math.max(15, Math.round((val / maxInSeries) * 100));
                                    return (
                                        <div
                                            key={mIdx}
                                            className="w-1.5 rounded-full transition-all"
                                            style={{
                                                height: `${heightPct}%`,
                                                backgroundColor: val > 0 ? stat.color : 'var(--color-border-subtle)'
                                            }}
                                            title={`${categoryTrends?.trends[mIdx]?.month_label}: ${formatCurrency(val)}`}
                                        />
                                    );
                                })}
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-sm sm:text-base font-extrabold text-text-primary tabular-nums">
                                    {showSensitive ? formatCurrency(stat.total) : '••••'}
                                </p>
                                <span className="text-[10px] font-bold text-text-muted flex items-center justify-end gap-0.5">
                                    {selectedCategory === stat.name ? 'Reset' : 'Isolate'} <ChevronRight size={12} />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
