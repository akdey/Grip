import React, { useState, useEffect, useMemo } from 'react';
import { HoldingDetailsModal } from '../components/wealth/HoldingDetailsModal';
import { WealthLinker } from '../components/wealth/WealthLinker';
import { AddHoldingModal } from '../components/wealth/AddHoldingModal';
import { InvestmentSimulatorModal } from '../components/wealth/InvestmentSimulatorModal';
import { StatementImportModal } from '../components/wealth/StatementImportModal';
import { WealthCategoryCard } from '../components/wealth/WealthCategoryCard';
import WealthIntelligence from '../components/wealth/WealthIntelligence';
import { motion } from 'framer-motion';
import {
    TrendingUp, Wallet, Plus, RefreshCw, Link as LinkIcon,
    Activity, PieChart, Upload, Calculator, BrainCircuit,
    Layers, LineChart, Sparkles, Landmark, Repeat, ShieldCheck,
    Coins, ArrowUpRight
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import { api } from '../lib/api';

// Types
interface Holding {
    id: string;
    name: string;
    asset_type: string;
    current_value: number;
    total_invested: number;
    xirr: number | null;
    ticker_symbol: string | null;
    interest_rate?: number | null;
    maturity_date?: string | null;
}

interface ForecastPoint {
    date: string;
    yhat: number;
    yhat_lower: number;
    yhat_upper: number;
}

interface ForecastResponse {
    history: ForecastPoint[];
    forecast: ForecastPoint[];
    summary_text: string;
}

const Wealth: React.FC = () => {
    // Mode: 'portfolio' (clean asset ledger) vs 'lab' (techy forecasting/ML/simulations)
    const [viewMode, setViewMode] = useState<'portfolio' | 'lab'>('portfolio');

    // Data States
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [unassignedTxns, setUnassignedTxns] = useState<any[]>([]);
    const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
    const [holdingsLoading, setHoldingsLoading] = useState(true);
    const [forecastLoading, setForecastLoading] = useState(false);
    const [autoDetecting, setAutoDetecting] = useState(false);
    const [simulating, setSimulating] = useState(false);

    // Lab Sub Tabs
    const [activeLabTab, setActiveLabTab] = useState<'trajectory' | 'intelligence'>('trajectory');

    // Modal States
    const [isLinkerOpen, setIsLinkerOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isStatementImportOpen, setIsStatementImportOpen] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState<any | null>(null);

    // Simulation State (Quick Forecast params)
    const [monthlySIP, setMonthlySIP] = useState(5000);
    const [years, setYears] = useState(10);

    const fetchHoldingDetails = async (id: string) => {
        try {
            const res = await api.get(`/wealth/holdings/${id}`);
            setSelectedHolding(res.data);
        } catch (e) {
            console.error("Failed to fetch holding details", e);
        }
    };

    const fetchHoldingsAndUnassigned = async () => {
        setHoldingsLoading(true);
        try {
            const [holdingsRes, unassignedRes] = await Promise.all([
                api.get('/wealth/holdings'),
                api.get('/wealth/unassigned-transactions').catch(() => ({ data: [] }))
            ]);
            setHoldings(holdingsRes.data || []);
            setUnassignedTxns(unassignedRes.data || []);
        } catch (err) {
            console.error("Failed to fetch wealth assets", err);
        } finally {
            setHoldingsLoading(false);
        }
    };

    const fetchForecast = async () => {
        if (forecastData) return;
        setForecastLoading(true);
        try {
            const res = await api.post('/wealth/forecast', { years: 10, monthly_investment: 0 });
            setForecastData(res.data);
        } catch (err) {
            console.error("Failed to fetch forecast", err);
        } finally {
            setForecastLoading(false);
        }
    };

    const handleAutoDetect = async () => {
        setAutoDetecting(true);
        try {
            const res = await api.post('/wealth/auto-detect-portfolio');
            alert(`Auto-detected ${res.data.holdings_created} new assets and mapped ${res.data.transactions_linked} transactions!`);
            fetchHoldingsAndUnassigned();
        } catch (error) {
            console.error("Auto detect failed", error);
            alert("Auto detection encountered an issue");
        } finally {
            setAutoDetecting(false);
        }
    };

    const runSimulation = async () => {
        setSimulating(true);
        try {
            const res = await api.post('/wealth/forecast', { years, monthly_investment: monthlySIP });
            setForecastData(res.data);
        } catch (error) {
            console.error("Simulation failed", error);
        } finally {
            setSimulating(false);
        }
    };

    useEffect(() => {
        fetchHoldingsAndUnassigned();
    }, []);

    // Derived Metrics
    const totalWealth = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
    const absoluteReturn = totalWealth - totalInvested;
    const returnPercentage = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

    // Group holdings into clean financial asset classes
    const groupedHoldings = useMemo(() => {
        const mutualFunds = holdings.filter(h => ['MUTUAL_FUND', 'SIP', 'STOCK'].includes(h.asset_type));
        const recurringDeposits = holdings.filter(h => h.asset_type === 'RD');
        const fixedDeposits = holdings.filter(h => h.asset_type === 'FD');
        const govtPensions = holdings.filter(h => ['APY', 'PLI', 'PF', 'GRATUITY'].includes(h.asset_type));
        const goldAndOther = holdings.filter(h => ['GOLD', 'REAL_ESTATE', 'OTHER'].includes(h.asset_type) || !['MUTUAL_FUND', 'SIP', 'STOCK', 'RD', 'FD', 'APY', 'PLI', 'PF', 'GRATUITY'].includes(h.asset_type));

        return {
            mutualFunds,
            recurringDeposits,
            fixedDeposits,
            govtPensions,
            goldAndOther
        };
    }, [holdings]);

    // Active Monthly Commitments calculation
    const monthlyCommitment = useMemo(() => {
        let total = 0;
        // Add monthly RD (typically ₹5,000)
        groupedHoldings.recurringDeposits.forEach(rd => {
            total += 5000;
        });
        // Add APY (₹409) and PLI (₹1,880)
        groupedHoldings.govtPensions.forEach(gp => {
            if (gp.name.toLowerCase().includes('apy') || gp.asset_type === 'APY') total += 409;
            else if (gp.name.toLowerCase().includes('pli') || gp.asset_type === 'PLI') total += 1880;
        });
        // Add SIPs
        groupedHoldings.mutualFunds.forEach(mf => {
            // estimate or average
            total += 3000;
        });
        return total;
    }, [groupedHoldings]);

    // Chart Data Preparation for Lab
    const chartData = useMemo(() => {
        if (!forecastData) return [];

        const historyPoints = forecastData.history.map(p => ({
            date: new Date(p.date).toLocaleDateString([], { month: 'short', year: '2-digit' }),
            value: p.yhat,
            forecast: null,
            fullDate: p.date
        }));

        const lastHistory = historyPoints[historyPoints.length - 1];

        const forecastPoints = forecastData.forecast.map(p => ({
            date: new Date(p.date).toLocaleDateString([], { month: 'short', year: '2-digit' }),
            value: null,
            forecast: p.yhat,
            fullDate: p.date
        }));

        if (lastHistory && forecastPoints.length > 0) {
            forecastPoints.unshift({
                ...lastHistory,
                forecast: lastHistory.value,
                value: null
            });
        }

        return [...historyPoints, ...forecastPoints];
    }, [forecastData]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="min-h-screen text-primary p-6 pb-24 overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black tracking-tighter text-primary heading-apple">
                        {viewMode === 'portfolio' ? 'Assets & Portfolio' : 'Wealth Lab'}
                    </h1>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5">
                        {viewMode === 'portfolio' ? 'Holdings, Commitments & Verification' : 'ML Forecasts, What-If & Analytics'}
                    </p>
                </div>

                {/* Navigation and Top Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* View Switcher Pill */}
                    <div className="flex items-center bg-surface p-1 rounded-2xl border border-border-subtle">
                        <button
                            onClick={() => setViewMode('portfolio')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                viewMode === 'portfolio'
                                    ? 'bg-accent text-black shadow-sm'
                                    : 'text-text-muted hover:text-primary'
                            }`}
                        >
                            <Layers size={13} />
                            Portfolio
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('lab');
                                if (!forecastData) fetchForecast();
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                viewMode === 'lab'
                                    ? 'bg-accent text-black shadow-sm'
                                    : 'text-text-muted hover:text-primary'
                            }`}
                        >
                            <BrainCircuit size={13} />
                            Wealth Lab ↗
                        </button>
                    </div>

                    {/* Quick Linker Button */}
                    <button
                        onClick={() => setIsLinkerOpen(true)}
                        className="relative px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-surface-hover text-primary text-xs font-semibold border border-border-subtle transition-colors flex items-center gap-1.5"
                    >
                        <LinkIcon size={14} />
                        Link Contributions
                        {unassignedTxns.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-accent text-black text-[10px] font-black flex items-center justify-center">
                                {unassignedTxns.length}
                            </span>
                        )}
                    </button>

                    {/* Add Asset Modal */}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-primary text-background text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                        <Plus size={14} />
                        Add Asset
                    </button>

                    {/* Refresh Button */}
                    <button
                        onClick={fetchHoldingsAndUnassigned}
                        className="w-9 h-9 rounded-xl bg-surface-subtle hover:bg-surface-hover text-primary transition-colors border border-border-subtle flex items-center justify-center"
                        aria-label="Refresh wealth data"
                    >
                        <RefreshCw size={16} className={holdingsLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-subtle border border-border-subtle rounded-2xl p-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet size={64} />
                    </div>
                    {holdingsLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-20 bg-surface-hover rounded" />
                            <div className="h-8 w-32 bg-surface-hover rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Portfolio Net Worth</p>
                            <h2 className="text-3xl font-black mt-2 text-primary">{formatCurrency(totalWealth)}</h2>
                            <div className="flex items-center mt-2 space-x-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${absoluteReturn >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {absoluteReturn >= 0 ? "+" : ""}{formatCurrency(absoluteReturn)} ({returnPercentage.toFixed(1)}%)
                                </span>
                            </div>
                        </>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-surface-subtle border border-border-subtle rounded-2xl p-6"
                >
                    {holdingsLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-20 bg-surface-hover rounded" />
                            <div className="h-8 w-32 bg-surface-hover rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Total Invested Capital</p>
                            <h2 className="text-3xl font-black mt-2 text-primary">
                                {formatCurrency(totalInvested)}
                            </h2>
                            <p className="text-xs text-text-muted mt-2 font-medium">Principal contributed to date</p>
                        </>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="bg-surface-subtle border border-border-subtle rounded-2xl p-6"
                >
                    {holdingsLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-20 bg-surface-hover rounded" />
                            <div className="h-8 w-32 bg-surface-hover rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Active Monthly Run-rate</p>
                            <h2 className="text-3xl font-black mt-2 text-accent-text">
                                ~{formatCurrency(monthlyCommitment)}
                            </h2>
                            <p className="text-xs text-text-muted mt-2 font-medium">RD + APY + PLI + SIP commitments</p>
                        </>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-surface-subtle border border-border-subtle rounded-2xl p-6"
                >
                    {holdingsLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-20 bg-surface-hover rounded" />
                            <div className="h-8 w-32 bg-surface-hover rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Verified Assets</p>
                            <h2 className="text-3xl font-black mt-2 text-primary">
                                {holdings.length}
                            </h2>
                            <p className="text-xs text-text-muted mt-2 font-medium">
                                Across {Object.values(groupedHoldings).filter(list => list.length > 0).length} asset classes
                            </p>
                        </>
                    )}
                </motion.div>
            </div>

            {/* Unassigned Contributions Banner (Visible in both views if unassigned exist) */}
            {unassignedTxns.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-accent-subtle via-surface-subtle to-surface-subtle border border-accent/25 rounded-2xl p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm"
                >
                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-accent text-black font-bold mt-0.5 shadow-sm">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-primary text-base">
                                {unassignedTxns.length} Unassigned Investment Contributions Detected
                            </h3>
                            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                                Incoming debits from Groww, Recurring Deposits, APY, and PLI require manual or auto verification to update your portfolio.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        <button
                            onClick={handleAutoDetect}
                            disabled={autoDetecting}
                            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-accent text-black font-bold text-xs hover:bg-accent-hover transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {autoDetecting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            Auto-Organize Portfolio
                        </button>
                        <button
                            onClick={() => setIsLinkerOpen(true)}
                            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-primary font-semibold text-xs border border-border-subtle transition-colors flex items-center justify-center gap-1.5"
                        >
                            <LinkIcon size={14} />
                            Review & Map ({unassignedTxns.length})
                        </button>
                    </div>
                </motion.div>
            )}

            {/* MAIN CONTENT VIEW SWITCHER */}
            {viewMode === 'portfolio' ? (
                /* =================== VIEW 1: CLEAN ASSETS PORTFOLIO =================== */
                <div className="space-y-8">
                    {/* Empty State */}
                    {holdings.length === 0 && !holdingsLoading && (
                        <div className="py-16 text-center border-2 border-dashed border-border-subtle rounded-3xl bg-surface-subtle p-8 max-w-xl mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-accent-subtle text-accent-text flex items-center justify-center mx-auto mb-4">
                                <Wallet size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-primary mb-2">No Assets in Portfolio Yet</h3>
                            <p className="text-xs text-text-muted leading-relaxed mb-6">
                                We found {unassignedTxns.length} investment transactions in your history. You can auto-organize them into assets or add assets manually.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                {unassignedTxns.length > 0 && (
                                    <button
                                        onClick={handleAutoDetect}
                                        disabled={autoDetecting}
                                        className="w-full sm:w-auto px-6 py-3 bg-accent text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-accent-hover transition-all shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={14} /> Auto-Detect From Bank History
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="w-full sm:w-auto px-6 py-3 bg-surface hover:bg-surface-hover text-primary border border-border-subtle rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} /> Add Asset Manually
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Categorized Holdings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* 1. Mutual Funds & SIPs */}
                        {groupedHoldings.mutualFunds.length > 0 && (
                            <WealthCategoryCard
                                title="Mutual Funds & SIPs"
                                type="MUTUAL_FUND"
                                icon={<PieChart size={20} className="text-primary" />}
                                holdings={groupedHoldings.mutualFunds}
                                onHoldingClick={fetchHoldingDetails}
                                onSimulate={() => setIsSimulatorOpen(true)}
                                onAnalyze={() => { setViewMode('lab'); setActiveLabTab('intelligence'); }}
                            />
                        )}

                        {/* 2. Recurring Deposits (RD) */}
                        {groupedHoldings.recurringDeposits.length > 0 && (
                            <WealthCategoryCard
                                title="Recurring Deposits (RD)"
                                type="RD"
                                icon={<Repeat size={20} className="text-primary" />}
                                holdings={groupedHoldings.recurringDeposits}
                                onHoldingClick={fetchHoldingDetails}
                            />
                        )}

                        {/* 3. Fixed Deposits (FD) */}
                        {groupedHoldings.fixedDeposits.length > 0 && (
                            <WealthCategoryCard
                                title="Fixed Deposits (FD)"
                                type="FD"
                                icon={<Landmark size={20} className="text-primary" />}
                                holdings={groupedHoldings.fixedDeposits}
                                onHoldingClick={fetchHoldingDetails}
                            />
                        )}

                        {/* 4. Government & Pensions (APY / PLI / PF) */}
                        {groupedHoldings.govtPensions.length > 0 && (
                            <WealthCategoryCard
                                title="Govt Schemes & Pension"
                                type="GOVT"
                                icon={<ShieldCheck size={20} className="text-primary" />}
                                holdings={groupedHoldings.govtPensions}
                                onHoldingClick={fetchHoldingDetails}
                            />
                        )}

                        {/* 5. Gold & Other Assets */}
                        {groupedHoldings.goldAndOther.length > 0 && (
                            <WealthCategoryCard
                                title="Gold & Other Assets"
                                type="GOLD"
                                icon={<Coins size={20} className="text-primary" />}
                                holdings={groupedHoldings.goldAndOther}
                                onHoldingClick={fetchHoldingDetails}
                            />
                        )}
                    </div>
                </div>
            ) : (
                /* =================== VIEW 2: WEALTH LAB & ML =================== */
                <div className="space-y-8">
                    {/* Simulations & Intelligence Banner */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Financial Time Machine Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                            className="lg:col-span-1 bg-surface-subtle border border-border-subtle hover:border-border-default rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all"
                            onClick={() => setIsSimulatorOpen(true)}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Calculator size={80} />
                            </div>
                            <div>
                                <div className="p-2.5 bg-accent-subtle rounded-xl w-fit mb-3 text-primary">
                                    <BrainCircuit size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-primary mb-1">Time Machine</h3>
                                <p className="text-xs text-text-muted leading-relaxed">
                                    Simulate "What-If" scenarios. See how your investments would have performed if you timed them differently.
                                </p>
                            </div>
                            <div className="space-y-2 mt-4">
                                <button className="w-full py-2.5 bg-primary text-background hover:opacity-90 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                                    Run Simulator <Calculator size={14} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsStatementImportOpen(true); }}
                                    className="w-full py-2 bg-surface hover:bg-surface-hover text-text-muted hover:text-primary rounded-xl text-xs font-medium border border-border-subtle transition-all flex items-center justify-center gap-2"
                                >
                                    <Upload size={13} /> Import CAMS / KFin CAS
                                </button>
                            </div>
                        </motion.div>

                        {/* Main Predictions Chart */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                            className="lg:col-span-3 bg-surface-subtle border border-border-subtle rounded-2xl p-6 min-h-[350px]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex space-x-4">
                                    <button
                                        onClick={() => setActiveLabTab('trajectory')}
                                        className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeLabTab === 'trajectory' ? 'text-accent-text border-b-2 border-accent pb-1' : 'text-text-muted hover:text-primary pb-1'}`}
                                    >
                                        <LineChart size={15} />
                                        Prophet Trajectory Forecast
                                    </button>
                                    <button
                                        onClick={() => setActiveLabTab('intelligence')}
                                        className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeLabTab === 'intelligence' ? 'text-accent-text border-b-2 border-accent pb-1' : 'text-text-muted hover:text-primary pb-1'}`}
                                    >
                                        <BrainCircuit size={15} />
                                        Portfolio Intelligence
                                    </button>
                                </div>

                                {activeLabTab === 'trajectory' && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-border-subtle">
                                            <span className="text-[10px] text-text-muted uppercase font-bold">Monthly SIP</span>
                                            <input
                                                type="number"
                                                value={monthlySIP}
                                                onChange={(e) => setMonthlySIP(Number(e.target.value))}
                                                className="w-16 bg-transparent outline-none text-right font-mono text-xs text-primary"
                                            />
                                        </div>
                                        <button
                                            onClick={runSimulation}
                                            disabled={simulating}
                                            className="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-black text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                                        >
                                            {simulating ? "..." : "Update"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className={`w-full ${activeLabTab === 'trajectory' ? 'h-[280px]' : ''}`}>
                                {activeLabTab === 'trajectory' ? (
                                    forecastLoading ? (
                                        <div className="w-full h-full flex items-center justify-center animate-pulse bg-surface rounded-xl">
                                            <div className="text-text-muted text-xs">Generating Prediction Model...</div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="var(--color-accent-solid, #22d3ee)" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="var(--color-accent-solid, #22d3ee)" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #333)" vertical={false} />
                                                <XAxis dataKey="date" stroke="var(--color-text-muted, #888)" tick={{ fontSize: 10 }} minTickGap={30} />
                                                <YAxis
                                                    stroke="var(--color-text-muted, #888)"
                                                    tick={{ fontSize: 10 }}
                                                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--color-bg-surface, #121212)', borderColor: 'var(--color-border-subtle, #333)', color: 'var(--color-text-primary, #fff)', borderRadius: '8px', fontSize: '12px' }}
                                                    formatter={(val: number) => formatCurrency(val)}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#10b981"
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorValue)"
                                                    name="Historical"
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="forecast"
                                                    stroke="var(--color-accent-solid, #22d3ee)"
                                                    strokeDasharray="5 5"
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorForecast)"
                                                    name="Forecast"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )
                                ) : (
                                    <WealthIntelligence holdings={holdings} />
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <WealthLinker
                isOpen={isLinkerOpen}
                onClose={() => setIsLinkerOpen(false)}
                holdings={holdings}
                onLinkSuccess={fetchHoldingsAndUnassigned}
            />

            <AddHoldingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchHoldingsAndUnassigned}
            />

            <HoldingDetailsModal
                isOpen={!!selectedHolding}
                onClose={() => setSelectedHolding(null)}
                holding={selectedHolding}
            />

            <StatementImportModal
                isOpen={isStatementImportOpen}
                onClose={() => setIsStatementImportOpen(false)}
                onSuccess={fetchHoldingsAndUnassigned}
            />

            <InvestmentSimulatorModal
                isOpen={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--color-border-subtle, #333);
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};

export default Wealth;
