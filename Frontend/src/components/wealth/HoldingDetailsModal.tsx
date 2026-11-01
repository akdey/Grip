
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, Pencil, Save, X, Check, Percent, Calendar, Lock, ShieldCheck, Landmark, FileText, UserCheck, MapPin, Loader2, History, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SIPDateAnalysis } from './SIPDateAnalysis';
import { haptics } from '../../lib/haptics';
import { api } from '../../lib/api';

interface HoldingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    holding: any;
    onUpdated?: () => void;
}

export const HoldingDetailsModal: React.FC<HoldingDetailsModalProps> = ({ isOpen, onClose, holding, onUpdated }) => {
    const [activeTab, setActiveTab] = useState<'performance' | 'history' | 'sip-analysis'>('performance');
    const [currentHolding, setCurrentHolding] = useState<any>(holding);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    // Form state
    const [editCurrentValue, setEditCurrentValue] = useState<string>('');
    const [editInvested, setEditInvested] = useState<string>('');
    const [editInterestRate, setEditInterestRate] = useState<string>('');
    const [editMaturityDate, setEditMaturityDate] = useState<string>('');
    const [editMaturityAmount, setEditMaturityAmount] = useState<string>('');
    const [editInstitutionName, setEditInstitutionName] = useState<string>('');
    const [editAccountNumber, setEditAccountNumber] = useState<string>('');
    const [editNomineeName, setEditNomineeName] = useState<string>('');
    const [editRemarks, setEditRemarks] = useState<string>('');
    const [isEditingRecords, setIsEditingRecords] = useState(false);
    const [savingRecords, setSavingRecords] = useState(false);
    const [recordsSavedSuccess, setRecordsSavedSuccess] = useState(false);

    const fetchHistory = async (holdingId?: string) => {
        const id = holdingId || currentHolding?.id || holding?.id;
        if (!id) return;
        setLoadingHistory(true);
        try {
            const res = await api.get(`/wealth/holdings/${id}/history`);
            setHistory(res.data || []);
        } catch (e) {
            console.error("Failed to fetch holding history", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (holding) {
            setCurrentHolding(holding);
            setEditCurrentValue(holding.current_value?.toString() || '');
            setEditInvested(holding.total_invested?.toString() || '');
            setEditInterestRate(holding.interest_rate?.toString() || '');
            setEditMaturityDate(holding.maturity_date ? holding.maturity_date.split('T')[0] : '');
            setEditMaturityAmount(holding.maturity_amount?.toString() || '');
            setEditInstitutionName(holding.institution_name || '');
            setEditAccountNumber(holding.account_number_or_folio || '');
            setEditNomineeName(holding.nominee_name || '');
            setEditRemarks(holding.remarks || '');
            setIsEditing(false);
            setIsEditingRecords(false);
            fetchHistory(holding.id);
        }
    }, [holding]);

    // Process snapshots for chart with running cumulative invested amount
    const chartData = useMemo(() => {
        if (!currentHolding?.snapshots || currentHolding.snapshots.length === 0) return [];
        const sorted = [...currentHolding.snapshots].sort((a: any, b: any) => 
            new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
        );
        let cumInvested = 0;
        return sorted.map((s: any) => {
            if (s.amount_invested_delta && s.amount_invested_delta > 0) {
                cumInvested += s.amount_invested_delta;
            }
            return {
                date: new Date(s.captured_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' }),
                value: Math.round(s.total_value || 0),
                invested: Math.round(cumInvested > 0 ? cumInvested : (s.total_value || 0)),
                price: s.price_per_unit
            };
        });
    }, [currentHolding]);

    if (!currentHolding) return null;

    const isFixedIncome = ['FD', 'RD', 'FIXED_DEPOSIT', 'RECURRING_DEPOSIT'].includes(currentHolding?.asset_type?.toUpperCase());
    const isMarketLinked = ['MUTUAL_FUND', 'STOCK', 'SIP', 'GOLD'].includes(currentHolding?.asset_type?.toUpperCase());
    const hasSIPData = currentHolding.snapshots?.some((s: any) => s.is_sip);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = {};
            if (isFixedIncome) {
                if (editCurrentValue !== '') payload.current_value = parseFloat(editCurrentValue);
                if (editInvested !== '') payload.total_invested = parseFloat(editInvested);
                if (editInterestRate !== '') payload.interest_rate = parseFloat(editInterestRate);
                if (editMaturityDate !== '') payload.maturity_date = editMaturityDate;
                if (editMaturityAmount !== '') payload.maturity_amount = parseFloat(editMaturityAmount);
            } else {
                // For Market-Linked (SIP / Mutual Funds / Stocks):
                // Current balance is NOT manually edited because it's computed live from AMFI NAV × units!
                if (editInvested !== '') payload.total_invested = parseFloat(editInvested);
            }

            const res = await api.patch(`/wealth/holdings/${currentHolding.id}`, payload);
            setCurrentHolding(res.data);
            setSavedSuccess(true);
            haptics.notification('success');
            onUpdated?.();
            setTimeout(() => {
                setSavedSuccess(false);
                setIsEditing(false);
            }, 800);
        } catch (e) {
            console.error('Failed to update holding', e);
            haptics.notification('error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRecords = async () => {
        setSavingRecords(true);
        try {
            const payload = {
                institution_name: editInstitutionName.trim() || null,
                account_number_or_folio: editAccountNumber.trim() || null,
                nominee_name: editNomineeName.trim() || null,
                remarks: editRemarks.trim() || null
            };
            const res = await api.patch(`/wealth/holdings/${currentHolding.id}`, payload);
            setCurrentHolding(res.data);
            setRecordsSavedSuccess(true);
            haptics.notification('success');
            onUpdated?.();
            setTimeout(() => {
                setRecordsSavedSuccess(false);
                setIsEditingRecords(false);
            }, 600);
        } catch (e) {
            console.error('Failed to update account records', e);
            haptics.notification('error');
        } finally {
            setSavingRecords(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex justify-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            haptics.selection();
                            onClose();
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
                                onClose();
                            } else {
                                haptics.selection();
                            }
                        }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[92vh] max-h-[92vh] glass-drawer rounded-t-[2.5rem] flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-auto pb-safe"
                    >
                        {/* Grabber Pill */}
                        <div
                            className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                            onClick={() => {
                                haptics.selection();
                                onClose();
                            }}
                        >
                            <div className="w-10 h-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors active:scale-95" />
                        </div>

                        {/* Header */}
                        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-border-subtle bg-surface-subtle shrink-0">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-text-muted font-bold uppercase tracking-wider">
                                    <span className="bg-surface-pill text-primary px-2.5 py-0.5 rounded-full border border-border-subtle font-semibold">
                                        {currentHolding.asset_type?.replace(/_/g, ' ')}
                                    </span>
                                    {currentHolding.ticker_symbol && (
                                        <span className="font-mono text-text-muted">
                                            • {currentHolding.ticker_symbol}
                                        </span>
                                    )}
                                    {isFixedIncome && currentHolding.interest_rate && (
                                        <span className="text-emerald-400 font-semibold">• {currentHolding.interest_rate}% p.a.</span>
                                    )}
                                    {isFixedIncome && currentHolding.maturity_amount && (
                                        <span className="text-primary font-mono font-semibold">• Mat: {formatCurrency(currentHolding.maturity_amount)}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => {
                                            haptics.selection();
                                            setIsEditing(!isEditing);
                                        }}
                                        className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                                            isEditing 
                                                ? 'badge-danger' 
                                                : 'bg-surface border-border-subtle hover:bg-surface-hover text-primary'
                                        }`}
                                    >
                                        {isEditing ? <X size={13} /> : <Pencil size={13} />}
                                        <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all shadow-xs group"
                                        aria-label="Close modal"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            </div>
                            <h2 className="text-base sm:text-xl font-bold text-primary tracking-tight leading-snug line-clamp-2">
                                {currentHolding.name}
                            </h2>
                        </div>

                        {/* Edit Form Drawer / Panel */}
                        <AnimatePresence>
                            {isEditing && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-b border-border-subtle bg-surface/90 px-6 sm:px-10 py-5 overflow-y-auto max-h-[50vh] custom-scrollbar shrink-0"
                                >
                                    <div className="max-w-4xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs uppercase tracking-widest font-black text-emerald-400">
                                                {isFixedIncome ? 'Update Fixed Deposit / RD Details' : 'Update Investment Details'}
                                            </p>
                                            {isMarketLinked && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 font-medium bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                                    <Lock size={12} />
                                                    <span>Current balance is synced live with AMFI NAV</span>
                                                </div>
                                            )}
                                        </div>

                                        {isFixedIncome ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                                <div>
                                                    <label className="text-[11px] font-bold text-text-muted uppercase">Current Balance (₹)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editCurrentValue}
                                                        onChange={(e) => setEditCurrentValue(e.target.value)}
                                                        placeholder="29000"
                                                        className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-primary font-bold text-sm focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-text-muted uppercase">Principal Deposited (₹)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editInvested}
                                                        onChange={(e) => setEditInvested(e.target.value)}
                                                        placeholder="29000"
                                                        className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-primary font-bold text-sm focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-text-muted uppercase">Interest Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editInterestRate}
                                                        onChange={(e) => setEditInterestRate(e.target.value)}
                                                        placeholder="6.6"
                                                        className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-primary font-bold text-sm focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-text-muted uppercase">Maturity Date</label>
                                                    <input
                                                        type="date"
                                                        value={editMaturityDate}
                                                        onChange={(e) => setEditMaturityDate(e.target.value)}
                                                        className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-primary font-bold text-sm focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-text-muted uppercase">Maturity Amount (₹)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editMaturityAmount}
                                                        onChange={(e) => setEditMaturityAmount(e.target.value)}
                                                        placeholder="31989"
                                                        className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-subtle border border-border-subtle text-primary font-bold text-sm focus:outline-none focus:border-emerald-500"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-bold text-text-muted uppercase">Current Balance (Live NAV)</label>
                                                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                                                            <Lock size={10} /> Live Synced
                                                        </span>
                                                    </div>
                                                    <div className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-surface-subtle/60 border border-border-subtle/80 text-text-muted font-bold text-sm flex items-center justify-between select-all cursor-not-allowed">
                                                        <span>{formatCurrency(currentHolding.current_value)}</span>
                                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">AMFI API</span>
                                                    </div>
                                                    <p className="text-[10px] text-text-muted mt-1.5">
                                                        Current balance is evaluated live from AMFI NAV × units and cannot be edited manually.
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-text-muted uppercase">Total Capital Invested (₹)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editInvested}
                                                        onChange={(e) => setEditInvested(e.target.value)}
                                                        placeholder="Cost basis"
                                                        className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-primary font-bold text-sm focus:outline-none focus:border-emerald-500"
                                                    />
                                                    <p className="text-[10px] text-text-muted mt-1.5">
                                                        Update your cumulative purchase cost / invested principal.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 mt-4">
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                            >
                                                {savedSuccess ? (
                                                    <>
                                                        <Check size={14} /> Saved!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tabs & Content Container */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {/* Segmented Navigation Tabs — All options fully visible */}
                            <div className="px-4 sm:px-8 py-2.5 border-b border-border-subtle bg-surface-subtle/50 shrink-0">
                                <div className="flex p-1 bg-surface-pill rounded-2xl border border-border-subtle max-w-xl mx-auto gap-1">
                                    <button
                                        onClick={() => {
                                            haptics.selection();
                                            setActiveTab('performance');
                                        }}
                                        className={`relative flex-1 py-2 px-1 sm:px-3 rounded-xl text-xs font-semibold transition-all text-center select-none ${
                                            activeTab === 'performance' ? 'text-primary font-bold' : 'text-text-muted hover:text-primary'
                                        }`}
                                    >
                                        {activeTab === 'performance' && (
                                            <motion.div
                                                layoutId="holdingActiveTab"
                                                className="absolute inset-0 bg-surface rounded-xl border border-border-subtle shadow-xs z-0"
                                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                            />
                                        )}
                                        <span className="relative z-10 truncate">Performance</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            haptics.selection();
                                            setActiveTab('history');
                                        }}
                                        className={`relative flex-1 py-2 px-1 sm:px-3 rounded-xl text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5 select-none ${
                                            activeTab === 'history' ? 'text-primary font-bold' : 'text-text-muted hover:text-primary'
                                        }`}
                                    >
                                        {activeTab === 'history' && (
                                            <motion.div
                                                layoutId="holdingActiveTab"
                                                className="absolute inset-0 bg-surface rounded-xl border border-border-subtle shadow-xs z-0"
                                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                            />
                                        )}
                                        <span className="relative z-10 truncate">History</span>
                                        {history.length > 0 && (
                                            <span className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                                                activeTab === 'history' ? 'bg-primary text-text-inverse' : 'bg-surface-subtle text-text-muted border border-border-subtle'
                                            }`}>
                                                {history.length}
                                            </span>
                                        )}
                                    </button>

                                    {hasSIPData && (
                                        <button
                                            onClick={() => {
                                                haptics.selection();
                                                setActiveTab('sip-analysis');
                                            }}
                                            className={`relative flex-1 py-2 px-1 sm:px-3 rounded-xl text-xs font-semibold transition-all text-center select-none ${
                                                activeTab === 'sip-analysis' ? 'text-primary font-bold' : 'text-text-muted hover:text-primary'
                                            }`}
                                        >
                                            {activeTab === 'sip-analysis' && (
                                                <motion.div
                                                    layoutId="holdingActiveTab"
                                                    className="absolute inset-0 bg-surface rounded-xl border border-border-subtle shadow-xs z-0"
                                                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                                />
                                            )}
                                            <span className="relative z-10 truncate">SIP Intel</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 pb-28 sm:p-10 sm:pb-24 custom-scrollbar">
                                {activeTab === 'performance' ? (
                                    <>
                                        {/* KPIS */}
                                        {isFixedIncome ? (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                    <p className="text-xs text-text-muted">Current Balance</p>
                                                    <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(currentHolding.current_value)}</p>
                                                </div>
                                                <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                    <p className="text-xs text-text-muted">Principal Invested</p>
                                                    <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(currentHolding.total_invested)}</p>
                                                </div>
                                                <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                    <p className="text-xs text-text-muted">Interest Rate</p>
                                                    <p className="text-xl font-bold mt-1 text-emerald-400">
                                                        {currentHolding.interest_rate ? `${currentHolding.interest_rate}% p.a.` : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                    <p className="text-xs text-text-muted">Maturity Amount</p>
                                                    <p className="text-xl font-bold mt-1 text-primary font-mono">
                                                        {currentHolding.maturity_amount ? formatCurrency(currentHolding.maturity_amount) : 'N/A'}
                                                    </p>
                                                    {currentHolding.maturity_date && (() => {
                                                        const isMatured = new Date(currentHolding.maturity_date).getTime() <= Date.now();
                                                        return isMatured ? (
                                                            <div className="mt-1">
                                                                <span className="text-[10px] text-text-secondary bg-surface-pill border border-border-default px-1.5 py-0.5 rounded font-mono font-semibold">
                                                                    Matured on {new Date(currentHolding.maturity_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </span>
                                                                <p className="text-[10px] text-emerald-400 mt-1">Ready for savings credit or renewal</p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] text-text-muted mt-0.5">
                                                                Matures: {new Date(currentHolding.maturity_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                    <p className="text-xs text-text-muted">Current Value</p>
                                                    <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(currentHolding.current_value)}</p>
                                                </div>
                                                <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                    <p className="text-xs text-text-muted">Invested</p>
                                                    <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(currentHolding.total_invested)}</p>
                                                </div>
                                                <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                    <p className="text-xs text-text-muted">Net Returns</p>
                                                    <p className={`text-xl font-bold mt-1 ${(currentHolding.current_value - currentHolding.total_invested) >= 0 ? "text-status-success" : "text-status-danger"}`}>
                                                        {formatCurrency(currentHolding.current_value - currentHolding.total_invested)}
                                                    </p>
                                                </div>
                                                <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                    <p className="text-xs text-text-muted">XIRR</p>
                                                    <p className="text-xl font-bold mt-1 text-primary">
                                                        {currentHolding.xirr ? `${currentHolding.xirr.toFixed(1)}%` : "N/A"}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Chart */}
                                        <div className="bg-surface-subtle rounded-xl border border-border-subtle p-4 h-[280px] sm:h-[320px]">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
                                                    <TrendingUp size={16} /> Performance History
                                                </h3>
                                                <div className="flex items-center gap-4 text-xs font-semibold">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                                        <span className="text-text-muted">Current Value</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
                                                        <span className="text-text-muted">Capital Invested</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {chartData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="85%">
                                                    <AreaChart data={chartData}>
                                                        <defs>
                                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                            </linearGradient>
                                                            <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                                                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #222)" vertical={false} />
                                                        <XAxis dataKey="date" stroke="var(--color-text-muted, #888)" tick={{ fontSize: 10 }} minTickGap={30} />
                                                        <YAxis stroke="var(--color-text-muted, #888)" tick={{ fontSize: 10 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: 'var(--color-bg-surface, #111)', borderColor: 'var(--color-border-subtle, #333)', color: 'var(--color-text-primary, #fff)', borderRadius: '10px', fontSize: '12px' }}
                                                            formatter={(val: any, name: any) => [formatCurrency(Number(val)), name === 'value' ? 'Current Value' : 'Capital Invested']}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="invested"
                                                            stroke="#94a3b8"
                                                            strokeWidth={2}
                                                            fillOpacity={1}
                                                            fill="url(#colorInv)"
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="value"
                                                            stroke="#10b981"
                                                            strokeWidth={2.5}
                                                            fillOpacity={1}
                                                            fill="url(#colorVal)"
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-[80%] flex items-center justify-center text-text-muted text-xs">
                                                    No snapshot history recorded yet.
                                                </div>
                                            )}
                                        </div>

                                        {/* Account & Nominee Records Card */}
                                        <div className="bg-surface-subtle/80 rounded-2xl border border-border-subtle p-5 mt-6">
                                            <div className="flex items-center justify-between mb-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                        <ShieldCheck size={16} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-wider text-primary">Account & Nominee Records</h4>
                                                        <p className="text-[10px] text-text-muted">Included in your Consolidated Portfolio Statement export</p>
                                                    </div>
                                                </div>
                                                {isEditingRecords ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                haptics.selection();
                                                                setIsEditingRecords(false);
                                                                // Reset to current holding values
                                                                setEditInstitutionName(currentHolding.institution_name || '');
                                                                setEditAccountNumber(currentHolding.account_number_or_folio || '');
                                                                setEditNomineeName(currentHolding.nominee_name || '');
                                                                setEditRemarks(currentHolding.remarks || '');
                                                            }}
                                                            disabled={savingRecords}
                                                            className="text-xs px-2.5 py-1 rounded-lg border border-border-subtle bg-surface-subtle text-text-muted hover:text-primary transition-all active:scale-95"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleSaveRecords}
                                                            disabled={savingRecords}
                                                            className={`text-xs px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${
                                                                recordsSavedSuccess
                                                                    ? 'bg-emerald-500 text-white'
                                                                    : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                                            }`}
                                                        >
                                                            {savingRecords ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : recordsSavedSuccess ? (
                                                                <Check size={12} />
                                                            ) : (
                                                                <Save size={12} />
                                                            )}
                                                            <span>{recordsSavedSuccess ? 'Saved' : savingRecords ? 'Saving...' : 'Save Records'}</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            haptics.selection();
                                                            setIsEditingRecords(true);
                                                        }}
                                                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 active:scale-95 transition-all bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                                                    >
                                                        <Pencil size={11} /> Edit Records
                                                    </button>
                                                )}
                                            </div>

                                            {isEditingRecords ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                                                            Institution / Bank
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editInstitutionName}
                                                            onChange={(e) => setEditInstitutionName(e.target.value)}
                                                            placeholder="e.g. Axis Bank / Groww / SBI"
                                                            className="w-full px-3 py-2 rounded-xl bg-surface/90 border border-border-subtle text-xs font-semibold text-primary focus:outline-none focus:border-emerald-500 transition-colors"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                                                            Folio / Account / Ref #
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editAccountNumber}
                                                            onChange={(e) => setEditAccountNumber(e.target.value)}
                                                            placeholder="e.g. 9210100... / Folio No."
                                                            className="w-full px-3 py-2 rounded-xl bg-surface/90 border border-border-subtle text-xs font-semibold text-primary focus:outline-none focus:border-emerald-500 transition-colors"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                                                            Registered Nominee
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editNomineeName}
                                                            onChange={(e) => setEditNomineeName(e.target.value)}
                                                            placeholder="e.g. Tarun Kumar Dey"
                                                            className="w-full px-3 py-2 rounded-xl bg-surface/90 border border-border-subtle text-xs font-semibold text-primary focus:outline-none focus:border-emerald-500 transition-colors"
                                                        />
                                                    </div>
                                                    <div className="col-span-1 sm:col-span-3">
                                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                                                            Remarks & Document Location
                                                        </label>
                                                        <textarea
                                                            rows={3}
                                                            value={editRemarks}
                                                            onChange={(e) => setEditRemarks(e.target.value)}
                                                            placeholder="e.g. Branch, locker, physical bond location, or notes"
                                                            className="w-full px-3 py-2.5 rounded-xl bg-surface/90 border border-border-subtle text-xs font-semibold text-primary focus:outline-none focus:border-emerald-500 transition-colors resize-none leading-relaxed"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div className="bg-surface/60 rounded-xl p-3 border border-border-subtle/50">
                                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Institution / Bank</span>
                                                        <span className="text-xs font-bold text-primary mt-1 block truncate">
                                                            {currentHolding.institution_name || <span className="text-text-muted/60 font-normal italic">Not specified</span>}
                                                        </span>
                                                    </div>
                                                    <div className="bg-surface/60 rounded-xl p-3 border border-border-subtle/50">
                                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Folio / Account / Ref #</span>
                                                        <span className="text-xs font-bold text-primary mt-1 block truncate">
                                                            {currentHolding.account_number_or_folio || <span className="text-text-muted/60 font-normal italic">Not specified</span>}
                                                        </span>
                                                    </div>
                                                    <div className="bg-surface/60 rounded-xl p-3 border border-border-subtle/50">
                                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Registered Nominee</span>
                                                        <span className="text-xs font-bold text-primary mt-1 block truncate">
                                                            {currentHolding.nominee_name || <span className="text-text-muted/60 font-normal italic">Not specified</span>}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1 sm:col-span-3 bg-surface/60 rounded-xl p-3.5 border border-border-subtle/50">
                                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Remarks & Location</span>
                                                        <p className="text-xs font-semibold text-primary mt-1 leading-relaxed break-words whitespace-pre-wrap">
                                                            {currentHolding.remarks || <span className="text-text-muted/60 font-normal italic">No notes added</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : activeTab === 'history' ? (
                                    <div className="space-y-6">
                                        {/* Investment Summary Cards */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="bg-surface-subtle rounded-2xl p-3.5 sm:p-4 border border-border-subtle">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Total Contributions</p>
                                                <p className="text-base sm:text-xl font-bold mt-1 text-primary tabular-nums">
                                                    {history.length} <span className="text-xs font-normal text-text-muted">records</span>
                                                </p>
                                            </div>
                                            <div className="bg-surface-subtle rounded-2xl p-3.5 sm:p-4 border border-border-subtle">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Recorded Inflows</p>
                                                <p className="text-base sm:text-xl font-bold mt-1 text-primary font-mono tabular-nums">
                                                    {formatCurrency(history.reduce((acc, it) => acc + (it.amount || 0), 0))}
                                                </p>
                                            </div>
                                            <div className="bg-surface-subtle rounded-2xl p-3.5 sm:p-4 border border-border-subtle">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Units Accumulated</p>
                                                <p className="text-base sm:text-xl font-bold mt-1 text-primary font-mono tabular-nums">
                                                    {history[0]?.cumulative_units != null 
                                                        ? Number(history[0].cumulative_units).toFixed(3)
                                                        : (currentHolding.current_units ? Number(currentHolding.current_units).toFixed(3) : 'N/A')}
                                                </p>
                                            </div>
                                            <div className="bg-surface-subtle rounded-2xl p-3.5 sm:p-4 border border-border-subtle">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Current Valuation</p>
                                                <p className="text-base sm:text-xl font-bold mt-1 text-primary font-mono tabular-nums">
                                                    {formatCurrency(currentHolding.current_value || 0)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* History Itemized List */}
                                        <div className="bg-surface-subtle rounded-2xl border border-border-subtle p-4 sm:p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                                                        <History size={16} className="text-emerald-400" />
                                                        Investment Ledger & Inflows
                                                    </h3>
                                                    <p className="text-[11px] text-text-muted mt-0.5">Chronological record of SIP debits, NAV allotments, and capital contributions</p>
                                                </div>
                                                <button
                                                    onClick={() => fetchHistory(currentHolding?.id)}
                                                    disabled={loadingHistory}
                                                    className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1 active:scale-95"
                                                >
                                                    <Loader2 size={13} className={loadingHistory ? "animate-spin" : ""} />
                                                    <span>Refresh</span>
                                                </button>
                                            </div>

                                            {loadingHistory && history.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                                                    <Loader2 className="animate-spin w-8 h-8 text-primary/40 mb-3" />
                                                    <p className="text-xs">Loading investment records...</p>
                                                </div>
                                            ) : history.length === 0 ? (
                                                <div className="text-center py-16 bg-surface/50 rounded-xl border border-dashed border-border-subtle px-4">
                                                    <History size={32} className="mx-auto text-text-muted/40 mb-3" />
                                                    <p className="text-sm font-bold text-primary">No Investment Records Found</p>
                                                    <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                                                        Map bank debit transactions to this holding using the Asset Linker to automatically track date, units, purchase NAV, and returns.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {history.map((item, idx) => {
                                                        const dateFormatted = new Date(item.date).toLocaleDateString([], {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        });
                                                        const isGain = (item.gain_loss || 0) >= 0;

                                                        return (
                                                            <div
                                                                key={item.id || idx}
                                                                className="p-3.5 sm:p-4 rounded-xl border border-border-subtle bg-surface hover:bg-surface-hover transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                                                            >
                                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                                    <div className="w-9 h-9 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                                                                        <Calendar size={16} className="text-primary" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="text-sm font-bold text-primary">{dateFormatted}</span>
                                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                                                item.investment_type === 'SIP' 
                                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                                    : item.investment_type === 'DEPOSIT'
                                                                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                                            }`}>
                                                                                {item.investment_type}
                                                                            </span>
                                                                            {item.transaction_id && (
                                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 font-semibold">
                                                                                    <CheckCircle2 size={10} /> Bank Debit
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-text-muted">
                                                                            {item.merchant_name && (
                                                                                <span className="font-medium text-text-secondary truncate max-w-[220px]">
                                                                                    {item.merchant_name}
                                                                                </span>
                                                                            )}
                                                                            {item.units != null && (
                                                                                <span className="text-primary font-mono">
                                                                                    +{Number(item.units).toFixed(3)} units
                                                                                </span>
                                                                            )}
                                                                            {item.nav != null && (
                                                                                <span className="font-mono">
                                                                                    @ NAV ₹{Number(item.nav).toFixed(2)}
                                                                                </span>
                                                                            )}
                                                                            {item.cumulative_units != null && (
                                                                                <span className="text-[11px] text-text-muted opacity-80 font-mono">
                                                                                    (Total: {Number(item.cumulative_units).toFixed(3)} units)
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {item.remarks && (
                                                                            <p className="text-xs text-text-muted/80 italic mt-1 truncate max-w-md">
                                                                                "{item.remarks}"
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t border-border-subtle/50 sm:border-t-0">
                                                                    <span className="font-bold font-mono text-base text-primary">
                                                                        ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                                                                    </span>
                                                                    {item.gain_loss != null && (
                                                                        <div className="flex items-center gap-1 text-[11px] font-mono mt-0.5">
                                                                            <span className="text-text-muted">Now: ₹{Number(item.current_value_now).toLocaleString('en-IN')}</span>
                                                                            <span className={`font-bold flex items-center ${isGain ? 'text-status-success' : 'text-status-danger'}`}>
                                                                                {isGain ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                                                {isGain ? '+' : ''}{Number(item.gain_loss_percent).toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <SIPDateAnalysis holdingId={holding.id} />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
