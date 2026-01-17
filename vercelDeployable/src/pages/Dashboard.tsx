import React from 'react';
import { useSafeToSpend, useMonthlySummary, useForecast } from '../features/dashboard/hooks';
import { useTransactions } from '../features/transactions/hooks';
import { useAuthStore } from '../lib/store';
import {
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Banknote,
    Receipt,
    ChevronRight,
    Search,
    Lock,
    Sparkles,
    Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { NavLink, useNavigate } from 'react-router-dom';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { Loader } from '../components/ui/Loader';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const { data: summary, isLoading: isSummaryLoading } = useMonthlySummary();
    const { data: safeToSpend, isLoading: isSafeLoading } = useSafeToSpend(0.10);
    const { data: forecast, isLoading: isForecastLoading } = useForecast();
    const { data: transactions, isLoading: isTxnLoading } = useTransactions(5);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);

    if (isSummaryLoading || isSafeLoading || isTxnLoading || isForecastLoading) {
        return <Loader fullPage text="Synchronizing Intelligence" />;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-20 overflow-x-hidden">
            {/* Liquid Header */}
            <header className="px-6 py-8 flex items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">
                        Griply
                    </h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[3px] mt-1">Intelligence Hub</p>
                </div>
                <button
                    onClick={() => navigate('/transactions?view=custom')}
                    className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all shadow-2xl"
                >
                    <Search size={22} />
                </button>
            </header>

            <div className="px-4 space-y-6 animate-enter">
                {/* Safe to Spend - Liquid Hero */}
                <div
                    className="relative p-8 rounded-[3rem] bg-gradient-to-br from-indigo-500 via-indigo-700 to-purple-900 overflow-hidden shadow-[0_40px_80px_-15px_rgba(79,70,229,0.5)] cursor-pointer group transition-all hover:scale-[1.01] active:scale-[0.99]"
                    onClick={() => navigate('/analytics')}
                >
                    {/* Background Decorative Element */}
                    <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                    <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="flex items-center gap-2 mb-4 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                            <Sparkles size={12} className="text-indigo-200" />
                            <span className="text-[10px] font-black uppercase tracking-[3px] text-indigo-100">Safe Liquid</span>
                        </div>

                        <h2 className="text-6xl font-black tracking-tighter text-white mb-2 drop-shadow-2xl">
                            {formatCurrency(Number(safeToSpend?.safe_to_spend) || 0)}
                        </h2>

                        <p className="text-[11px] font-bold text-indigo-100/90 max-w-[240px] leading-relaxed drop-shadow-md">
                            {safeToSpend?.recommendation}
                        </p>

                        {/* Safe to Spend Progress Indicator */}
                        <div className="w-full max-w-[200px] mt-6 space-y-2">
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(Number(safeToSpend?.safe_to_spend) / Number(safeToSpend?.current_balance)) * 100}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                />
                            </div>
                            <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-indigo-200/60 transition-opacity group-hover:opacity-100 opacity-0">
                                <span>Risk Area</span>
                                <span>Safe Zone</span>
                            </div>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-8 mt-6 border-t border-white/10 pt-8">
                            <div className="flex flex-col items-center">
                                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1.5 opacity-60">Gross Liquid</p>
                                <p className="text-lg font-black text-white">{formatCurrency(Number(safeToSpend?.current_balance) || 0)}</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1.5 opacity-60">Safety Buffer</p>
                                <p className="text-lg font-black text-white/90">{formatCurrency(Number(safeToSpend?.buffer_amount) || 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Intelligence Breakdown - Frozen Funds */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Frozen Allocation</h3>
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/10">
                            {formatCurrency(Number(safeToSpend?.frozen_funds.total_frozen) || 0)}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] flex items-center justify-between hover:bg-white/[0.04] transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-inner">
                                    <Receipt size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white/90 uppercase tracking-tight">Unpaid Obligations</p>
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-0.5">Surety / Bills</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-white text-sm tracking-tighter">{formatCurrency(Number(safeToSpend?.frozen_funds.unpaid_bills) || 0)}</p>
                                <p className="text-[7px] text-gray-700 font-bold uppercase tracking-wider mt-0.5">Projected: {formatCurrency(Number(safeToSpend?.frozen_funds.projected_surety) || 0)}</p>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] flex items-center justify-between hover:bg-white/[0.04] transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
                                    <Lock size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white/90 uppercase tracking-tight">Card Exposure</p>
                                    <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-0.5">Pending CC Swipes</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-white text-sm tracking-tighter">{formatCurrency(Number(safeToSpend?.frozen_funds.unbilled_cc) || 0)}</p>
                                <p className="text-[7px] text-gray-700 font-bold uppercase tracking-wider mt-0.5">Settlement Limit</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Forecast Card - New AI Feature */}
                <div className="bg-gradient-to-r from-cyan-600/10 via-purple-600/10 to-transparent border border-white/[0.05] p-6 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute right-6 top-6 animate-pulse text-cyan-400/20">
                        <Sparkles size={40} />
                    </div>
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400">
                                <Activity size={14} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[3px] text-white/40">AI Forecast (30d)</span>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white tracking-tighter">{formatCurrency(forecast?.predicted_burden_30d || 0)}</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Predicted Burden • {forecast?.confidence} confidence</p>
                        </div>
                    </div>
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] flex flex-col gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <ArrowUpRight size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Inflow</p>
                            <p className="text-xl font-black text-white leading-none">{formatCurrency(summary?.total_income || 0)}</p>
                        </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] flex flex-col gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                            <ArrowDownRight size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Outflow</p>
                            <p className="text-xl font-black text-white leading-none">{formatCurrency(summary?.total_expense || 0)}</p>
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Recents</h3>
                        <NavLink to="/transactions" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/10">
                            All <ChevronRight size={10} />
                        </NavLink>
                    </div>

                    <div className="space-y-3">
                        {transactions?.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => navigate(`/transactions/${t.id}`)}
                                className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-[1.8rem] group active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border border-white/[0.08]"
                                        style={{
                                            backgroundColor: `${t.sub_category_color || t.category_color}15` || 'rgba(255,255,255,0.03)',
                                            color: t.sub_category_color || t.category_color || '#fff'
                                        }}
                                    >
                                        <CategoryIcon
                                            name={t.sub_category_icon || t.category_icon}
                                            size={22}
                                            fallback={t.account_type === 'CASH' ? <Banknote size={18} /> : <Receipt size={18} />}
                                        />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <p className="font-bold text-white/90 truncate max-w-[140px] text-base leading-tight">
                                            {t.merchant_name || t.category}
                                        </p>
                                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">
                                            {format(new Date(t.transaction_date || t.created_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-white text-base leading-none tracking-tighter">
                                        {formatCurrency(t.amount)}
                                    </p>
                                    <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-tighter mt-1.5 inline-block ${t.is_manual ? 'border-amber-500/20 text-amber-500/80' : 'border-cyan-500/20 text-cyan-500/80'
                                        }`}>
                                        {t.is_manual ? 'Manual' : 'System'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
