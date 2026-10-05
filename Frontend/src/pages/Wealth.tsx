import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HoldingDetailsModal } from '../components/wealth/HoldingDetailsModal';
import { WealthLinker } from '../components/wealth/WealthLinker';
import { AddHoldingModal } from '../components/wealth/AddHoldingModal';
import { WealthCategoryCard } from '../components/wealth/WealthCategoryCard';
import { motion } from 'framer-motion';
import {
    Wallet, Plus, RefreshCw, Link as LinkIcon,
    PieChart, Sparkles, Landmark, Repeat, ShieldCheck,
    Coins, ArrowRight, BrainCircuit
} from 'lucide-react';

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
    maturity_amount?: number | null;
}

const Wealth: React.FC = () => {
    const navigate = useNavigate();

    // Data States
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [unassignedTxns, setUnassignedTxns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoDetecting, setAutoDetecting] = useState(false);

    // Modal States
    const [isLinkerOpen, setIsLinkerOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState<any | null>(null);

    const fetchHoldingDetails = async (id: string) => {
        try {
            const res = await api.get(`/wealth/holdings/${id}`);
            setSelectedHolding(res.data);
        } catch (e) {
            console.error("Failed to fetch holding details", e);
        }
    };

    const fetchHoldingsAndUnassigned = async () => {
        setLoading(true);
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
            setLoading(false);
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
        groupedHoldings.recurringDeposits.forEach(() => {
            total += 5000;
        });
        groupedHoldings.govtPensions.forEach(gp => {
            if (gp.name.toLowerCase().includes('apy') || gp.asset_type === 'APY') total += 409;
            else if (gp.name.toLowerCase().includes('pli') || gp.asset_type === 'PLI') total += 1880;
        });
        groupedHoldings.mutualFunds.forEach(() => {
            total += 3000;
        });
        return total;
    }, [groupedHoldings]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="min-h-screen text-primary p-6 pb-24 overflow-x-hidden">
            {/* Clean Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black tracking-tighter text-primary heading-apple">
                        Wealth
                    </h1>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5">
                        Your Assets & Holdings
                    </p>
                </div>

                {/* Primary Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Direct Link to Wealth Lab */}
                    <button
                        onClick={() => navigate('/wealth/lab')}
                        className="px-3.5 py-2 rounded-xl bg-accent-subtle hover:bg-accent-hover/20 text-accent-text text-xs font-bold border border-accent/20 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                        <BrainCircuit size={14} />
                        Wealth Lab ↗
                    </button>

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
                        className="px-3.5 py-2 rounded-xl bg-primary text-text-inverse text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
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
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
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
                    {loading ? (
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
                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-20 bg-surface-hover rounded" />
                            <div className="h-8 w-32 bg-surface-hover rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Total Invested</p>
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
                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-20 bg-surface-hover rounded" />
                            <div className="h-8 w-32 bg-surface-hover rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Active Monthly Outflow</p>
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
                    {loading ? (
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
                                Across {Object.values(groupedHoldings).filter(list => list.length > 0).length} asset categories
                            </p>
                        </>
                    )}
                </motion.div>
            </div>

            {/* Unassigned Contributions Banner (When unassigned transactions exist) */}
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
                                Incoming debits from Groww, Recurring Deposits, APY, and PLI can be verified and mapped to your portfolio.
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

            {/* Asset Portfolios Grid */}
            <div className="space-y-6">
                {/* Empty State */}
                {holdings.length === 0 && !loading && (
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

                {/* Wealth Lab Shortcut Banner at Bottom */}
                <div 
                    onClick={() => navigate('/wealth/lab')}
                    className="mt-12 p-6 rounded-3xl bg-surface-subtle border border-border-subtle hover:border-border-default transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-accent-subtle text-accent-text group-hover:scale-105 transition-transform">
                            <BrainCircuit size={28} />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-primary group-hover:text-accent-text transition-colors flex items-center gap-2">
                                Wealth Lab & Predictions
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </h4>
                            <p className="text-xs text-text-muted mt-0.5">
                                Explore 10-year Prophet ML trajectory forecasts, historical What-If simulations, and CAMS statement imports.
                            </p>
                        </div>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-surface group-hover:bg-accent group-hover:text-black border border-border-subtle text-xs font-semibold text-primary transition-all shrink-0">
                        Launch Lab →
                    </button>
                </div>
            </div>

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
                onUpdated={fetchHoldingsAndUnassigned}
            />
        </div>
    );
};

export default Wealth;
