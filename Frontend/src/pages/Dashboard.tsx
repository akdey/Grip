import React, { useState } from 'react';
import { useSafeToSpend, useMonthlySummary, useForecast, useVariance } from '../features/dashboard/hooks';
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
    Check,
    ChevronDown,
    Receipt,
    X,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../components/ui/Loader';
const PasswordVerifyModal = React.lazy(() => import('../components/ui/PasswordVerifyModal').then(module => ({ default: module.PasswordVerifyModal })));
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import { formatCurrency } from '../lib/formatters';
import { SummaryGrid } from '../features/dashboard/components/SummaryGrid';
import { OutflowLedger } from '../features/dashboard/components/OutflowLedger';
import { SafeToSpendHero } from '../features/dashboard/components/SafeToSpendHero';
import { FrozenAllocation } from '../features/dashboard/components/FrozenAllocation';
import { AIForecast } from '../features/dashboard/components/AIForecast';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [showSensitive, setShowSensitive] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showForecastDetails, setShowForecastDetails] = useState(false);
    const [showObligations, setShowObligations] = useState(false);
    const [scope, setScope] = useState('month');
    const [showScopeMenu, setShowScopeMenu] = useState(false);

    const togglePrivacy = React.useCallback(() => {
        if (showSensitive) {
            setShowSensitive(false);
        } else {
            setShowAuthModal(true);
        }
    }, [showSensitive]);

    const now = new Date();
    const txnFilters = React.useMemo(() => {
        const filters: any = { limit: 5 };
        if (scope === 'month') {
            filters.start_date = format(startOfMonth(now), 'yyyy-MM-dd');
            filters.end_date = format(endOfMonth(now), 'yyyy-MM-dd');
        } else if (scope === 'year') {
            filters.start_date = format(startOfYear(now), 'yyyy-MM-dd');
            filters.end_date = format(endOfYear(now), 'yyyy-MM-dd');
        }
        return filters;
    }, [scope]);

    const { data: summary, isLoading: isSummaryLoading } = useMonthlySummary(undefined, undefined, scope);
    const { data: safeToSpend, isLoading: isSafeLoading } = useSafeToSpend();
    const { data: forecast, isLoading: isForecastLoading } = useForecast();
    const { data: transactions, isLoading: isTxnLoading } = useTransactions(txnFilters);
    const { data: variance, isLoading: isVarianceLoading } = useVariance();

    // Progressive loading - removed blocking loader
    // Blocking loader removed for progressive loading

    const scopes = [
        { id: 'month', label: 'This Month' },
        { id: 'year', label: 'This Year' },
        { id: 'all', label: 'All Time' }
    ];

    return (
        <div className="min-h-screen text-white p-6 pb-24 overflow-x-hidden relative">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 relative z-50">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600 pb-1">
                        {import.meta.env.VITE_APP_NAME || 'Grip'}
                    </h1>
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-[3px] mt-1">{import.meta.env.VITE_APP_TAGLINE || 'Money that minds itself.'}</p>

                    {/* Scope Selector */}
                    <div className="relative mt-6">
                        <button
                            onClick={() => setShowScopeMenu(!showScopeMenu)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors min-w-[100px]"
                            aria-label="Change dashboard scope"
                            aria-expanded={showScopeMenu}
                        >
                            <span>{scopes.find(s => s.id === scope)?.label}</span>
                            <ChevronDown size={10} className={`transition-transform duration-300 ${showScopeMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showScopeMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full left-0 mt-2 w-40 bg-[#1A1A1A] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl z-[100]"
                                >
                                    {scopes.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => { setScope(s.id); setShowScopeMenu(false); }}
                                            className={`w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white/[0.05] transition-all flex items-center justify-between ${scope === s.id ? 'text-white bg-white/[0.05]' : 'text-gray-500'}`}
                                        >
                                            {s.label}
                                            {scope === s.id && <Check size={12} className="text-white" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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
                    <button
                        onClick={() => navigate('/transactions?view=custom')}
                        className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all shadow-2xl"
                        aria-label="Search transactions"
                    >
                        <Search size={22} />
                    </button>
                </div>
            </header>

            <div className="space-y-5 animate-enter section-contain">
                {/* Summary Grid */}
                <SummaryGrid
                    totalIncome={summary?.total_income || 0}
                    totalExpense={summary?.total_expense || 0}
                    isLoading={isSummaryLoading}
                    showSensitive={showSensitive}
                    formatCurrency={formatCurrency}
                />

                <OutflowLedger
                    currentExpense={Number(summary?.current_period_expense || 0)}
                    priorSettlement={Number(summary?.prior_period_settlement || 0)}
                    isLoading={isSummaryLoading}
                    formatCurrency={formatCurrency}
                />

                <SafeToSpendHero
                    safeToSpend={safeToSpend}
                    isLoading={isSafeLoading}
                    showSensitive={showSensitive}
                    formatCurrency={formatCurrency}
                    onNavigate={() => navigate('/analytics')}
                />

                <FrozenAllocation
                    safeToSpend={safeToSpend}
                    isLoading={isSafeLoading}
                    formatCurrency={formatCurrency}
                    onShowObligations={() => setShowObligations(true)}
                />

                <AIForecast
                    forecast={forecast}
                    isLoading={isForecastLoading}
                    formatCurrency={formatCurrency}
                    onShowDetails={() => setShowForecastDetails(true)}
                />

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
                                    aria-label="Close forecast details"
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
                                {forecast?.breakdown && Array.isArray(forecast.breakdown) && forecast.breakdown.length > 0 ? (
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
                <RecentActivity transactions={transactions} formatCurrency={formatCurrency} isLoading={isTxnLoading} />
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

            {/* Obligations Ledger Modal */}
            <AnimatePresence>
                {showObligations && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowObligations(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/[0.1] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                        >
                            <div className="p-8 border-b border-white/[0.05] flex items-center justify-between bg-gradient-to-b from-white/[0.02] to-transparent">
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tighter uppercase">Obligation Ledger</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[3px] mt-1">Identified commitments & surety</p>
                                </div>
                                <button
                                    onClick={() => setShowObligations(false)}
                                    className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                    aria-label="Close obligations ledger"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                                {safeToSpend?.frozen_funds?.obligations && safeToSpend.frozen_funds.obligations.length > 0 ? (
                                    safeToSpend.frozen_funds.obligations.map((obl) => (
                                        <div
                                            key={obl.id}
                                            className="p-4 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between group hover:bg-white/[0.04] transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${obl.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-500' :
                                                    obl.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-cyan-500/10 text-cyan-400'
                                                    }`}>
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white uppercase tracking-tight">{obl.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${obl.type === 'BILL' ? 'bg-blue-500/10 text-blue-400' :
                                                            obl.type === 'SIP' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                obl.type === 'GOAL' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-500/10 text-gray-400'
                                                            }`}>
                                                            {obl.type}
                                                        </span>
                                                        <span className="text-[8px] text-gray-600 font-bold uppercase tracking-wider">
                                                            {format(new Date(obl.due_date), 'MMM dd')} • {obl.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-white tracking-tighter">{formatCurrency(obl.amount)}</p>
                                                <p className="text-[7px] text-gray-700 font-bold uppercase tracking-widest mt-0.5">{obl.sub_category || obl.category || 'General'}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <Receipt size={32} className="mx-auto text-gray-800 mb-4 opacity-20" />
                                        <p className="text-gray-600 font-black uppercase tracking-[4px] text-xs">No obligations identified</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-white/[0.02] border-t border-white/[0.05]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Total Burden</span>
                                    <span className="text-xl font-black text-rose-400 tracking-tighter">
                                        {formatCurrency(Number(safeToSpend?.frozen_funds?.unpaid_bills || 0) + Number(safeToSpend?.frozen_funds?.projected_surety || 0))}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
