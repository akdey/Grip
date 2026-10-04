import React, { useState } from 'react';
import { useSafeToSpend, useMonthlySummary, useForecast, useVariance } from '../features/dashboard/hooks';
import RecentActivity from '../features/dashboard/components/RecentActivity';
import { useTransactions } from '../features/transactions/hooks';
import {
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Lock,
    Eye,
    EyeOff,
    Check,
    ChevronDown,
    Receipt,
    Calendar,
    Sparkles
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
import { CardExposureDrawer } from '../features/dashboard/components/CardExposureDrawer';

import { Logo } from '../components/ui/Logo';
import { haptics } from '../lib/haptics';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [showSensitive, setShowSensitive] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showForecastDetails, setShowForecastDetails] = useState(false);
    const [showObligations, setShowObligations] = useState(false);
    const [showCardExposure, setShowCardExposure] = useState(false);
    const [scope, setScope] = useState('month');
    const [showScopeMenu, setShowScopeMenu] = useState(false);

    // Lock body scroll when any modal is open
    React.useEffect(() => {
        if (showForecastDetails || showObligations || showCardExposure || showAuthModal) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [showForecastDetails, showObligations, showCardExposure, showAuthModal]);

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
                    <h1 className="text-4xl font-black tracking-tighter text-white pb-1 heading-apple">
                        {import.meta.env.VITE_APP_NAME || 'GRIP'}
                    </h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px] mt-0.5">
                        {import.meta.env.VITE_APP_TAGLINE}
                    </p>

                    {/* Scope Selector */}
                    <div className="relative mt-6">
                        <button
                            onClick={() => setShowScopeMenu(!showScopeMenu)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white transition-colors min-w-[100px]"
                            aria-label="Change dashboard scope"
                            aria-expanded={showScopeMenu}
                        >
                            <span>{scopes.find(s => s.id === scope)?.label}</span>
                            <ChevronDown size={10} className={`transition-transform duration-300 ${showScopeMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
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
                                            className={`w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white/[0.05] transition-all flex items-center justify-between ${scope === s.id ? 'text-accent-text bg-accent-subtle font-semibold' : 'text-gray-500'}`}
                                        >
                                            {s.label}
                                            {scope === s.id && <Check size={12} className="text-accent-text" />}
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
                            ? 'bg-accent-subtle border-accent-border text-accent-text'
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
            </header >

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
                    directExpense={Number(summary?.direct_expense || 0)}
                    creditExpense={Number(summary?.credit_expense || 0)}
                    cashOutflow={Number(summary?.cash_outflow || 0)}
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
                    onShowCardExposure={() => setShowCardExposure(true)}
                />

                <AIForecast
                    forecast={forecast}
                    isLoading={isForecastLoading}
                    formatCurrency={formatCurrency}
                    onShowDetails={() => setShowForecastDetails(true)}
                />

                {/* Activity Feed */}
                <RecentActivity transactions={transactions} formatCurrency={formatCurrency} isLoading={isTxnLoading} />
            </div>

            {/* Forecast Details Drawer */}
            <AnimatePresence>
                {showForecastDetails && (
                    <div className="fixed inset-0 z-[2000] flex justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                haptics.selection();
                                setShowForecastDetails(false);
                            }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
                        />
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
                                    setShowForecastDetails(false);
                                } else {
                                    haptics.selection();
                                }
                            }}
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[90vh] glass-drawer rounded-t-[3rem] flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-auto z-[2000] select-none touch-none"
                        >
                            {/* Grabber Pill */}
                            <div
                                className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                                onClick={() => {
                                    haptics.selection();
                                    setShowForecastDetails(false);
                                }}
                            >
                                <div className="w-10 h-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors active:scale-95" />
                            </div>

                            <div className="p-6 sm:p-8 border-b border-white/[0.06] flex items-center justify-between bg-gradient-to-b from-white/[0.04] to-transparent shrink-0">
                                <div className="flex-1">
                                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic line-clamp-2 heading-apple">Forecast Intelligence</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[4px] mt-1">{forecast?.time_frame}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        haptics.selection();
                                        setShowForecastDetails(false);
                                    }}
                                    className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all shadow-xl group touch-manipulation"
                                    aria-label="Close forecast details"
                                >
                                    <ChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 custom-scrollbar select-text">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-accent-subtle border border-accent-border p-6 rounded-3xl sm:col-span-2">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Sparkles size={16} className="text-accent-text" />
                                            <span className="text-xs font-black text-accent-text uppercase tracking-widest">AI Context & Reasoning</span>
                                        </div>
                                        <p className="text-sm font-medium text-white/90 leading-relaxed italic">
                                            "{forecast?.description || "Analysis provided by predictive models looking at historical burn rates and cyclical patterns."}"
                                        </p>
                                    </div>

                                    <div className="bg-white/[0.05] border border-white/[0.1] p-6 rounded-3xl flex flex-col justify-between">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Total Exposure</p>
                                        <p className="text-2xl font-black text-white tracking-tighter">{formatCurrency(forecast?.predicted_burden_30d || 0)}</p>
                                    </div>

                                    <div className="bg-white/[0.05] border border-white/[0.1] p-6 rounded-3xl flex flex-col justify-between">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Confidence Level</p>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${forecast?.confidence === 'low' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                                            <p className="text-sm font-black text-white uppercase tracking-tight">{forecast?.confidence || 'High'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Categorical Breakdown</h4>
                                        <span className="text-[9px] text-gray-700 font-bold uppercase tracking-widest">Target Allocations</span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {forecast?.breakdown && Array.isArray(forecast.breakdown) && forecast.breakdown.length > 0 ? (
                                            forecast.breakdown.map((item: any, idx: number) => (
                                                <div key={idx} className="flex items-start gap-5 p-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-white/[0.08] transition-colors shrink-0">
                                                        <span className="text-xs font-black">{idx + 1}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0 py-1">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-black text-white uppercase tracking-tight">{item.category}</span>
                                                                {item.sub_category && (
                                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/[0.06] text-white/80 border border-white/10 uppercase tracking-wider">
                                                                        {item.sub_category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-base font-black text-white tracking-tighter">{formatCurrency(item.predicted_amount)}</span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed max-w-[90%]">{item.reason}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-12 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] text-center">
                                                <p className="text-xs text-gray-600 font-black uppercase tracking-widest">No detailed breakdown</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-white/[0.01] border-t border-white/[0.05] shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[3px]">Next Cycle Forecast</span>
                                        <span className="text-xs text-gray-700 font-bold">Generated by Grip Intelligence</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-black text-white tracking-tighter">{formatCurrency(forecast?.predicted_burden_30d || 0)}</span>
                                        <p className="text-[8px] text-accent-text font-black uppercase tracking-widest">Projected Limit</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

            {/* Obligations Ledger Drawer */}
            <AnimatePresence>
                {showObligations && (
                    <div className="fixed inset-0 z-[2000] flex justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                haptics.selection();
                                setShowObligations(false);
                            }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
                        />
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
                                    setShowObligations(false);
                                } else {
                                    haptics.selection();
                                }
                            }}
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[90vh] glass-drawer rounded-t-[3rem] flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-auto z-[2000] select-none touch-none"
                        >
                            {/* Grabber Pill */}
                            <div
                                className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                                onClick={() => {
                                    haptics.selection();
                                    setShowObligations(false);
                                }}
                            >
                                <div className="w-10 h-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors active:scale-95" />
                            </div>

                            <div className="p-6 sm:p-8 border-b border-white/[0.06] flex items-center justify-between bg-gradient-to-b from-white/[0.04] to-transparent shrink-0">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic heading-apple">Obligation Ledger</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[4px] mt-1">Identified commitments & surety</p>
                                </div>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setShowObligations(false);
                                    }}
                                    className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all shadow-xl group touch-manipulation"
                                    aria-label="Close obligations ledger"
                                >
                                    <ChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-4 custom-scrollbar select-text">
                                {safeToSpend?.frozen_funds?.obligations && safeToSpend.frozen_funds.obligations.length > 0 ? (
                                    safeToSpend.frozen_funds.obligations.map((obl) => (
                                        <div
                                            key={obl.id}
                                            className="p-4 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between group hover:bg-white/[0.04] transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${obl.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400' :
                                                    obl.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-white/[0.06] text-white'
                                                    }`}>
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white uppercase tracking-tight">{obl.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/[0.05] text-white/70 border border-white/10">
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

                            <div className="p-8 sm:p-12 bg-white/[0.02] border-t border-white/[0.05]">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Total Active Burden</span>
                                        <span className="text-[9px] text-gray-700 font-bold uppercase tracking-widest">Calculated across all streams</span>
                                    </div>
                                    <span className="text-2xl font-black text-rose-400 tracking-tighter">
                                        {formatCurrency(Number(safeToSpend?.frozen_funds?.unpaid_bills || 0) + Number(safeToSpend?.frozen_funds?.projected_surety || 0))}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Card Exposure Ledger Drawer */}
            <CardExposureDrawer
                isOpen={showCardExposure}
                onClose={() => setShowCardExposure(false)}
                safeToSpend={safeToSpend}
                formatCurrency={formatCurrency}
            />
        </div >
    );
};

export default Dashboard;
