import React, { memo, useState, useEffect } from 'react';
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
    X,
    ChevronDown,
    ArrowRight,
    ExternalLink,
    AlertTriangle,
    Check
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

const getAnomalyIcon = (type: string) => {
    switch (type) {
        case 'amount_spike':
            return TrendingUp;
        case 'near_duplicate':
            return Copy;
        case 'category_burn':
            return Flame;
        case 'recurring_drift':
            return RefreshCw;
        case 'new_merchant_high':
            return Store;
        case 'settle_up_aging':
            return Handshake;
        default:
            return AlertTriangle;
    }
};

const getAnomalyTypeLabel = (type: string) => {
    switch (type) {
        case 'amount_spike':
            return 'Spend Spike';
        case 'near_duplicate':
            return 'Duplicate Charge';
        case 'category_burn':
            return 'Category Velocity';
        case 'recurring_drift':
            return 'Surety Drift';
        case 'new_merchant_high':
            return 'New Merchant';
        case 'settle_up_aging':
            return 'Aging Debt';
        default:
            return 'Anomaly';
    }
};

export const GripRadar: React.FC<GripRadarProps> = memo(({ formatCurrency }) => {
    const navigate = useNavigate();
    const { data, isLoading } = useAnomalyFlags();
    const scanMutation = useScanAnomalies();
    const dismissMutation = useDismissAnomaly();
    const dismissAllMutation = useDismissAllAnomalies();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // Body scroll lock when drawer is open
    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [isDrawerOpen]);

    const handleScan = async (e: React.MouseEvent) => {
        e.stopPropagation();
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
    const totalFlaggedVolume = flags.reduce((acc, f) => acc + (f.amount ? Math.abs(Number(f.amount)) : 0), 0);

    // 1. Loading Skeleton
    if (isLoading) {
        return (
            <div className="bg-surface-subtle border border-border-subtle p-4 sm:p-5 rounded-[2.5rem] relative overflow-hidden animate-pulse h-[76px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-surface-pill" />
                    <div className="space-y-1.5">
                        <div className="h-3 w-28 bg-surface-pill rounded" />
                        <div className="h-2.5 w-44 bg-surface-pill rounded" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Dashboard Compact Card */}
            {!hasFlags ? (
                // ALL CLEAR STATE: Compact, calm, reassuring row
                <div
                    onClick={() => {
                        haptics.selection();
                        setIsDrawerOpen(true);
                    }}
                    className="bg-surface-subtle border border-border-subtle hover:border-border-default/60 p-4 sm:p-5 rounded-[2.5rem] transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] group shadow-xs"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-2xl badge-success flex items-center justify-center shrink-0">
                            <ShieldCheck size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                                    Grip Radar
                                </span>
                                <span className="badge-success text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <Check size={12} /> All Clear
                                </span>
                            </div>
                            <p className="text-xs text-text-muted truncate mt-0.5">
                                No spending spikes, duplicate charges, or surety drifts detected.
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
                // ANOMALIES PRESENT STATE: Minimalist, compact, non-intrusive alert pill
                <div
                    onClick={() => {
                        haptics.selection();
                        setIsDrawerOpen(true);
                    }}
                    className={`bg-surface-subtle border p-4 sm:p-5 rounded-[2.5rem] transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] group shadow-xs ${
                        hasHighSeverity
                            ? 'border-status-danger-border/70 hover:border-status-danger-border'
                            : 'border-status-warning-border/70 hover:border-status-warning-border'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Status Icon with subtle pulsing ring */}
                        <div className="relative shrink-0">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                                hasHighSeverity ? 'badge-danger' : 'badge-warning'
                            }`}>
                                <ShieldAlert size={16} />
                            </div>
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                    hasHighSeverity ? 'bg-status-danger' : 'bg-status-warning'
                                }`} />
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                    hasHighSeverity ? 'bg-status-danger' : 'bg-status-warning'
                                }`} />
                            </span>
                        </div>

                        {/* Title & Preview info */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                                    Grip Radar
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                    hasHighSeverity ? 'badge-danger' : 'badge-warning'
                                }`}>
                                    {flags.length} {flags.length === 1 ? 'Anomaly' : 'Anomalies'}
                                </span>
                            </div>

                            <p className="text-xs font-semibold text-text-primary truncate mt-0.5 flex items-center gap-1.5">
                                <span className="truncate">{flags[0]?.title}</span>
                                {flags[0]?.amount != null && (
                                    <span className="text-text-muted font-normal shrink-0 tabular-nums">
                                        • {formatCurrency(Math.abs(Number(flags[0].amount)))}
                                    </span>
                                )}
                                {flags.length > 1 && (
                                    <span className="text-text-muted text-[10px] font-medium shrink-0">
                                        +{flags.length - 1} more
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle group-hover:border-border-default text-xs font-semibold text-text-primary group-hover:text-accent-text flex items-center gap-1 transition-all">
                            <span>Review</span>
                            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                    </div>
                </div>
            )}

            {/* Apple-grade Review Bottom Sheet Drawer */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <div className="fixed inset-0 z-[2000] flex justify-center pointer-events-none">
                        {/* Backdrop */}
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

                        {/* Sheet */}
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
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-[88vh] max-h-[88vh] glass-drawer rounded-t-[2.5rem] flex flex-col shadow-2xl overflow-hidden pointer-events-auto z-[2000]"
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

                            {/* Drawer Header */}
                            <div className="px-5 sm:px-6 py-3.5 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-md">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                        hasFlags ? (hasHighSeverity ? 'badge-danger' : 'badge-warning') : 'badge-success'
                                    }`}>
                                        {hasFlags ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-semibold text-text-primary tracking-tight truncate heading-apple">
                                            Grip Radar
                                        </h3>
                                        <p className="text-xs text-text-muted truncate">
                                            {hasFlags ? `${flags.length} active spending signals detected` : 'All transactions verified'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleScan}
                                        disabled={isScanning}
                                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-xs font-semibold text-text-muted hover:text-text-primary flex items-center gap-1.5 active:scale-95 transition-all"
                                        title="Scan transactions now"
                                    >
                                        <RotateCw size={12} className={isScanning ? 'animate-spin text-accent-text' : ''} />
                                        <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
                                    </button>

                                    {flags.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={handleDismissAll}
                                            disabled={dismissAllMutation.isPending}
                                            className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-xs font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                                        >
                                            Dismiss All
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            haptics.selection();
                                            setIsDrawerOpen(false);
                                        }}
                                        className="w-8 h-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all shadow-xs"
                                        aria-label="Close"
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain">
                                {!hasFlags ? (
                                    // Empty state inside drawer
                                    <div className="py-16 px-4 text-center space-y-3">
                                        <div className="w-12 h-12 rounded-2xl badge-success flex items-center justify-center mx-auto">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-semibold text-text-primary">
                                                All Clear
                                            </h4>
                                            <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                                                No unusual amount spikes, duplicate transactions, or surety budget drifts were detected.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleScan}
                                            disabled={isScanning}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border-subtle hover:border-border-default text-xs font-semibold text-text-primary hover:text-accent-text transition-all active:scale-95 mt-2"
                                        >
                                            <RotateCw size={12} className={isScanning ? 'animate-spin' : ''} />
                                            <span>Run Radar Scan</span>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Volume / Summary Header Strip */}
                                        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-between gap-3">
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted block">
                                                    Flagged Outflow Volume
                                                </span>
                                                <p className="text-lg font-bold text-text-primary tabular-nums mt-0.5">
                                                    {formatCurrency(totalFlaggedVolume)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {(data?.high_severity_count || 0) > 0 && (
                                                    <span className="badge-danger text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                                        {data?.high_severity_count} High Priority
                                                    </span>
                                                )}
                                                <span className="badge-neutral text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                                    {flags.length} Total
                                                </span>
                                            </div>
                                        </div>

                                        {/* List of Anomaly Cards */}
                                        <div className="space-y-2.5">
                                            <AnimatePresence>
                                                {flags.map((flag) => {
                                                    const Icon = getAnomalyIcon(flag.anomaly_type);
                                                    const isHigh = flag.severity === 'high';
                                                    const typeLabel = getAnomalyTypeLabel(flag.anomaly_type);

                                                    return (
                                                        <motion.div
                                                            key={flag.id}
                                                            layout
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.96 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="p-4 rounded-2xl bg-surface border border-border-subtle hover:border-border-default/60 transition-all space-y-3 shadow-xs"
                                                        >
                                                            {/* Card Header */}
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                                                                        isHigh ? 'badge-danger' : 'badge-warning'
                                                                    }`}>
                                                                        <Icon size={16} />
                                                                    </div>

                                                                    <div className="min-w-0 space-y-0.5 flex-1">
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            <span className="text-sm font-semibold text-text-primary">
                                                                                {flag.title}
                                                                            </span>
                                                                            {flag.amount != null && (
                                                                                <span className="text-sm font-semibold text-text-primary tabular-nums">
                                                                                    • {formatCurrency(Math.abs(Number(flag.amount)))}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                                                                isHigh ? 'badge-danger' : 'badge-warning'
                                                                            }`}>
                                                                                {isHigh ? 'High Severity' : 'Attention'}
                                                                            </span>
                                                                            <span className="badge-neutral text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md">
                                                                                {typeLabel}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Dismiss button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDismiss(e, flag.id)}
                                                                    className="p-1.5 rounded-lg bg-surface-subtle hover:bg-surface-pill text-text-muted hover:text-text-primary transition-colors shrink-0"
                                                                    title="Dismiss alert"
                                                                    aria-label="Dismiss alert"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>

                                                            {/* Description */}
                                                            <p className="text-xs text-text-secondary leading-relaxed pl-11">
                                                                {flag.description}
                                                            </p>

                                                            {/* Bottom Bar: Baseline chip + Navigation action */}
                                                            <div className="flex items-center justify-between gap-2 pt-1 pl-11 flex-wrap">
                                                                {flag.expected_range ? (
                                                                    <span className="text-[10px] font-mono text-text-muted bg-surface-pill px-2 py-0.5 rounded-md border border-border-subtle/50">
                                                                        {flag.expected_range}
                                                                    </span>
                                                                ) : <div />}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleNavigate(flag)}
                                                                    className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-pill border border-border-subtle text-xs font-semibold text-text-primary hover:text-accent-text flex items-center gap-1 transition-all active:scale-95"
                                                                >
                                                                    <span>{flag.anomaly_type === 'settle_up_aging' ? 'View Settle Up' : 'View Transaction'}</span>
                                                                    <ExternalLink size={12} />
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
