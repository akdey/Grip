import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Target, Layers, ChevronLeft, ChevronRight, TrendingDown, Eye, EyeOff, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useVariance, useInvestments, useMonthlySummary, useSpendTrends } from '../features/dashboard/hooks';
import { SpendTrendChart } from '../components/analytics/SpendTrendChart';
import { Card } from '../components/ui/Card';

const PasswordVerifyModal = React.lazy(() => import('../components/ui/PasswordVerifyModal').then(module => ({ default: module.PasswordVerifyModal })));

const COLORS = ['#00f2ea', '#ff0050', '#6366f1', '#fbbf24', '#34d399', '#c084fc'];

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

    const categoryData = useMemo(() => {
        if (!variance?.category_breakdown) return [];
        return Object.entries(variance.category_breakdown)
            .map(([name, data]: any) => ({
                name,
                value: Math.abs(data.current || 0),
                ...data
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [variance]);

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
        <div className="min-h-screen text-white p-6 pb-24 overflow-x-hidden relative">
            <header className="flex items-center justify-between mb-8 relative z-50">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-gray-500 mb-0.5 opacity-60">
                        {import.meta.env.VITE_APP_NAME || 'Grip'}
                    </p>
                    <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600">
                        Analytics
                    </h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px] mt-0.5">Financial Intelligence</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePrivacy}
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow-2xl ${showSensitive
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-400'
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
                            className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all hover:bg-white/[0.05]"
                            aria-label="Previous month"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="bg-white/[0.03] px-8 py-3 rounded-2xl border border-white/[0.05]">
                            <span className="text-[12px] font-black uppercase tracking-[3px]">
                                {format(referenceDate, 'MMMM yyyy')}
                            </span>
                        </div>
                        <button
                            onClick={() => setReferenceDate(addMonths(referenceDate, 1))}
                            className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all hover:bg-white/[0.05]"
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
                                        <span className="text-[8px] font-black text-rose-500/60 uppercase tracking-widest leading-none mb-1">Spending</span>
                                        <span className="text-sm font-black text-white tracking-tighter whitespace-nowrap">
                                            {formatCurrency(summary?.total_expense || 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-[2rem] flex items-center gap-3 relative overflow-hidden group hover:bg-emerald-500/15 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                        <TrendingDown size={16} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest leading-none mb-1">Income</span>
                                            {!showSensitive && <Lock size={8} className="text-emerald-500/40 mb-1" />}
                                        </div>
                                        <span className="text-sm font-black text-white tracking-tighter whitespace-nowrap">
                                            {showSensitive ? formatCurrency(summary?.total_income || 0) : '******'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Monthly Balance Pill */}
                    <div className="flex justify-center">
                        {isSummaryLoading ? (
                            <div className="bg-white/[0.02] border border-white/[0.08] px-8 py-3 rounded-full flex items-center gap-3 animate-pulse">
                                <div className="h-2 w-16 bg-white/[0.05] rounded" />
                                <div className="h-4 w-24 bg-white/[0.05] rounded" />
                            </div>
                        ) : (
                            <div className="bg-white/[0.03] border border-white/[0.08] px-8 py-3 rounded-full flex items-center gap-3">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Balance</span>
                                {!showSensitive && <Lock size={10} className="text-gray-600" />}
                                <span className={`text-sm font-black tracking-tighter ${Number(summary?.balance) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {showSensitive ? (
                                        <>
                                            {Number(summary?.balance) < 0 ? '-' : ''}{formatCurrency(Math.abs(summary?.balance || 0))}
                                        </>
                                    ) : '******'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Outflow Analysis Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white/60">Outflow Matrix</h2>
                    </div>

                    {isVarianceLoading ? (
                        <div className="glass-card rounded-[2.5rem] p-6 h-[380px] border border-white/[0.05] animate-pulse relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-40 h-40 rounded-full bg-white/[0.05]" />
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card rounded-[2.5rem] p-6 h-[380px] border border-white/[0.05] relative overflow-hidden">
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
                                        {categoryData.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.1))' }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(5, 5, 5, 0.8)',
                                            borderRadius: '1.5rem',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            backdropFilter: 'blur(20px)',
                                            padding: '12px 16px'
                                        }}
                                        itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
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
                                <div key={i} className="flex items-center justify-between p-4 rounded-[1.8rem] bg-white/[0.02] border border-white/[0.05] animate-pulse">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-8 rounded-full bg-white/[0.05]" />
                                        <div className="space-y-2">
                                            <div className="h-3 w-32 bg-white/[0.05] rounded" />
                                            <div className="h-2 w-16 bg-white/[0.05] rounded" />
                                        </div>
                                    </div>
                                    <div className="h-4 w-20 bg-white/[0.05] rounded" />
                                </div>
                            ))
                        ) : (
                            categoryData.map((cat, idx) => (
                                <div
                                    key={cat.name}
                                    onClick={() => handleCategoryClick(cat.name)}
                                    className="flex items-center justify-between p-4 rounded-[1.8rem] bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-colors active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        <div>
                                            <p className="font-black text-white/90 text-sm uppercase tracking-tight">{cat.name}</p>
                                            <p className="text-[9px] text-gray-600 font-bold mt-0.5 uppercase tracking-widest">Growth: {cat.variance_percentage > 0 ? '+' : ''}{cat.variance_percentage.toFixed(0)}%</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-white text-base tracking-tighter">{formatCurrency(cat.current)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Investment Matrix Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <Target size={16} />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white/60">Capital Matrix</h2>
                    </div>

                    {isInvestLoading ? (
                        <div className="glass-card rounded-[2.5rem] p-8 bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/10 animate-pulse">
                            <div className="h-3 w-24 bg-white/[0.05] rounded mb-1" />
                            <div className="h-10 w-48 bg-white/[0.05] rounded mb-8" />
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between">
                                            <div className="h-3 w-32 bg-white/[0.05] rounded" />
                                            <div className="h-3 w-20 bg-white/[0.05] rounded" />
                                        </div>
                                        <div className="w-full h-1 bg-white/[0.05] rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card rounded-[2.5rem] p-8 bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/10">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 opacity-60">Total Deployed</p>
                            <h3 className="text-4xl font-black text-white tracking-tighter mb-8">
                                {formatCurrency(Math.abs(investments?.total_investments || 0))}
                            </h3>

                            <div className="space-y-4">
                                {investmentData.map((inv) => {
                                    const percentage = ((inv.value / (investments?.total_investments || 1)) * 100);
                                    return (
                                        <div key={inv.name} className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-white/60">{inv.name}</span>
                                                <span className="text-white">{formatCurrency(inv.value)}</span>
                                            </div>
                                            <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 transition-all duration-1000"
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
                <div className="space-y-6 pt-10 border-t border-white/[0.05]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                            <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white/60">Burn Timeline</h2>
                        </div>
                        <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
                            <button
                                onClick={() => setTrendFreq('weekly')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${trendFreq === 'weekly' ? 'bg-rose-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setTrendFreq('monthly')}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${trendFreq === 'monthly' ? 'bg-rose-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    <Card className="p-8 bg-gradient-to-br from-rose-600/[0.03] via-transparent to-transparent border-white/[0.05] rounded-[2.5rem]">
                        <div className="mb-6">
                            <h4 className="text-xl font-black text-white tracking-tighter uppercase whitespace-nowrap">Macro Spending Trend</h4>
                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">
                                {trendFreq === 'monthly' ? 'Last 6 Months Data' : 'Last 12 Weeks Analysis'}
                            </p>
                        </div>

                        {isTrendsLoading ? (
                            <div className="h-[240px] flex items-center justify-center animate-pulse">
                                <div className="text-[10px] font-black uppercase tracking-[3px] text-gray-700">Analyzing History...</div>
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
