import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
    TrendingUp,
    TrendingDown,
    Target,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Lock,
    Wallet,
    Flame,
    Sparkles,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Layers,
    PieChart as PieIcon,
    BarChart3,
    Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
    useVariance,
    useInvestments,
    useMonthlySummary,
    useSpendTrends,
    useSafeToSpend
} from '../features/dashboard/hooks';
import { useCategories } from '../features/transactions/categoryHooks';
import { SpendTrendChart } from '../components/analytics/SpendTrendChart';
import { MonthlyExpenseCalendar } from '../components/analytics/MonthlyExpenseCalendar';
import { PasswordVerifyModal } from '../components/ui/PasswordVerifyModal';
import { usePrivacyStore } from '../lib/store';
import { haptics } from '../lib/haptics';

type AnalyticsMode = 'expenses' | 'investments' | 'combined';

const DEFAULT_CHART_PALETTE = [
    '#B89D72', // Muted Sandstone Gold
    '#B37D4D', // Warm Muted Clay
    '#5E8C7D', // Muted Pine Sage
    '#687C99', // Muted Slate Navy
    '#A96F6F', // Dusty Cedar Rose
    '#64748B', // Muted Slate
    '#4E8A6D', // Deep Muted Emerald
    '#A38B52', // Antique Gold
    '#627D98', // Steel Slate Blue
    '#858F9E', // Slate Graphite
];

const Analytics: React.FC = () => {
    const navigate = useNavigate();
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [mode, setMode] = useState<AnalyticsMode>('expenses');
    const [trendFreq, setTrendFreq] = useState<'weekly' | 'monthly'>('monthly');
    const { showSensitive, setShowSensitive } = usePrivacyStore();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const togglePrivacy = () => {
        if (showSensitive) {
            setShowSensitive(false);
        } else {
            setShowAuthModal(true);
        }
    };

    const monthNum = referenceDate.getMonth() + 1;
    const yearNum = referenceDate.getFullYear();

    const { data: categories } = useCategories();
    const { data: variance, isLoading: isVarianceLoading } = useVariance(monthNum, yearNum);
    const { data: summary, isLoading: isSummaryLoading } = useMonthlySummary(monthNum, yearNum);
    const { data: investments, isLoading: isInvestLoading } = useInvestments(monthNum, yearNum);
    const { data: spendTrends, isLoading: isTrendsLoading } = useSpendTrends(30, trendFreq);
    const { data: safeToSpend } = useSafeToSpend();

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    // Color mapper for categories
    const categoryColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories?.forEach(c => {
            if (c.name && c.color) {
                map[c.name.trim().toLowerCase()] = c.color;
            }
        });
        return map;
    }, [categories]);

    // Financial Metrics Calculation
    const metrics = useMemo(() => {
        const income = Number(summary?.total_income || 0);
        const rawOutflow = Number(summary?.cash_outflow ?? summary?.total_expense ?? 0);
        const investedAmount = Math.abs(Number(investments?.total_investments || 0));

        // True lifestyle burn = Total Outflow minus Capital Investments
        const lifestyleBurn = Math.max(0, rawOutflow - investedAmount);
        const netCashSurplus = income - rawOutflow;
        const savingsRate = income > 0 ? Math.round(((income - lifestyleBurn) / income) * 100) : 0;
        const investRate = income > 0 ? Math.round((investedAmount / income) * 100) : 0;
        const burnRate = income > 0 ? Math.round((lifestyleBurn / income) * 100) : 0;

        return {
            income,
            rawOutflow,
            investedAmount,
            lifestyleBurn,
            netCashSurplus,
            savingsRate,
            investRate,
            burnRate
        };
    }, [summary, investments]);

    // Category Breakdown: Segregated for Lifestyle vs Investment vs All
    const categoryData = useMemo(() => {
        if (!variance?.category_breakdown) return [];

        return Object.entries(variance.category_breakdown)
            .map(([name, data]: any, index) => {
                const normalized = (name || '').trim().toLowerCase();
                const isInvestment = normalized === 'investment' || normalized.includes('sip') || normalized.includes('mutual');
                const color = categoryColorMap[normalized] || DEFAULT_CHART_PALETTE[index % DEFAULT_CHART_PALETTE.length];
                return {
                    name,
                    value: Math.abs(data.current || 0),
                    isInvestment,
                    color,
                    ...data
                };
            })
            .filter(item => {
                if (item.value <= 0) return false;
                if (mode === 'expenses') return !item.isInvestment;
                if (mode === 'investments') return item.isInvestment;
                return true;
            })
            .sort((a, b) => b.value - a.value);
    }, [variance, categoryColorMap, mode]);

    // Total of currently filtered category list
    const filteredCategoryTotal = useMemo(() => {
        return categoryData.reduce((sum, item) => sum + item.value, 0);
    }, [categoryData]);

    // Investment Portfolio Breakdown
    const investmentBreakdownData = useMemo(() => {
        if (!investments?.breakdown) return [];
        const total = Math.abs(Number(investments.total_investments || 1));
        return Object.entries(investments.breakdown)
            .map(([name, value]) => {
                const absVal = Math.abs(Number(value));
                return {
                    name,
                    value: absVal,
                    percentage: total > 0 ? Math.round((absVal / total) * 100) : 0
                };
            })
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [investments]);

    const handleCategoryClick = (categoryName: string) => {
        const start = format(startOfMonth(referenceDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(referenceDate), 'yyyy-MM-dd');
        navigate(`/transactions?view=custom&category=${encodeURIComponent(categoryName)}&start_date=${start}&end_date=${end}`);
    };

    return (
        <div className="min-h-screen text-text-primary p-4 sm:p-6 pb-24 overflow-x-hidden relative space-y-6">
            {/* Top Header */}
            <header className="flex items-center justify-between relative z-40">
                <div className="flex flex-col">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-text-primary heading-apple">
                        Analytics
                    </h1>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5">
                        Financial Intelligence & Capital Flow
                    </p>
                </div>

                <button
                    onClick={togglePrivacy}
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all shadow-xs ${
                        showSensitive
                            ? 'bg-accent-subtle border-accent-border text-accent-text'
                            : 'bg-surface-subtle border-border-subtle text-text-muted hover:text-text-primary'
                    }`}
                    aria-label={showSensitive ? 'Hide sensitive figures' : 'Show sensitive figures'}
                >
                    {showSensitive ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </header>

            {/* Month Navigator */}
            <div className="flex items-center justify-between p-1.5 rounded-2xl bg-surface-subtle border border-border-subtle">
                <button
                    onClick={() => {
                        haptics.selection();
                        setReferenceDate(subMonths(referenceDate, 1));
                    }}
                    className="w-9 h-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted active:scale-90 transition-all hover:text-text-primary"
                    aria-label="Previous month"
                >
                    <ChevronLeft size={18} />
                </button>

                <div className="text-center">
                    <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-text-primary">
                        {format(referenceDate, 'MMMM yyyy')}
                    </span>
                </div>

                <button
                    onClick={() => {
                        haptics.selection();
                        setReferenceDate(addMonths(referenceDate, 1));
                    }}
                    className="w-9 h-9 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted active:scale-90 transition-all hover:text-text-primary"
                    aria-label="Next month"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Executive Cashflow Bar (Requested Hero Metric) */}
            <div className="p-5 sm:p-6 rounded-[2rem] bg-surface-subtle border border-border-subtle space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                Period Net Cashflow
                            </span>
                            {!showSensitive && <Lock size={10} className="text-text-muted" />}
                        </div>
                        <p className={`text-2xl sm:text-3xl font-black tracking-tight mt-0.5 tabular-nums ${
                            metrics.netCashSurplus >= 0 ? 'text-status-success-text' : 'text-status-danger-text'
                        }`}>
                            {showSensitive ? (
                                <>
                                    {metrics.netCashSurplus >= 0 ? '+' : '-'}
                                    {formatCurrency(Math.abs(metrics.netCashSurplus))}
                                </>
                            ) : '••••••'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-xl bg-surface border border-border-subtle text-right">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                Savings Rate
                            </span>
                            <span className="text-sm font-black text-text-primary tabular-nums">
                                {metrics.income > 0 ? `${metrics.savingsRate}%` : 'N/A'}
                            </span>
                        </div>
                        <div className="px-3 py-1 rounded-xl bg-surface border border-border-subtle text-right">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                Capital Deployed
                            </span>
                            <span className="text-sm font-black text-accent-text tabular-nums">
                                {metrics.income > 0 ? `${metrics.investRate}%` : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Segmented Cashflow Flow Strip */}
                <div className="space-y-1.5 pt-1 border-t border-border-subtle/60">
                    <div className="w-full h-2.5 bg-surface-pill rounded-full overflow-hidden flex">
                        {metrics.income > 0 ? (
                            <>
                                {/* Lifestyle Burn Segment */}
                                <div
                                    className="h-full bg-status-danger-solid/80"
                                    style={{ width: `${Math.min(100, metrics.burnRate)}%` }}
                                    title={`Lifestyle Burn: ${metrics.burnRate}%`}
                                />
                                {/* Capital Invested Segment */}
                                <div
                                    className="h-full bg-accent"
                                    style={{ width: `${Math.min(100 - metrics.burnRate, metrics.investRate)}%` }}
                                    title={`Investments: ${metrics.investRate}%`}
                                />
                                {/* Unallocated Surplus Segment */}
                                {metrics.savingsRate > metrics.investRate && (
                                    <div
                                        className="h-full bg-status-success-solid"
                                        style={{ width: `${Math.max(0, metrics.savingsRate - metrics.investRate)}%` }}
                                        title={`Retained Surplus`}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="h-full w-full bg-border-subtle" />
                        )}
                    </div>

                    {/* 3-Column Ticker Breakdown */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center sm:text-left">
                        <div className="p-2 sm:p-2.5 rounded-xl bg-surface border border-border-subtle">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                Income Inflow
                            </span>
                            <span className="text-xs sm:text-sm font-black text-text-primary tabular-nums">
                                {showSensitive ? formatCurrency(metrics.income) : '••••'}
                            </span>
                        </div>

                        <div className="p-2 sm:p-2.5 rounded-xl bg-surface border border-border-subtle">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-status-danger-text block">
                                Lifestyle Burn
                            </span>
                            <span className="text-xs sm:text-sm font-black text-text-primary tabular-nums">
                                {formatCurrency(metrics.lifestyleBurn)}
                            </span>
                        </div>

                        <div className="p-2 sm:p-2.5 rounded-xl bg-surface border border-border-subtle">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-accent-text block">
                                Capital Invested
                            </span>
                            <span className="text-xs sm:text-sm font-black text-text-primary tabular-nums">
                                {formatCurrency(metrics.investedAmount)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mode Segregation Switcher (Requested Toggle) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-surface-subtle border border-border-subtle">
                <button
                    onClick={() => {
                        haptics.selection();
                        setMode('expenses');
                    }}
                    className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        mode === 'expenses'
                            ? 'bg-primary text-text-inverse shadow-sm'
                            : 'text-text-muted hover:text-text-primary'
                    }`}
                >
                    <TrendingDown size={14} />
                    <span className="truncate">Lifestyle Burn</span>
                </button>

                <button
                    onClick={() => {
                        haptics.selection();
                        setMode('investments');
                    }}
                    className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        mode === 'investments'
                            ? 'bg-primary text-text-inverse shadow-sm'
                            : 'text-text-muted hover:text-text-primary'
                    }`}
                >
                    <Target size={14} />
                    <span className="truncate">Investments</span>
                </button>

                <button
                    onClick={() => {
                        haptics.selection();
                        setMode('combined');
                    }}
                    className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        mode === 'combined'
                            ? 'bg-primary text-text-inverse shadow-sm'
                            : 'text-text-muted hover:text-text-primary'
                    }`}
                >
                    <Layers size={14} />
                    <span className="truncate">Combined</span>
                </button>
            </div>

            {/* Mode 1: Lifestyle Expenses Mode */}
            {mode === 'expenses' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Donut Chart & Breakdown */}
                    <div className="p-5 sm:p-6 rounded-[2rem] bg-surface-subtle border border-border-subtle space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-text-primary tracking-tight">
                                    Lifestyle Expense Distribution
                                </h3>
                                <p className="text-[11px] text-text-muted font-medium mt-0.5">
                                    Total Living Consumption: {formatCurrency(metrics.lifestyleBurn)}
                                </p>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full badge-neutral">
                                {categoryData.length} Categories
                            </span>
                        </div>

                        {/* Donut Visualization */}
                        {categoryData.length > 0 ? (
                            <div className="h-[260px] sm:h-[300px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            innerRadius={65}
                                            outerRadius={95}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                            onClick={(data) => handleCategoryClick(data.name)}
                                            className="cursor-pointer focus:outline-none"
                                        >
                                            {categoryData.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={entry.color}
                                                    style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' }}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--color-bg-surface)',
                                                borderRadius: '1rem',
                                                border: '1px solid var(--color-border-subtle)',
                                                backdropFilter: 'blur(20px)',
                                                padding: '8px 12px',
                                                color: 'var(--color-text-primary)'
                                            }}
                                            itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}
                                            formatter={(value) => formatCurrency(Number(value))}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Centered Donut Total Badge */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">
                                        Burn Total
                                    </span>
                                    <span className="text-lg sm:text-xl font-black text-text-primary tabular-nums mt-0.5">
                                        {formatCurrency(filteredCategoryTotal)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-text-muted text-xs font-bold uppercase tracking-wider">
                                No expense transactions recorded for this period
                            </div>
                        )}

                        {/* Category Rows */}
                        <div className="space-y-2 pt-2 border-t border-border-subtle/60">
                            {categoryData.map((cat) => {
                                const sharePct = filteredCategoryTotal > 0 ? ((cat.value / filteredCategoryTotal) * 100).toFixed(1) : '0';
                                return (
                                    <div
                                        key={cat.name}
                                        onClick={() => handleCategoryClick(cat.name)}
                                        className="p-3 sm:p-3.5 rounded-2xl bg-surface border border-border-subtle/80 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-hover active:scale-[0.99] transition-all shadow-xs"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-3 h-8 rounded-full shrink-0"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-text-primary truncate">
                                                    {cat.name}
                                                </p>
                                                <p className="text-[10px] text-text-muted font-medium mt-0.5">
                                                    {sharePct}% of burn • Growth: {cat.variance_percentage > 0 ? '+' : ''}{cat.variance_percentage.toFixed(0)}%
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="text-sm sm:text-base font-extrabold text-text-primary tabular-nums">
                                                {formatCurrency(cat.current)}
                                            </p>
                                            <span className="text-[10px] font-bold text-text-muted flex items-center justify-end gap-0.5">
                                                Details <ChevronRight size={12} />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Daily Expense Rhythm Calendar */}
                    <MonthlyExpenseCalendar
                        currentMonth={referenceDate}
                        showSensitive={showSensitive}
                    />
                </div>
            )}

            {/* Mode 2: Capital Investments Mode */}
            {mode === 'investments' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="p-5 sm:p-6 rounded-[2rem] bg-surface-subtle border border-border-subtle space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-text-primary tracking-tight">
                                    Capital Deployment Matrix
                                </h3>
                                <p className="text-[11px] text-text-muted font-medium mt-0.5">
                                    Asset Allocation & Wealth Building Outflows
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/wealth')}
                                className="px-3 py-1 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                            >
                                <Briefcase size={13} />
                                <span>Wealth Lab</span>
                            </button>
                        </div>

                        {/* Highlight Card */}
                        <div className="p-4 rounded-2xl bg-surface border border-border-subtle flex items-center justify-between gap-3">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                    Total Capital Invested
                                </span>
                                <p className="text-2xl sm:text-3xl font-black text-text-primary mt-0.5 tabular-nums">
                                    {formatCurrency(metrics.investedAmount)}
                                </p>
                                <span className="text-xs text-text-muted font-medium mt-1 block">
                                    {metrics.investRate}% of total monthly income deployed
                                </span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-surface-pill border border-border-subtle flex items-center justify-center text-primary shadow-xs">
                                <Target size={24} />
                            </div>
                        </div>

                        {/* Breakdown Rows */}
                        <div className="space-y-2.5 pt-2 border-t border-border-subtle/60">
                            {investmentBreakdownData.length > 0 ? (
                                investmentBreakdownData.map((inv) => (
                                    <div
                                        key={inv.name}
                                        className="p-3.5 rounded-2xl bg-surface border border-border-subtle space-y-2 shadow-xs"
                                    >
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-text-primary">{inv.name}</span>
                                            <div className="text-right">
                                                <span className="font-black text-text-primary tabular-nums">
                                                    {formatCurrency(inv.value)}
                                                </span>
                                                <span className="text-[10px] text-text-muted font-semibold ml-1.5">
                                                    ({inv.percentage}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-surface-pill rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent transition-all duration-700"
                                                style={{ width: `${inv.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-text-muted text-xs font-bold uppercase tracking-wider">
                                    No investment SIPs or folios tagged for this period
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mode 3: Combined Overview Mode */}
            {mode === 'combined' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Burn vs Invest Ratio Card */}
                    <div className="p-5 sm:p-6 rounded-[2rem] bg-surface-subtle border border-border-subtle space-y-3.5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-text-primary tracking-tight">
                                Consumption vs Wealth Allocation
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                Total: {formatCurrency(metrics.rawOutflow)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-status-danger-text block">
                                    Lifestyle Burn
                                </span>
                                <p className="text-lg sm:text-xl font-black text-text-primary mt-0.5 tabular-nums">
                                    {formatCurrency(metrics.lifestyleBurn)}
                                </p>
                                <span className="text-[10px] text-text-muted font-medium mt-1 block">
                                    {metrics.rawOutflow > 0 ? Math.round((metrics.lifestyleBurn / metrics.rawOutflow) * 100) : 0}% of outflow
                                </span>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-surface border border-border-subtle">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-text block">
                                    Capital Invested
                                </span>
                                <p className="text-lg sm:text-xl font-black text-text-primary mt-0.5 tabular-nums">
                                    {formatCurrency(metrics.investedAmount)}
                                </p>
                                <span className="text-[10px] text-text-muted font-medium mt-1 block">
                                    {metrics.rawOutflow > 0 ? Math.round((metrics.investedAmount / metrics.rawOutflow) * 100) : 0}% of outflow
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Macro Spend Trends Chart */}
                    <div className="p-5 sm:p-6 rounded-[2rem] bg-surface-subtle border border-border-subtle space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-text-primary tracking-tight">
                                    Macro Spending Trajectory
                                </h3>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-0.5">
                                    {trendFreq === 'monthly' ? 'Monthly Rolling View' : 'Weekly Rolling View'}
                                </p>
                            </div>

                            <div className="flex bg-surface p-1 rounded-xl border border-border-subtle">
                                <button
                                    onClick={() => setTrendFreq('weekly')}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                        trendFreq === 'weekly'
                                            ? 'bg-accent-subtle text-accent-text border border-accent-border font-semibold shadow-xs'
                                            : 'text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    Weekly
                                </button>
                                <button
                                    onClick={() => setTrendFreq('monthly')}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                        trendFreq === 'monthly'
                                            ? 'bg-accent-subtle text-accent-text border border-accent-border font-semibold shadow-xs'
                                            : 'text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    Monthly
                                </button>
                            </div>
                        </div>

                        {isTrendsLoading ? (
                            <div className="h-[220px] flex items-center justify-center animate-pulse text-xs text-text-muted uppercase tracking-wider font-bold">
                                Loading macro trajectory...
                            </div>
                        ) : (
                            <SpendTrendChart data={spendTrends?.trends || []} frequency={trendFreq} />
                        )}
                    </div>
                </div>
            )}

            {/* Privacy Verification Modal */}
            <React.Suspense fallback={null}>
                <PasswordVerifyModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={() => {
                        setShowSensitive(true);
                        setShowAuthModal(false);
                    }}
                />
            </React.Suspense>
        </div>
    );
};

export default Analytics;
