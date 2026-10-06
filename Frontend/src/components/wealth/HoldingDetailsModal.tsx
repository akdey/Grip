
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, Pencil, Save, X, Check, Percent, Calendar, Lock, ShieldCheck, Landmark, FileText, UserCheck, MapPin, Loader2 } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'performance' | 'sip-analysis'>('performance');
    const [currentHolding, setCurrentHolding] = useState<any>(holding);
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
                        <div className="p-6 sm:p-8 border-b border-border-subtle flex justify-between items-start bg-surface-subtle shrink-0">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black text-primary line-clamp-1 tracking-tighter uppercase italic heading-apple">
                                    {currentHolding.name}
                                </h2>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-text-muted font-bold uppercase tracking-widest">
                                    <span className="bg-accent-subtle text-primary px-3 py-1 rounded-full border border-border-subtle">{currentHolding.asset_type}</span>
                                    {currentHolding.ticker_symbol && <span>• {currentHolding.ticker_symbol}</span>}
                                    {isFixedIncome && currentHolding.interest_rate && (
                                        <span className="text-emerald-400 font-semibold">• {currentHolding.interest_rate}% p.a.</span>
                                    )}
                                    {isFixedIncome && currentHolding.maturity_amount && (
                                        <span className="text-cyan-400 font-semibold">• Mat: {formatCurrency(currentHolding.maturity_amount)}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setIsEditing(!isEditing);
                                    }}
                                    className={`px-4 py-2.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                                        isEditing 
                                            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                                            : 'bg-surface border-border-subtle hover:bg-surface-hover text-primary'
                                    }`}
                                >
                                    {isEditing ? <X size={14} /> : <Pencil size={14} />}
                                    <span>{isEditing ? 'Cancel' : 'Edit Holding'}</span>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-11 h-11 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all shadow-xl group"
                                >
                                    <ChevronDown size={22} className="group-hover:translate-y-0.5 transition-transform" />
                                </button>
                            </div>
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
                            {hasSIPData && (
                                <div className="flex gap-2 px-6 sm:px-10 border-b border-border-subtle bg-surface-subtle/50">
                                    <button
                                        onClick={() => setActiveTab('performance')}
                                        className={`px-6 py-4 text-xs font-black uppercase tracking-[3px] transition-all relative ${activeTab === 'performance' ? 'text-emerald-500' : 'text-text-muted hover:text-primary'}`}
                                    >
                                        Performance
                                        {activeTab === 'performance' && (
                                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('sip-analysis')}
                                        className={`px-6 py-4 text-xs font-black uppercase tracking-[3px] transition-all relative ${activeTab === 'sip-analysis' ? 'text-emerald-500' : 'text-text-muted hover:text-primary'}`}
                                    >
                                        SIP Intelligence
                                        {activeTab === 'sip-analysis' && (
                                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                                        )}
                                    </button>
                                </div>
                            )}

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
                                                    <p className="text-xl font-bold mt-1 text-cyan-400">
                                                        {currentHolding.maturity_amount ? formatCurrency(currentHolding.maturity_amount) : 'N/A'}
                                                    </p>
                                                    {currentHolding.maturity_date && (
                                                        <p className="text-[10px] text-text-muted mt-0.5">
                                                            Matures: {new Date(currentHolding.maturity_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    )}
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
                                                    <p className={`text-xl font-bold mt-1 ${(currentHolding.current_value - currentHolding.total_invested) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
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
                                                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
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
                                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
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
                                                            stroke="#06b6d4"
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
