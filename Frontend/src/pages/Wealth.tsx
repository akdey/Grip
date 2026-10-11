import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HoldingDetailsModal } from '../components/wealth/HoldingDetailsModal';
import { WealthLinker } from '../components/wealth/WealthLinker';
import { AddHoldingModal } from '../components/wealth/AddHoldingModal';
import { WealthCategoryCard } from '../components/wealth/WealthCategoryCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, Plus, RefreshCw, Link as LinkIcon,
    PieChart, Sparkles, Landmark, Repeat, ShieldCheck,
    Coins, BrainCircuit, FileSpreadsheet, TrendingUp, TrendingDown,
    Lock, Eye, EyeOff, Search
} from 'lucide-react';

import { api } from '../lib/api';
import { haptics } from '../lib/haptics';
import { useWealthVaultStore, usePrivacyStore } from '../lib/store';
import { WealthVaultGate } from '../components/wealth/WealthVaultGate';

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
    institution_name?: string | null;
    account_number_or_folio?: string | null;
    nominee_name?: string | null;
    remarks?: string | null;
}

type AssetClassKey = 'ALL' | 'STOCK' | 'MUTUAL_FUND' | 'RD' | 'FD' | 'GOVT' | 'GOLD';

const Wealth: React.FC = () => {
    const navigate = useNavigate();
    const { isVaultUnlocked, lockVault } = useWealthVaultStore();
    const { showSensitive, toggleSensitive } = usePrivacyStore();

    // Data States
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [unassignedTxns, setUnassignedTxns] = useState<any[]>([]);
    const [monthlyInvestmentOutflow, setMonthlyInvestmentOutflow] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [autoDetecting, setAutoDetecting] = useState(false);
    const [exportingStatement, setExportingStatement] = useState(false);

    // Filter & Search States
    const [selectedClassFilter, setSelectedClassFilter] = useState<AssetClassKey>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [isLinkerOpen, setIsLinkerOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState<any | null>(null);
    const [loadingHoldingId, setLoadingHoldingId] = useState<string | null>(null);

    const handleExportStatement = async () => {
        setExportingStatement(true);
        haptics.impact('medium');
        try {
            const res = await api.get('/export/portfolio-statement', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `Grip_Portfolio_Statement_${dateStr}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            haptics.notification('success');
        } catch (error) {
            console.error("Statement export failed", error);
            haptics.notification('error');
            alert("Failed to export portfolio statement. Please try again.");
        } finally {
            setExportingStatement(false);
        }
    };

    const fetchHoldingDetails = async (id: string) => {
        const local = holdings.find(h => h.id === id);
        if (local) {
            setSelectedHolding(local);
        }
        setLoadingHoldingId(id);
        haptics.impact('light');

        try {
            const res = await api.get(`/wealth/holdings/${id}`);
            setSelectedHolding(res.data);
        } catch (e) {
            console.error("Failed to fetch holding details", e);
        } finally {
            setLoadingHoldingId(null);
        }
    };

    const fetchHoldingsAndUnassigned = async () => {
        setLoading(true);
        try {
            const [holdingsRes, unassignedRes, summaryRes] = await Promise.all([
                api.get('/wealth/holdings'),
                api.get('/wealth/unassigned-transactions').catch(() => ({ data: [] })),
                api.get('/analytics/summary/?scope=month').catch(() => ({ data: null }))
            ]);
            setHoldings(holdingsRes.data || []);
            setUnassignedTxns(unassignedRes.data || []);
            if (summaryRes?.data?.capital_investments != null) {
                setMonthlyInvestmentOutflow(Number(summaryRes.data.capital_investments));
            }
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
        if (isVaultUnlocked) {
            fetchHoldingsAndUnassigned();
        }
    }, [isVaultUnlocked]);

    // Derived Metrics
    const totalWealth = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
    const absoluteReturn = totalWealth - totalInvested;
    const returnPercentage = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

    // Filter holdings by search query
    const filteredHoldings = useMemo(() => {
        if (!searchQuery.trim()) return holdings;
        const q = searchQuery.toLowerCase().trim();
        return holdings.filter(h =>
            h.name.toLowerCase().includes(q) ||
            h.asset_type.toLowerCase().includes(q) ||
            (h.institution_name && h.institution_name.toLowerCase().includes(q)) ||
            (h.account_number_or_folio && h.account_number_or_folio.toLowerCase().includes(q)) ||
            (h.ticker_symbol && h.ticker_symbol.toLowerCase().includes(q))
        );
    }, [holdings, searchQuery]);

    // Group holdings into clean asset classes
    const groupedHoldings = useMemo(() => {
        const stocks = filteredHoldings.filter(h => h.asset_type === 'STOCK');
        const mutualFunds = filteredHoldings.filter(h => ['MUTUAL_FUND', 'SIP'].includes(h.asset_type));
        const recurringDeposits = filteredHoldings.filter(h => h.asset_type === 'RD');
        const fixedDeposits = filteredHoldings.filter(h => h.asset_type === 'FD');
        const govtPensions = filteredHoldings.filter(h => ['APY', 'PLI', 'PF', 'GRATUITY'].includes(h.asset_type));
        const goldAndOther = filteredHoldings.filter(h =>
            ['GOLD', 'REAL_ESTATE', 'OTHER'].includes(h.asset_type) ||
            !['MUTUAL_FUND', 'SIP', 'STOCK', 'RD', 'FD', 'APY', 'PLI', 'PF', 'GRATUITY'].includes(h.asset_type)
        );

        return {
            stocks,
            mutualFunds,
            recurringDeposits,
            fixedDeposits,
            govtPensions,
            goldAndOther
        };
    }, [filteredHoldings]);

    // Monochrome Asset Allocation Segments
    const allocationSegments = useMemo(() => {
        if (totalWealth <= 0) return [];
        const segments = [
            {
                id: 'STOCK' as AssetClassKey,
                label: 'Stocks',
                value: groupedHoldings.stocks.reduce((s, h) => s + h.current_value, 0),
                bgClass: 'bg-neutral-100', // Crisp off-white
            },
            {
                id: 'MUTUAL_FUND' as AssetClassKey,
                label: 'Mutual Funds',
                value: groupedHoldings.mutualFunds.reduce((s, h) => s + h.current_value, 0),
                bgClass: 'bg-neutral-300', // Light slate
            },
            {
                id: 'FD' as AssetClassKey,
                label: 'Fixed Deposits',
                value: groupedHoldings.fixedDeposits.reduce((s, h) => s + h.current_value, 0),
                bgClass: 'bg-neutral-400', // Mid slate
            },
            {
                id: 'RD' as AssetClassKey,
                label: 'Recurring Deposits',
                value: groupedHoldings.recurringDeposits.reduce((s, h) => s + h.current_value, 0),
                bgClass: 'bg-neutral-500', // Slate gray
            },
            {
                id: 'GOVT' as AssetClassKey,
                label: 'Retirement & Pensions',
                value: groupedHoldings.govtPensions.reduce((s, h) => s + h.current_value, 0),
                bgClass: 'bg-neutral-600', // Darker slate
            },
            {
                id: 'GOLD' as AssetClassKey,
                label: 'Gold & Other',
                value: groupedHoldings.goldAndOther.reduce((s, h) => s + h.current_value, 0),
                bgClass: 'bg-neutral-700', // Deep slate
            },
        ];

        return segments
            .filter(s => s.value > 0)
            .map(s => ({
                ...s,
                percentage: (s.value / totalWealth) * 100
            }));
    }, [totalWealth, groupedHoldings]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <WealthVaultGate>
            <div className="min-h-screen text-primary p-4 sm:p-6 pb-24 overflow-x-hidden space-y-6 max-w-7xl mx-auto">
                {/* 1. Executive Top Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-primary heading-apple">
                                Wealth
                            </h1>
                            {/* <span className="px-2 py-0.5 rounded-full bg-surface-pill border border-border-subtle text-[10px] font-semibold text-text-muted flex items-center gap-1">
                                <ShieldCheck size={11} className="text-emerald-400" />
                                Vault Secured
                            </span> */}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                            Asset Portfolio & Capital Holdings
                        </p>
                    </div>

                    {/* Consolidated Action Bar */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {/* Statement Export */}
                        <button
                            onClick={handleExportStatement}
                            disabled={exportingStatement}
                            className="px-3 py-2 rounded-xl bg-surface-pill hover:bg-surface-hover text-text-secondary hover:text-primary text-xs font-medium border border-border-subtle transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            title="Export Comprehensive Financial Portfolio Statement (.xlsx)"
                        >
                            <FileSpreadsheet size={14} className={exportingStatement ? "animate-pulse" : ""} />
                            <span className="hidden sm:inline">Statement</span>
                        </button>

                        {/* Link Unassigned Debits (if any) */}
                        {unassignedTxns.length > 0 && (
                            <button
                                onClick={() => setIsLinkerOpen(true)}
                                className="relative px-3 py-2 rounded-xl bg-surface-pill hover:bg-surface-hover text-text-secondary hover:text-primary text-xs font-medium border border-border-subtle transition-all flex items-center gap-1.5 active:scale-95"
                                title="Map incoming transactions to holdings"
                            >
                                <LinkIcon size={14} />
                                <span>Link</span>
                                <span className="w-4 h-4 rounded-full bg-neutral-200 text-black text-[9px] font-bold flex items-center justify-center">
                                    {unassignedTxns.length}
                                </span>
                            </button>
                        )}

                        {/* Wealth Lab Link */}
                        <button
                            onClick={() => navigate('/wealth/lab')}
                            className="px-3 py-2 rounded-xl bg-surface-pill hover:bg-surface-hover text-text-secondary hover:text-primary text-xs font-medium border border-border-subtle transition-all flex items-center gap-1.5 active:scale-95"
                            title="Open Wealth Lab Simulations & Forecasts"
                        >
                            <BrainCircuit size={14} />
                            <span>Lab</span>
                        </button>

                        {/* Refresh */}
                        <button
                            onClick={fetchHoldingsAndUnassigned}
                            className="w-9 h-9 rounded-xl bg-surface-pill hover:bg-surface-hover text-text-muted hover:text-primary transition-all border border-border-subtle flex items-center justify-center active:scale-95"
                            aria-label="Refresh wealth data"
                            title="Refresh Data"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>

                        {/* Lock Vault */}
                        <button
                            onClick={() => {
                                haptics.impact('medium');
                                lockVault();
                            }}
                            className="px-3 py-2 rounded-xl bg-surface-pill hover:bg-surface-hover text-text-muted hover:text-rose-400 text-xs font-medium border border-border-subtle transition-all flex items-center gap-1.5 active:scale-95"
                            title="Lock Wealth Vault"
                        >
                            <Lock size={13} />
                            <span>Lock</span>
                        </button>

                        {/* Add Asset (Primary CTA) */}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ml-auto sm:ml-0"
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            <span>Add Asset</span>
                        </button>
                    </div>
                </div>

                {/* 2. Unified Master Portfolio Hero (Restrained & High-Density) */}
                <div className="bg-surface-subtle border border-border-subtle rounded-3xl p-6 sm:p-8 space-y-6">
                    {/* Top Row: Net Worth + Privacy + Gain/Loss */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px]">
                                Portfolio Net Worth
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                                <h2 className="text-3xl sm:text-4xl font-black text-primary tracking-tight font-mono">
                                    {showSensitive ? formatCurrency(totalWealth) : '••••••••'}
                                </h2>
                                <button
                                    onClick={() => {
                                        haptics.impact('light');
                                        toggleSensitive();
                                    }}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-pill transition-colors cursor-pointer"
                                    title={showSensitive ? "Hide sensitive balances" : "Reveal balances"}
                                    aria-label={showSensitive ? "Hide balances" : "Show balances"}
                                >
                                    {showSensitive ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Performance Metric Pill */}
                        <div className="flex items-center gap-2">
                            <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${absoluteReturn >= 0
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}>
                                {absoluteReturn >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                <span>
                                    {showSensitive
                                        ? `${absoluteReturn >= 0 ? '+' : ''}${formatCurrency(absoluteReturn)} (${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(1)}%)`
                                        : '••••••'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border-subtle/50">
                        <div>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Total Invested</p>
                            <p className="text-base font-bold text-primary font-mono mt-0.5">
                                {showSensitive ? formatCurrency(totalInvested) : '••••••'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Monthly Inflow (SIP)</p>
                            <p className="text-base font-bold text-primary font-mono mt-0.5">
                                {showSensitive ? formatCurrency(monthlyInvestmentOutflow) : '••••••'}
                            </p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Holdings Tracked</p>
                            <p className="text-base font-bold text-primary mt-0.5">
                                {holdings.length} {holdings.length === 1 ? 'Asset' : 'Assets'}
                            </p>
                        </div>
                    </div>

                    {/* Monochrome Asset Allocation Ribbon */}
                    {totalWealth > 0 && allocationSegments.length > 0 && (
                        <div className="pt-2 space-y-3">
                            <div className="flex justify-between items-center text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                                <span>Asset Allocation</span>
                                <span>{allocationSegments.length} Classes</span>
                            </div>

                            {/* Segmented Bar */}
                            <div className="h-2 w-full rounded-full bg-surface-pill overflow-hidden flex gap-0.5">
                                {allocationSegments.map(seg => (
                                    <div
                                        key={seg.id}
                                        style={{ width: `${seg.percentage}%` }}
                                        className={`${seg.bgClass} h-full transition-all duration-200 cursor-pointer hover:opacity-80`}
                                        title={`${seg.label}: ${seg.percentage.toFixed(1)}%`}
                                        onClick={() => setSelectedClassFilter(selectedClassFilter === seg.id ? 'ALL' : seg.id)}
                                    />
                                ))}
                            </div>

                            {/* Minimalist Legend (Restrained Monochrome) */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-muted pt-1">
                                {allocationSegments.map(seg => (
                                    <button
                                        key={seg.id}
                                        onClick={() => setSelectedClassFilter(selectedClassFilter === seg.id ? 'ALL' : seg.id)}
                                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${selectedClassFilter === seg.id ? 'text-primary font-bold' : 'hover:text-primary'
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${seg.bgClass}`} />
                                        <span>{seg.label}</span>
                                        <span className="font-mono text-[10px] opacity-75">
                                            {seg.percentage.toFixed(0)}%
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Filter Tabs & Search Bar */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    {/* Class Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {[
                            { key: 'ALL' as AssetClassKey, label: `All (${holdings.length})` },
                            { key: 'STOCK' as AssetClassKey, label: 'Stocks' },
                            { key: 'MUTUAL_FUND' as AssetClassKey, label: 'Mutual Funds' },
                            { key: 'FD' as AssetClassKey, label: 'Fixed Deposits' },
                            { key: 'RD' as AssetClassKey, label: 'Recurring' },
                            { key: 'GOVT' as AssetClassKey, label: 'Retirement' },
                            { key: 'GOLD' as AssetClassKey, label: 'Gold & Other' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    haptics.selection();
                                    setSelectedClassFilter(tab.key);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${selectedClassFilter === tab.key
                                        ? 'bg-white text-black font-bold shadow-sm'
                                        : 'bg-surface-pill hover:bg-surface-hover text-text-muted hover:text-primary border border-border-subtle'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Instant Search Bar */}
                    <div className="relative min-w-[220px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search asset, bank, folio..."
                            className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-subtle border border-border-subtle focus:border-border-default text-xs text-primary placeholder:text-text-muted outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* 4. Unassigned Contributions Alert Banner */}
                {unassignedTxns.length > 0 && (
                    <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-pill border border-border-subtle flex items-center justify-center text-primary shrink-0 mt-0.5">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary text-sm">
                                    {unassignedTxns.length} Unassigned Investment Contributions Detected
                                </h3>
                                <p className="text-xs text-text-muted mt-0.5">
                                    Bank debits from Groww, Recurring Deposits, APY, or PLI are ready to map.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={handleAutoDetect}
                                disabled={autoDetecting}
                                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                                {autoDetecting ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                Auto-Organize
                            </button>
                            <button
                                onClick={() => setIsLinkerOpen(true)}
                                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-surface-pill hover:bg-surface-hover text-primary font-medium text-xs border border-border-subtle transition-colors flex items-center justify-center gap-1.5"
                            >
                                <LinkIcon size={13} />
                                Review ({unassignedTxns.length})
                            </button>
                        </div>
                    </div>
                )}

                {/* 5. Asset Category Cards Grid */}
                {holdings.length === 0 && !loading ? (
                    <div className="py-16 text-center border border-dashed border-border-subtle rounded-3xl bg-surface-subtle p-8 max-w-xl mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-surface-pill border border-border-subtle text-primary flex items-center justify-center mx-auto mb-4">
                            <Wallet size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-primary mb-1">No Assets in Portfolio Yet</h3>
                        <p className="text-xs text-text-muted leading-relaxed mb-6 max-w-sm mx-auto">
                            {unassignedTxns.length > 0
                                ? `We detected ${unassignedTxns.length} investment debits in your history. You can auto-organize them into assets or add assets manually.`
                                : "Add your stocks, mutual funds, fixed deposits, or pension schemes to track your wealth."}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            {unassignedTxns.length > 0 && (
                                <button
                                    onClick={handleAutoDetect}
                                    disabled={autoDetecting}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-white text-black rounded-xl text-xs font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Sparkles size={14} /> Auto-Detect From Bank History
                                </button>
                            )}
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-surface-pill hover:bg-surface-hover text-primary border border-border-subtle rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Plus size={14} /> Add Asset Manually
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {/* 1. Direct Stocks */}
                        {(selectedClassFilter === 'ALL' || selectedClassFilter === 'STOCK') && groupedHoldings.stocks.length > 0 && (
                            <WealthCategoryCard
                                title="Direct Stocks & Equities"
                                type="STOCK"
                                icon={<TrendingUp size={18} className="text-primary" />}
                                holdings={groupedHoldings.stocks}
                                portfolioShare={totalWealth > 0 ? (groupedHoldings.stocks.reduce((s, h) => s + h.current_value, 0) / totalWealth) * 100 : 0}
                                showSensitive={showSensitive}
                                onHoldingClick={fetchHoldingDetails}
                                loadingHoldingId={loadingHoldingId}
                            />
                        )}

                        {/* 2. Mutual Funds & SIPs */}
                        {(selectedClassFilter === 'ALL' || selectedClassFilter === 'MUTUAL_FUND') && groupedHoldings.mutualFunds.length > 0 && (
                            <WealthCategoryCard
                                title="Mutual Funds & SIPs"
                                type="MUTUAL_FUND"
                                icon={<PieChart size={18} className="text-primary" />}
                                holdings={groupedHoldings.mutualFunds}
                                portfolioShare={totalWealth > 0 ? (groupedHoldings.mutualFunds.reduce((s, h) => s + h.current_value, 0) / totalWealth) * 100 : 0}
                                showSensitive={showSensitive}
                                onHoldingClick={fetchHoldingDetails}
                                loadingHoldingId={loadingHoldingId}
                            />
                        )}

                        {/* 3. Recurring Deposits (RD) */}
                        {(selectedClassFilter === 'ALL' || selectedClassFilter === 'RD') && groupedHoldings.recurringDeposits.length > 0 && (
                            <WealthCategoryCard
                                title="Recurring Deposits (RD)"
                                type="RD"
                                icon={<Repeat size={18} className="text-primary" />}
                                holdings={groupedHoldings.recurringDeposits}
                                portfolioShare={totalWealth > 0 ? (groupedHoldings.recurringDeposits.reduce((s, h) => s + h.current_value, 0) / totalWealth) * 100 : 0}
                                showSensitive={showSensitive}
                                onHoldingClick={fetchHoldingDetails}
                                loadingHoldingId={loadingHoldingId}
                            />
                        )}

                        {/* 4. Fixed Deposits (FD) */}
                        {(selectedClassFilter === 'ALL' || selectedClassFilter === 'FD') && groupedHoldings.fixedDeposits.length > 0 && (
                            <WealthCategoryCard
                                title="Fixed Deposits (FD)"
                                type="FD"
                                icon={<Landmark size={18} className="text-primary" />}
                                holdings={groupedHoldings.fixedDeposits}
                                portfolioShare={totalWealth > 0 ? (groupedHoldings.fixedDeposits.reduce((s, h) => s + h.current_value, 0) / totalWealth) * 100 : 0}
                                showSensitive={showSensitive}
                                onHoldingClick={fetchHoldingDetails}
                                loadingHoldingId={loadingHoldingId}
                            />
                        )}

                        {/* 5. Government Schemes & Pensions */}
                        {(selectedClassFilter === 'ALL' || selectedClassFilter === 'GOVT') && groupedHoldings.govtPensions.length > 0 && (
                            <WealthCategoryCard
                                title="Govt Schemes & Pension"
                                type="GOVT"
                                icon={<ShieldCheck size={18} className="text-primary" />}
                                holdings={groupedHoldings.govtPensions}
                                portfolioShare={totalWealth > 0 ? (groupedHoldings.govtPensions.reduce((s, h) => s + h.current_value, 0) / totalWealth) * 100 : 0}
                                showSensitive={showSensitive}
                                onHoldingClick={fetchHoldingDetails}
                                loadingHoldingId={loadingHoldingId}
                            />
                        )}

                        {/* 6. Gold & Other Assets */}
                        {(selectedClassFilter === 'ALL' || selectedClassFilter === 'GOLD') && groupedHoldings.goldAndOther.length > 0 && (
                            <WealthCategoryCard
                                title="Gold & Other Assets"
                                type="GOLD"
                                icon={<Coins size={18} className="text-primary" />}
                                holdings={groupedHoldings.goldAndOther}
                                portfolioShare={totalWealth > 0 ? (groupedHoldings.goldAndOther.reduce((s, h) => s + h.current_value, 0) / totalWealth) * 100 : 0}
                                showSensitive={showSensitive}
                                onHoldingClick={fetchHoldingDetails}
                                loadingHoldingId={loadingHoldingId}
                            />
                        )}
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
                    onUpdated={fetchHoldingsAndUnassigned}
                />
            </div>
        </WealthVaultGate>
    );
};

export default Wealth;
