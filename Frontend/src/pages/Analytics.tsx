import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Target, Layers, ChevronLeft, ChevronRight, TrendingDown, Eye, EyeOff, Lock, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useVariance, useInvestments, useMonthlySummary, useSpendTrends, useSafeToSpend } from '../features/dashboard/hooks';
import { useCategories } from '../features/transactions/categoryHooks';
import { SpendTrendChart } from '../components/analytics/SpendTrendChart';
import { MonthlyExpenseCalendar } from '../components/analytics/MonthlyExpenseCalendar';
import { Card } from '../components/ui/Card';

const PasswordVerifyModal = React.lazy(() => import('../components/ui/PasswordVerifyModal').then(module => ({ default: module.PasswordVerifyModal })));

const DEFAULT_CHART_PALETTE = [
    '#B89D72', // Muted Sandstone Gold
    '#B37D4D', // Warm Muted Clay / Ochre
    '#5E8C7D', // Muted Pine Sage
    '#687C99', // Muted Slate Navy
    '#A96F6F', // Dusty Cedar Rose
    '#816F96', // Dusty Violet
    '#4E8A6D', // Deep Muted Emerald
    '#A38B52', // Antique Gold
    '#627D98', // Steel Slate Blue
    '#858F9E', // Slate Graphite
];

import { Logo } from '../components/ui/Logo';

const Analytics: React.FC = () => {
    const navigate = useNavigate();
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [showSensitive, setShowSensitive] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [trendFreq, setTrendFreq] = useState<'weekly' | 'monthly'>('monthly');

    const togglePrivacy = () => {
        if (showSensitive) {
            setShowSensitive(false);
        } else {
            setShowAuthModal(true);
        }
    };

    const { data: categories } = useCategories();
    const { data: variance, isLoading: isVarianceLoading } = useVariance(
        referenceDate.getMonth() + 1,
        referenceDate.getFullYear()
    );
    const { data: summary, isLoading: isSummaryLoading } = useMonthlySummary(
        referenceDate.getMonth() + 1,
        referenceDate.getFullYear()
    );
    const { data: investments, isLoading: isInvestLoading } = useInvestments(
        referenceDate.getMonth() + 1,
        referenceDate.getFullYear()
    );
    const { data: spendTrends, isLoading: isTrendsLoading } = useSpendTrends(30, trendFreq);
    const { data: safeToSpend } = useSafeToSpend();

    const effectiveLiquidBalance = summary?.cumulative_liquid_balance ?? safeToSpend?.current_balance ?? 0;

    const categoryColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories?.forEach(c => {
            if (c.name && c.color) {
                map[c.name.trim().toLowerCase()] = c.color;
            }
        });
        return map;
    }, [categories]);

    const getCategoryColor = (name: string, index: number) => {
        const normalized = (name || '').trim().toLowerCase();
        return categoryColorMap[normalized] || DEFAULT_CHART_PALETTE[index % DEFAULT_CHART_PALETTE.length];
    };

    const categoryData = useMemo(() => {
        if (!variance?.category_breakdown) return [];
        return Object.entries(variance.category_breakdown)
            .map(([name, data]: any, index) => {
                const normalized = (name || '').trim().toLowerCase();
                const color = categoryColorMap[normalized] || DEFAULT_CHART_PALETTE[index % DEFAULT_CHART_PALETTE.length];
                return {
                    name,
                    value: Math.abs(data.current || 0),
                    color,
                    ...data
                };
            })
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [variance, categoryColorMap]);

    const investmentData = useMemo(() => {
        if (!investments?.breakdown) return [];
        return Object.entries(investments.breakdown)
            .map(([name, value]) => ({ name, value: Math.abs(value) }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [investments]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const handleCategoryClick = (categoryName: string) => {
        const start = format(startOfMonth(referenceDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(referenceDate), 'yyyy-MM-dd');
        navigate(`/transactions?view=custom&category=${encodeURIComponent(categoryName)}&start_date=${start}&end_date=${end}`);
    };

    // Blocking loader removed for progressive loading

    return (
        <div className="min-h-screen text-primary p-6 pb-24 overflow-x-hidden relative">
            <header className="flex items-center justify-between mb-8 relative z-50">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black tracking-tighter text-primary heading-apple">
                        Analytics
                    </h1>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5">Financial Intelligence</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePrivacy}
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow-2xl ${showSensitive
                            ? 'bg-accent-subtle border-accent-border text-accent-text'
                            : 'bg-surface-subtle border-border-subtle text-text-muted hover:text-primary'
                            }`}
                        aria-label={showSensitive ? "Hide sensitive data" : "Show sensitive data"}
                    >
                        {showSensitive ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                </div>
            </header>

            <div className="space-y-10 animate-enter">
                {/* Period Selector & Navigator */}
                <div className="space-y-8">
                    {/* Month Navigator */}
                    <div className="flex items-center justify-between px-2">
                        <button
                            onClick={() => setReferenceDate(subMonths(referenceDate, 1))}
                            className="w-12 h-12 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted active:scale-90 transition-all hover:bg-surface-hover hover:text-primary"
                            aria-label="Previous month"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="bg-surface-subtle px-8 py-3 rounded-2xl border border-border-subtle">
                            <span className="text-[12px] font-black uppercase tracking-[3px] text-primary">
                                {format(referenceDate, 'MMMM yyyy')}
                            </span>
                        </div>
                        <button
                            onClick={() => setReferenceDate(addMonths(referenceDate, 1))}
                            className="w-12 h-12 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted active:scale-90 transition-all hover:bg-surface-hover hover:text-primary"
                            aria-label="Next month"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Spend / Income Pills */}
                    <div className="grid grid-cols-2 gap-4">
                        {isSummaryLoading ? (
                            <>
                                <div className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-[2rem] flex items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-white/[0.05]" />
                                    <div className="space-y-2">
                                        <div className="h-2 w-12 bg-white/[0.05] rounded" />
                                        <div className="h-4 w-20 bg-white/[0.05] rounded" />
                                    </div>
                                </div>
                                <div className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-[2rem] flex items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-white/[0.05]" />
                                    <div className="space-y-2">
                                        <div className="h-2 w-12 bg-white/[0.05] rounded" />
                                        <div className="h-4 w-20 bg-white/[0.05] rounded" />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-[2rem] flex items-center gap-3 relative overflow-hidden group hover:bg-rose-500/15 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                                        <TrendingUp size={16} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[8px] font-black text-rose-500/80 uppercase tracking-widest leading-none mb-1">Outflow</span>
                                        <span className="text-sm font-black text-primary tracking-tighter whitespace-nowrap">
                                            {formatCurrency(summary?.cash_outflow ?? summary?.total_expense ?? 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-[2rem] flex items-center gap-3 relative overflow-hidden group hover:bg-emerald-500/15 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                        <TrendingDown size={16} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[8px] font-black text-emerald-500/80 uppercase tracking-widest leading-none mb-1">Income</span>
                                            {!showSensitive && <Lock size={8} className="text-emerald-500/60 mb-1" />}
                                        </div>
                                        <span className="text-sm font-black text-primary tracking-tighter whitespace-nowrap">
                                            {showSensitive ? formatCurrency(summary?.total_income || 0) : '******'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Dual Balance Display: Period Net Flow & Gross Liquid Balance */}
                    {isSummaryLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-3xl flex items-center gap-3 animate-pulse">
                                <div className="w-9 h-9 rounded-2xl bg-white/[0.05]" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-2.5 w-20 bg-white/[0.05] rounded" />
                                    <div className="h-4 w-24 bg-white/[0.05] rounded" />
                                </div>
                            </div>
                            <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-3xl flex items-center gap-3 animate-pulse">
                                <div className="w-9 h-9 rounded-2xl bg-white/[0.05]" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-2.5 w-20 bg-white/[0.05] rounded" />
                                    <div className="h-4 w-24 bg-white/[0.05] rounded" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* 1. Period Net Flow (Surplus / Deficit) */}
                            <div className="bg-surface-subtle border border-border-subtle p-4 rounded-3xl flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${Number(summary?.balance || 0) >= 0 ? 'bg-status-success-bg text-status-success-text border-status-success-border' : 'bg-status-danger-bg text-status-danger-text border-status-danger-border'}`}>
                                        {Number(summary?.balance || 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest truncate">Period Net Flow</p>
                                            {!showSensitive && <Lock size={9} className="text-text-muted" />}
                                        </div>
                                        <p className="text-[8px] text-text-muted/70 font-bold uppercase tracking-wider">Monthly Cash Surplus</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`text-base font-black tracking-tight ${Number(summary?.balance || 0) >= 0 ? 'text-status-success-text' : 'text-status-danger-text'}`}>
                                        {showSensitive ? (
                                            <>
                                                {Number(summary?.balance || 0) < 0 ? '-' : '+'}{formatCurrency(Math.abs(summary?.balance || 0))}
                                            </>
                                        ) : '******'}
                                    </p>
                                </div>
                            </div>

                            {/* 2. Total Liquid Account Balance */}
                            <div className="bg-surface-subtle border border-border-subtle p-4 rounded-3xl flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-2xl bg-accent-subtle text-accent-text flex items-center justify-center shrink-0 border border-accent-border">
                                        <Wallet size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest truncate">Liquid Balance</p>
                                            {!showSensitive && <Lock size={9} className="text-text-muted" />}
                                        </div>
                                        <p className="text-[8px] text-text-muted/70 font-bold uppercase tracking-wider">Bank & Cash Total</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-base font-black text-primary tracking-tight">
                                        {showSensitive ? formatCurrency(effectiveLiquidBalance) : '******'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Monthly Expense Calendar Matrix */}
                <MonthlyExpenseCalendar
                    currentMonth={referenceDate}
                    showSensitive={showSensitive}
                />

                {/* Outflow Analysis Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-text-muted">Outflow Matrix</h2>
                    </div>

                    {isVarianceLoading ? (
                        <div className="glass-card rounded-[2.5rem] p-6 h-[380px] border border-border-subtle animate-pulse relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-40 h-40 rounded-full bg-surface-subtle" />
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card rounded-[2.5rem] p-6 h-[380px] border border-border-subtle relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Layers size={120} />
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                        onClick={(data) => handleCategoryClick(data.name)}
                                        className="cursor-pointer focus:outline-none"
                                    >
                                        {categoryData.map((entry) => (
                                             <Cell
                                                key={entry.name}
                                                fill={entry.color}
                                                style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.08))' }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--color-bg-surface)',
                                            borderRadius: '1.5rem',
                                            border: '1px solid var(--color-border-subtle)',
                                            backdropFilter: 'blur(20px)',
                                            padding: '12px 16px',
                                            color: 'var(--color-text-primary)'
                                        }}
                                        itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-primary)' }}
                                        formatter={(value) => formatCurrency(Number(value))}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '20px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {isVarianceLoading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-[1.8rem] bg-surface-subtle border border-border-subtle animate-pulse">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-8 rounded-full bg-border-subtle" />
                                        <div className="space-y-2">
                                            <div className="h-3 w-32 bg-border-subtle rounded" />
                                            <div className="h-2 w-16 bg-border-subtle rounded" />
                                        </div>
                                    </div>
                                    <div className="h-4 w-20 bg-border-subtle rounded" />
                                </div>
                            ))
                        ) : (
                            categoryData.map((cat) => (
                                <div
                                    key={cat.name}
                                    onClick={() => handleCategoryClick(cat.name)}
                                    className="flex items-center justify-between p-4 rounded-[1.8rem] bg-surface-subtle border border-border-subtle cursor-pointer hover:bg-surface-hover transition-colors active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <div>
                                            <p className="font-black text-primary text-sm uppercase tracking-tight">{cat.name}</p>
                                            <p className="text-[9px] text-text-muted font-bold mt-0.5 uppercase tracking-widest">Growth: {cat.variance_percentage > 0 ? '+' : ''}{cat.variance_percentage.toFixed(0)}%</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-primary text-base tracking-tighter">{formatCurrency(cat.current)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Investment Matrix Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-subtle text-primary flex items-center justify-center">
                            <Target size={16} />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-text-muted">Capital Matrix</h2>
                    </div>

                    {isInvestLoading ? (
                        <div className="glass-card rounded-[2.5rem] p-8 animate-pulse">
                            <div className="h-3 w-24 bg-surface-subtle rounded mb-1" />
                            <div className="h-10 w-48 bg-surface-subtle rounded mb-8" />
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between">
                                            <div className="h-3 w-32 bg-surface-subtle rounded" />
                                            <div className="h-3 w-20 bg-surface-subtle rounded" />
                                        </div>
                                        <div className="w-full h-1 bg-surface-subtle rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card rounded-[2.5rem] p-8">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1 opacity-60">Total Deployed</p>
                            <h3 className="text-4xl font-black text-primary tracking-tighter mb-8">
                                {formatCurrency(Math.abs(investments?.total_investments || 0))}
                            </h3>

                            <div className="space-y-4">
                                {investmentData.map((inv) => {
                                    const percentage = ((inv.value / (investments?.total_investments || 1)) * 100);
                                    return (
                                        <div key={inv.name} className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-text-muted">{inv.name}</span>
                                                <span className="text-primary font-bold">{formatCurrency(inv.value)}</span>
                                            </div>
                                            <div className="w-full h-1 bg-surface-pill rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-1000"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Macro Timeline Section */}
                <div className="space-y-6 pt-10 border-t border-border-subtle">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-subtle text-primary flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                            <h2 className="text-[10px] font-black uppercase tracking-[4px] text-text-muted">Burn Timeline</h2>
                        </div>
                        <div className="flex bg-surface-subtle p-1 rounded-xl border border-border-subtle">
                            <button
                                onClick={() => setTrendFreq('weekly')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${trendFreq === 'weekly' ? 'bg-accent-subtle text-accent-text border border-accent-border font-semibold shadow-sm' : 'text-text-muted hover:text-primary'}`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setTrendFreq('monthly')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${trendFreq === 'monthly' ? 'bg-accent-subtle text-accent-text border border-accent-border font-semibold shadow-sm' : 'text-text-muted hover:text-primary'}`}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    <Card className="p-8 bg-surface-subtle border-border-subtle rounded-[2.5rem]">
                        <div className="mb-6">
                            <h4 className="text-xl font-black text-primary tracking-tighter uppercase whitespace-nowrap">Macro Spending Trend</h4>
                            <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1">
                                {trendFreq === 'monthly' ? 'Last 6 Months Data' : 'Last 12 Weeks Analysis'}
                            </p>
                        </div>

                        {isTrendsLoading ? (
                            <div className="h-[240px] flex items-center justify-center animate-pulse">
                                <div className="text-[10px] font-black uppercase tracking-[3px] text-text-muted">Analyzing History...</div>
                            </div>
                        ) : (
                            <SpendTrendChart data={spendTrends?.trends || []} frequency={trendFreq} />
                        )}
                    </Card>
                </div>
            </div>

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
        </div >
    );
};

export default Analytics;
