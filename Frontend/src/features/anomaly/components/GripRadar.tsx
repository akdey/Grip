import React, { memo, useState, useEffect, useMemo } from 'react';
import {
    ShieldAlert,
    ShieldCheck,
    RotateCw,
    TrendingUp,
    Copy,
    Flame,
    RefreshCw,
    Store,
    Handshake,
    ChevronDown,
    ArrowRight,
    ExternalLink,
    AlertTriangle,
    Check,
    CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    useAnomalyFlags,
    useScanAnomalies,
    useDismissAnomaly,
    useDismissAllAnomalies,
    type AnomalyFlag
} from '../hooks';
import { haptics } from '../../../lib/haptics';

interface GripRadarProps {
    formatCurrency: (amount: number) => string;
}

const getAnomalyMeta = (type: string) => {
    switch (type) {
        case 'amount_spike':
            return {
                label: 'Spend Spike',
                icon: TrendingUp,
                colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
            };
        case 'near_duplicate':
            return {
                label: 'Duplicate Charge',
                icon: Copy,
                colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
            };
        case 'category_burn':
            return {
                label: 'Category Velocity',
                icon: Flame,
                colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
            };
        case 'recurring_drift':
            return {
                label: 'Surety Drift',
                icon: RefreshCw,
                colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
            };
        case 'new_merchant_high':
            return {
                label: 'First-time Merchant',
                icon: Store,
                colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
            };
        case 'settle_up_aging':
            return {
                label: 'Aging Debt',
                icon: Handshake,
                colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
            };
        default:
            return {
                label: 'Anomaly',
                icon: AlertTriangle,
                colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
            };
    }
};

type FilterCategory = 'all' | 'high' | 'spikes' | 'surety_settle';

export const GripRadar: React.FC<GripRadarProps> = memo(({ formatCurrency }) => {
    const navigate = useNavigate();
    const { data, isLoading } = useAnomalyFlags();
    const scanMutation = useScanAnomalies();
    const dismissMutation = useDismissAnomaly();
    const dismissAllMutation = useDismissAllAnomalies();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');

    // Body scroll lock when drawer is open
    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [isDrawerOpen]);

    const handleScan = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        haptics.impact('medium');
        setIsScanning(true);
        try {
            await scanMutation.mutateAsync();
            haptics.notification('success');
        } catch {
            haptics.notification('error');
        } finally {
            setIsScanning(false);
        }
    };

    const handleDismiss = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        haptics.impact('light');
        dismissMutation.mutate(id);
    };

    const handleDismissAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        haptics.impact('medium');
        dismissAllMutation.mutate();
    };

    const handleNavigate = (flag: AnomalyFlag) => {
        haptics.selection();
        setIsDrawerOpen(false);
        if (flag.anomaly_type === 'settle_up_aging') {
            navigate('/settle-up');
        } else if (flag.transaction_id) {
            navigate(`/transactions?search=${encodeURIComponent(flag.merchant_name || flag.id)}`);
        } else if (flag.category) {
            navigate(`/transactions?category=${encodeURIComponent(flag.category)}`);
        } else {
            navigate('/transactions');
        }
    };

    const flags = data?.flags || [];
    const hasFlags = flags.length > 0;
    const hasHighSeverity = (data?.high_severity_count || 0) > 0;
    const totalFlaggedVolume = useMemo(() => {
        return flags.reduce((acc, f) => acc + (f.amount ? Math.abs(Number(f.amount)) : 0), 0);
    }, [flags]);

    const topFlag = flags[0];
    const topSignals = flags.slice(0, 2);

    // Filtered flags for the drawer
    const filteredFlags = useMemo(() => {
        if (selectedFilter === 'high') {
            return flags.filter(f => f.severity === 'high');
        }
        if (selectedFilter === 'spikes') {
            return flags.filter(f => f.anomaly_type === 'amount_spike' || f.anomaly_type === 'category_burn');
        }
        if (selectedFilter === 'surety_settle') {
            return flags.filter(f => f.anomaly_type === 'recurring_drift' || f.anomaly_type === 'settle_up_aging');
        }
        return flags;
    }, [flags, selectedFilter]);

    // 1. Loading Skeleton
    if (isLoading) {
        return (
            <div className="bg-surface-subtle border border-border-subtle p-6 rounded-[2.5rem] relative overflow-hidden animate-pulse h-[160px]">
                <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-surface-pill" />
                    <div className="h-3 w-32 bg-surface-pill rounded" />
                </div>
                <div className="mt-4 space-y-3">
                    <div className="h-8 w-40 bg-surface-pill rounded" />
                    <div className="h-3 w-60 bg-surface-pill rounded" />
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Dashboard Card */}
            {!hasFlags ? (
                // ALL CLEAR STATE: Calm, minimal, reassuring row
                <div
                    onClick={() => {
                        haptics.selection();
                        setIsDrawerOpen(true);
                    }}
                    className="bg-surface-subtle border border-border-subtle hover:border-border-default/60 p-5 rounded-[2.5rem] relative overflow-hidden group cursor-pointer active:scale-[0.99] transition-all shadow-none flex items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-8 h-8 rounded-full badge-success flex items-center justify-center shrink-0 border shadow-inner">
                            <ShieldCheck size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[3px] text-text-muted">
                                    Grip Radar
                                </span>
                                <span className="badge-success text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 border">
                                    <Check size={10} /> All Clear
                                </span>
                            </div>
                            <p className="text-xs text-text-muted truncate mt-0.5">
                                Spending patterns, recurring bills, and peer settlements are within normal bounds.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleScan}
                            disabled={isScanning}
                            className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-text-primary transition-all active:scale-95 shrink-0"
                            title="Scan transactions now"
                            aria-label="Scan transactions now"
                        >
                            <RotateCw size={12} className={isScanning ? 'animate-spin text-accent-text' : ''} />
                        </button>
                    </div>
                </div>
            ) : (
                // ANOMALIES PRESENT STATE: Full-grade executive card matching AIForecast aesthetic
                <div
                    onClick={() => {
                        haptics.selection();
                        setIsDrawerOpen(true);
                    }}
                    className={`bg-surface-subtle border p-6 rounded-[2.5rem] relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all shadow-none hover:shadow-md ${
                        hasHighSeverity
                            ? 'border-status-danger-border/40 hover:border-status-danger-border/70'
                            : 'border-status-warning-border/40 hover:border-status-warning-border/70'
                    }`}
                >
                    {/* Watermark Icon */}
                    <div className={`absolute right-6 top-6 transition-colors pointer-events-none ${
                        hasHighSeverity
                            ? 'text-status-danger/10 group-hover:text-status-danger/20'
                            : 'text-status-warning/10 group-hover:text-status-warning/20'
                    }`}>
                        <ShieldAlert size={52} />
                    </div>

                    <div className="relative z-10 flex flex-col gap-3.5">
                        {/* Header Eyebrow & Status Badge */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-inner ${
                                    hasHighSeverity ? 'badge-danger' : 'badge-warning'
                                }`}>
                                    <ShieldAlert size={13} />
                                </div>
                                <h2 className="text-[9px] font-black uppercase tracking-[3px] text-text-muted">
                                    Grip Radar
                                </h2>
                            </div>

                            <span className={`text-[8.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 border ${
                                hasHighSeverity ? 'badge-danger' : 'badge-warning'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${hasHighSeverity ? 'bg-status-danger animate-ping' : 'bg-status-warning'}`} />
                                {flags.length} {flags.length === 1 ? 'Anomaly' : 'Anomalies'} Detected
                            </span>
                        </div>

                        {/* Big Monetary Anchor & Subtitle */}
                        <div>
                            <p className="text-2xl sm:text-3xl font-black text-primary tracking-tight tabular-nums">
                                {formatCurrency(totalFlaggedVolume)}
                            </p>
                            <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1">
                                Flagged Outflow • Requires Review
                            </p>
                            {topFlag?.description && (
                                <p className="text-[10.5px] font-medium leading-relaxed mt-2.5 max-w-[340px] text-text-secondary line-clamp-2">
                                    "{topFlag.description}"
                                </p>
                            )}
                        </div>

                        {/* Signal Breakdown Chips */}
                        {topSignals.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {topSignals.map((f) => {
                                    const meta = getAnomalyMeta(f.anomaly_type);
                                    return (
                                        <span
                                            key={f.id}
                                            className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-muted flex items-center gap-1.5 uppercase tracking-wider"
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${f.severity === 'high' ? 'bg-status-danger' : 'bg-status-warning'}`} />
                                            <span className="text-text-primary font-semibold truncate max-w-[120px]">
                                                {f.merchant_name || meta.label}
                                            </span>
                                            {f.amount != null && (
                                                <span className="tabular-nums font-bold text-text-primary">
                                                    {formatCurrency(Math.abs(Number(f.amount)))}
                                                </span>
                                            )}
                                        </span>
                                    );
                                })}
                                {flags.length > 2 && (
                                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-surface-pill border border-border-subtle text-text-muted">
                                        +{flags.length - 2} more
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Action Footer */}
                        <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-text-muted group-hover:text-accent-text transition-colors">
                            <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                Review & Triage Signals
                            </span>
                            <span className="text-[10px] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                <span>Inspect All</span>
                                <ArrowRight size={12} />
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Apple-grade Review Bottom Sheet Drawer */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <div className="fixed inset-0 z-[2000] flex justify-center pointer-events-none">
                        {/* Backdrop with progressive blur & dimming */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                haptics.selection();
                                setIsDrawerOpen(false);
                            }}
                            className="absolute inset-0 bg-overlay backdrop-blur-md pointer-events-auto"
                        />

                        {/* Bottom Sheet Surface */}
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
                                    setIsDrawerOpen(false);
                                } else {
                                    haptics.selection();
                                }
                            }}
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-[90vh] max-h-[90vh] glass-drawer rounded-t-[2.5rem] flex flex-col shadow-2xl overflow-hidden pointer-events-auto z-[2000]"
                        >
                            {/* Grabber Handle */}
                            <div
                                className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
                                onClick={() => {
                                    haptics.selection();
                                    setIsDrawerOpen(false);
                                }}
                            >
                                <div className="w-10 h-1.5 bg-border-strong rounded-full transition-colors active:scale-95" />
                            </div>

                            {/* Clean Header Bar */}
                            <div className="px-5 sm:px-6 py-3 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-md">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                        hasFlags ? (hasHighSeverity ? 'badge-danger' : 'badge-warning') : 'badge-success'
                                    }`}>
                                        {hasFlags ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight truncate heading-apple">
                                            Grip Radar
                                        </h3>
                                        <p className="text-xs text-text-muted truncate">
                                            Spending Watchdog & Anomaly Triage
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setIsDrawerOpen(false);
                                    }}
                                    className="w-9 h-9 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all shadow-xs"
                                    aria-label="Close"
                                >
                                    <ChevronDown size={20} />
                                </button>
                            </div>

                            {/* Scrollable Content Body */}
                            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 custom-scrollbar touch-pan-y overscroll-contain">
                                {!hasFlags ? (
                                    // Empty state inside drawer
                                    <div className="py-20 px-4 text-center space-y-4">
                                        <div className="w-14 h-14 rounded-3xl badge-success flex items-center justify-center mx-auto shadow-sm">
                                            <ShieldCheck size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-base sm:text-lg font-bold text-text-primary">
                                                All Clear • Zero Active Anomalies
                                            </h4>
                                            <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                                                All transactions and committed subscriptions are currently behaving within historical baselines.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleScan()}
                                            disabled={isScanning}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border-subtle hover:border-border-default text-xs font-semibold text-text-primary hover:text-accent-text transition-all active:scale-95 shadow-xs"
                                        >
                                            <RotateCw size={12} className={isScanning ? 'animate-spin' : ''} />
                                            <span>{isScanning ? 'Scanning...' : 'Run Radar Scan'}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Financial Overview & Actions Hero Card */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3.5 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                        Total Flagged Outflow
                                                    </span>
                                                    <p className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight tabular-nums mt-0.5">
                                                        {formatCurrency(totalFlaggedVolume)}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-end gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {(data?.high_severity_count || 0) > 0 && (
                                                            <span className="badge-danger text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                                                                {data?.high_severity_count} High Priority
                                                            </span>
                                                        )}
                                                        <span className="badge-neutral text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                                                            {flags.length} Total
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-text-muted">
                                                        Scanned daily at 6:00 AM IST
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Toolbar Controls inside Hero */}
                                            <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleScan()}
                                                    disabled={isScanning}
                                                    className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-xs font-semibold text-text-muted hover:text-text-primary flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                                                >
                                                    <RotateCw size={12} className={isScanning ? 'animate-spin text-accent-text' : ''} />
                                                    <span>{isScanning ? 'Scanning...' : 'Re-scan History'}</span>
                                                </button>

                                                {flags.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleDismissAll}
                                                        disabled={dismissAllMutation.isPending}
                                                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-xs font-semibold text-text-muted hover:text-text-primary flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                                                    >
                                                        <CheckCheck size={12} />
                                                        <span>Dismiss All ({flags.length})</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Filter Chips (if 3+ flags) */}
                                        {flags.length >= 3 && (
                                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
                                                <button
                                                    onClick={() => setSelectedFilter('all')}
                                                    className={`px-3 py-1 rounded-xl border transition-all active:scale-95 ${
                                                        selectedFilter === 'all'
                                                            ? 'bg-primary text-text-inverse border-transparent'
                                                            : 'bg-surface border-border-subtle text-text-muted hover:text-text-primary'
                                                    }`}
                                                >
                                                    All ({flags.length})
                                                </button>

                                                {(data?.high_severity_count || 0) > 0 && (
                                                    <button
                                                        onClick={() => setSelectedFilter('high')}
                                                        className={`px-3 py-1 rounded-xl border transition-all active:scale-95 ${
                                                            selectedFilter === 'high'
                                                                ? 'bg-status-danger text-white border-transparent'
                                                                : 'bg-surface border-border-subtle text-text-muted hover:text-status-danger'
                                                        }`}
                                                    >
                                                        High Priority ({data?.high_severity_count})
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setSelectedFilter('spikes')}
                                                    className={`px-3 py-1 rounded-xl border transition-all active:scale-95 ${
                                                        selectedFilter === 'spikes'
                                                            ? 'bg-primary text-text-inverse border-transparent'
                                                            : 'bg-surface border-border-subtle text-text-muted hover:text-text-primary'
                                                    }`}
                                                >
                                                    Spikes & Velocity
                                                </button>

                                                <button
                                                    onClick={() => setSelectedFilter('surety_settle')}
                                                    className={`px-3 py-1 rounded-xl border transition-all active:scale-95 ${
                                                        selectedFilter === 'surety_settle'
                                                            ? 'bg-primary text-text-inverse border-transparent'
                                                            : 'bg-surface border-border-subtle text-text-muted hover:text-text-primary'
                                                    }`}
                                                >
                                                    Surety & Debt
                                                </button>
                                            </div>
                                        )}

                                        {/* Anomaly Cards Section */}
                                        <div className="space-y-3 pt-1">
                                            <div className="flex items-center justify-between px-1">
                                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                                                    Flagged Events ({filteredFlags.length})
                                                </h4>
                                                <span className="text-[10px] text-text-muted">
                                                    Tap to inspect details
                                                </span>
                                            </div>

                                            <AnimatePresence mode="popLayout">
                                                {filteredFlags.map((flag) => {
                                                    const meta = getAnomalyMeta(flag.anomaly_type);
                                                    const Icon = meta.icon;
                                                    const isHigh = flag.severity === 'high';

                                                    return (
                                                        <motion.div
                                                            key={flag.id}
                                                            layout
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.96 }}
                                                            transition={{ duration: 0.2 }}
                                                            className={`p-4 sm:p-5 rounded-2xl bg-surface border transition-all space-y-3.5 shadow-xs ${
                                                                isHigh
                                                                    ? 'border-status-danger-border/40 hover:border-status-danger-border/70'
                                                                    : 'border-border-subtle hover:border-border-default'
                                                            }`}
                                                        >
                                                            {/* Card Header: Type, Title, and Amount */}
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                                    <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border mt-0.5 ${meta.colorClass}`}>
                                                                        <Icon size={18} />
                                                                    </div>

                                                                    <div className="min-w-0 flex-1 space-y-1">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                                                                isHigh ? 'badge-danger' : 'badge-warning'
                                                                            }`}>
                                                                                {isHigh ? 'High Priority' : 'Attention'}
                                                                            </span>
                                                                            <span className="badge-neutral text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md">
                                                                                {meta.label}
                                                                            </span>
                                                                        </div>

                                                                        <h5 className="text-sm sm:text-base font-bold text-text-primary tracking-tight truncate">
                                                                            {flag.title}
                                                                        </h5>
                                                                    </div>
                                                                </div>

                                                                {/* Prominent Amount */}
                                                                {flag.amount != null && (
                                                                    <div className="text-right shrink-0">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                                            Charge / Balance
                                                                        </span>
                                                                        <p className="text-base sm:text-lg font-black text-text-primary tabular-nums mt-0.5">
                                                                            {formatCurrency(Math.abs(Number(flag.amount)))}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Diagnostic Inset Panel */}
                                                            <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle/70 space-y-2">
                                                                <p className="text-xs text-text-secondary leading-relaxed">
                                                                    {flag.description}
                                                                </p>

                                                                {flag.expected_range && (
                                                                    <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/50 text-[11px] flex-wrap">
                                                                        <span className="text-text-muted font-medium">Expected Baseline:</span>
                                                                        <span className="font-mono text-text-primary bg-surface-pill px-2 py-0.5 rounded border border-border-subtle/50 font-semibold">
                                                                            {flag.expected_range}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Action Footer: Inspect vs Dismiss */}
                                                            <div className="flex items-center justify-between gap-2 pt-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleNavigate(flag)}
                                                                    className="px-3.5 py-2 rounded-xl bg-surface-pill hover:bg-surface-hover border border-border-subtle hover:border-border-default text-xs font-semibold text-text-primary hover:text-accent-text flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                                                                >
                                                                    <span>{flag.anomaly_type === 'settle_up_aging' ? 'Inspect in Settle Up' : 'Inspect Transaction'}</span>
                                                                    <ExternalLink size={12} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDismiss(e, flag.id)}
                                                                    className="px-3 py-2 rounded-xl bg-surface-pill hover:bg-surface-hover border border-border-subtle hover:border-status-danger-border text-xs font-semibold text-text-muted hover:text-status-danger flex items-center gap-1.5 transition-all active:scale-95"
                                                                    title="Dismiss anomaly flag"
                                                                >
                                                                    <Check size={12} />
                                                                    <span>Dismiss</span>
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
});
