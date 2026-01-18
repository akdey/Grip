import React, { useState } from 'react';
import { useSafeToSpend, useMonthlySummary, useForecast } from '../features/dashboard/hooks';
import RecentActivity from '../features/dashboard/components/RecentActivity';
import { useTransactions } from '../features/transactions/hooks';
import {
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Lock,
    Sparkles,
    Activity,
    Eye,
    EyeOff,
    Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../components/ui/Loader';
const PasswordVerifyModal = React.lazy(() => import('../components/ui/PasswordVerifyModal').then(module => ({ default: module.PasswordVerifyModal })));
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [showSensitive, setShowSensitive] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showForecastDetails, setShowForecastDetails] = useState(false);

    const togglePrivacy = () => {
        if (showSensitive) {
            setShowSensitive(false);
        } else {
            setShowAuthModal(true);
        }
    };

    const { data: summary, isLoading: isSummaryLoading } = useMonthlySummary();
    const { data: safeToSpend, isLoading: isSafeLoading } = useSafeToSpend(0.10);
    const { data: forecast, isLoading: isForecastLoading } = useForecast();
    const { data: transactions, isLoading: isTxnLoading } = useTransactions({ limit: 5 });

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
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePrivacy}
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow-2xl ${showSensitive
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-400'
                            }`}
                    >
                        {showSensitive ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                    <button
                        onClick={() => navigate('/transactions?view=custom')}
                        className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all shadow-2xl"
                    >
                        <Search size={22} />
                    </button>
                </div>
            </header>

            <div className="px-4 space-y-6 animate-enter">
                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] flex flex-col gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <ArrowUpRight size={20} />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Inflow</p>
                                {!showSensitive && <Lock size={10} className="text-gray-600" />}
                            </div>
                            <p className="text-xl font-black text-white leading-none">
                                {showSensitive ? formatCurrency(summary?.total_income || 0) : '******'}
                            </p>
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


                {/* Safe to Spend - Liquid Glass Hero */}
                {(() => {
                    const safe = Number(safeToSpend?.safe_to_spend || 0);
                    const balance = Number(safeToSpend?.current_balance || 0);
                    const status = balance <= 0 || safe <= 0 ? 'danger' : safe < balance * 0.25 ? 'warning' : 'success';

                    const themes = {
                        danger: {
                            glow: 'bg-rose-500/20',
                            border: 'border-rose-500/20',
                            text: 'text-rose-400',
                            shadow: 'shadow-[0_40px_80px_-15px_rgba(225,29,72,0.15)]',
                            pill: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        },
                        warning: {
                            glow: 'bg-amber-500/20',
                            border: 'border-amber-500/20',
                            text: 'text-amber-400',
                            shadow: 'shadow-[0_40px_80px_-15px_rgba(245,158,11,0.15)]',
                            pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        },
                        success: {
                            glow: 'bg-indigo-500/20',
                            border: 'border-white/[0.08]',
                            text: 'text-indigo-400',
                            shadow: 'shadow-[0_40px_80px_-15px_rgba(79,70,229,0.2)]',
                            pill: 'bg-white/[0.05] text-indigo-300 border-white/[0.05]'
                        }
                    };

                    const theme = themes[status];

                    return (
                        <div
                            className={`relative p-8 rounded-[3.5rem] bg-white/[0.01] backdrop-blur-3xl border ${theme.border} overflow-hidden ${theme.shadow} cursor-pointer group transition-all duration-700 hover:scale-[1.01] active:scale-[0.99]`}
                            onClick={() => navigate('/analytics')}
                        >
                            {/* Liquid Glass Background Effects */}
                            <div className={`absolute -right-20 -top-20 w-80 h-80 ${theme.glow} rounded-full blur-[100px] opacity-50 group-hover:opacity-80 transition-all duration-700`} />
                            <div className={`absolute -left-20 -bottom-20 w-64 h-64 ${theme.glow} rounded-full blur-[80px] opacity-30`} />

                            {/* Inner Glass Sheen */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />

                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className={`flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border ${theme.pill} backdrop-blur-md`}>
                                    <Sparkles size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-[3px]">Safe Liquid</span>
                                </div>

                                <h2 className="text-6xl font-black tracking-tighter text-white mb-2">
                                    {formatCurrency(safe)}
                                </h2>

                                <p className="text-[11px] font-medium text-gray-400 max-w-[240px] leading-relaxed">
                                    {safeToSpend?.recommendation}
                                </p>

                                {/* Progress Indicator - Glass Style */}
                                <div className="w-full max-w-[200px] mt-8 space-y-3">
                                    <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((safe / Math.max(balance, 1)) * 100, 100)}%` }}
                                            transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                                            className={`h-full bg-gradient-to-r from-white to-white/60 shadow-[0_0_20px_rgba(255,255,255,0.3)]`}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[7px] font-black uppercase tracking-[2px] text-gray-600">
                                        <span>Risk</span>
                                        <span>Capacity</span>
                                    </div>
                                </div>

                                <div className="w-full grid grid-cols-2 gap-8 mt-10 border-t border-white/[0.05] pt-8">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Gross Liquid</p>
                                            {!showSensitive && <Lock size={8} className="text-gray-500" />}
                                        </div>
                                        <p className="text-xl font-black text-white/90">
                                            {showSensitive ? formatCurrency(balance) : '******'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 opacity-60">Buffer</p>
                                        <p className="text-xl font-black text-white/70">{formatCurrency(Number(safeToSpend?.buffer_amount || 0))}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

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
                <div
                    onClick={() => setShowForecastDetails(true)}
                    className="bg-gradient-to-r from-cyan-600/10 via-purple-600/10 to-transparent border border-white/[0.05] p-6 rounded-[2.5rem] relative overflow-hidden group cursor-pointer active:scale-95 transition-all"
                >
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
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Predicted Burden • {forecast?.time_frame}</p>
                            <p className="text-[10px] text-cyan-200/60 font-medium leading-tight mt-3 max-w-[260px]">{forecast?.description}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest">Tap for breakdown</span>
                            <ArrowUpRight size={10} className="text-cyan-400" />
                        </div>
                    </div>
                </div>

                {/* Forecast Details Modal */}
                {showForecastDetails && (
                    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-[#0A0A0A] border border-white/[0.1] w-full max-w-lg rounded-[2.5rem] p-8 space-y-6 max-h-[85vh] overflow-y-auto shadow-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">Forecast Intelligence</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{forecast?.time_frame}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowForecastDetails(false); }}
                                    className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-gray-400 active:scale-95 transition-all"
                                >
                                    <ArrowDownRight size={20} className="rotate-45" />
                                </button>
                            </div>

                            <div className="bg-cyan-500/5 border border-cyan-500/10 p-6 rounded-3xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <Sparkles size={16} className="text-cyan-400" />
                                    <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">AI Insight</span>
                                </div>
                                <p className="text-sm font-medium text-cyan-100/80 leading-relaxed">
                                    {forecast?.description || "Analysis provided by predictive models."}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[3px]">Projected Categories</h4>
                                {forecast?.breakdown && forecast.breakdown.length > 0 ? (
                                    forecast.breakdown.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-4 p-4 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
                                            <div className="w-10 h-10 rounded-2xl bg-white/[0.05] flex items-center justify-center text-gray-400 shrink-0">
                                                <span className="text-xs font-black">{idx + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-black text-white uppercase tracking-tight">{item.category}</span>
                                                    <span className="text-sm font-bold text-cyan-400">{formatCurrency(item.predicted_amount)}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 font-medium leading-normal">{item.reason}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] text-center">
                                        <p className="text-xs text-gray-500 font-medium">No category-specific breakdown available for this model.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Feed */}
                <RecentActivity transactions={transactions} formatCurrency={formatCurrency} />
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
        </div>
    );
};

export default Dashboard;
