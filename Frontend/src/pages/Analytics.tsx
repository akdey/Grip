import React, { useMemo } from 'react';
import { useVariance, useInvestments } from '../features/dashboard/hooks';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, ArrowLeft, Target, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../components/ui/Loader';

const COLORS = ['#00f2ea', '#ff0050', '#6366f1', '#fbbf24', '#34d399', '#c084fc'];

const Analytics: React.FC = () => {
    const navigate = useNavigate();
    const { data: variance, isLoading: isVarianceLoading } = useVariance();
    const { data: investments, isLoading: isInvestLoading } = useInvestments();

    const categoryData = useMemo(() => {
        if (!variance?.category_breakdown) return [];
        return Object.entries(variance.category_breakdown)
            .map(([name, data]: any) => ({
                name,
                value: data.current || 0,
                ...data
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [variance]);

    const investmentData = useMemo(() => {
        if (!investments?.breakdown) return [];
        return Object.entries(investments.breakdown)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [investments]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    if (isVarianceLoading || isInvestLoading) return <Loader fullPage text="Visualizing Data" />;

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-24 overflow-x-hidden">
            <header className="px-6 py-8 flex items-center gap-4 sticky top-0 bg-[#050505]/60 backdrop-blur-3xl z-30 border-b border-white/[0.05]">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-black tracking-tight uppercase">Intelligence</h1>
            </header>

            <div className="p-6 space-y-12 animate-enter">
                {/* Outflow Analysis Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white/60">Outflow Matrix</h2>
                    </div>

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

                    <div className="space-y-3">
                        {categoryData.slice(0, 5).map((cat, idx) => (
                            <div key={cat.name} className="flex items-center justify-between p-5 rounded-[1.8rem] bg-white/[0.02] border border-white/[0.05]">
                                <div className="flex items-center gap-5">
                                    <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <div>
                                        <p className="font-black text-white/90 text-sm uppercase tracking-tight">{cat.name}</p>
                                        <p className="text-[9px] text-gray-600 font-bold mt-1 uppercase tracking-widest">Growth: {cat.variance_percentage > 0 ? '+' : ''}{cat.variance_percentage.toFixed(0)}%</p>
                                    </div>
                                </div>
                                <p className="font-black text-white text-base tracking-tighter">{formatCurrency(cat.current)}</p>
                            </div>
                        ))}
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

                    <div className="glass-card rounded-[2.5rem] p-8 bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/10">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 opacity-60">Total Deployed</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter mb-8">
                            {formatCurrency(investments?.total_investments || 0)}
                        </h3>

                        <div className="space-y-4">
                            {investmentData.map((inv, idx) => {
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
                </div>
            </div>
        </div>
    );
};

export default Analytics;
