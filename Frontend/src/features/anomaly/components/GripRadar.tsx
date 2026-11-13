import React, { memo, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
    Check
} from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
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
                colorClass: 'badge-warning'
            };
        case 'near_duplicate':
            return {
                label: 'Duplicate Charge',
                icon: Copy,
                colorClass: 'badge-danger'
            };
        case 'category_burn':
            return {
                label: 'Category Velocity',
                icon: Flame,
                colorClass: 'badge-warning'
            };
        case 'recurring_drift':
            return {
                label: 'Surety Drift',
                icon: RefreshCw,
                colorClass: 'badge-neutral'
            };
        case 'new_merchant_high':
            return {
                label: 'First-time Merchant',
                icon: Store,
                colorClass: 'badge-neutral'
            };
        case 'settle_up_aging':
            return {
                label: 'Aging Debt',
                icon: Handshake,
                colorClass: 'badge-danger'
            };
        default:
            return {
                label: 'Anomaly',
                icon: AlertTriangle,
                colorClass: 'badge-warning'
            };
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
    const dragControls = useDragControls();

    // Body scroll lock & Escape key dismiss when drawer is open
    useEffect(() => {
        if (!isDrawerOpen) return;

        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                haptics.selection();
                setIsDrawerOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
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

    const flags = useMemo(() => data?.flags || [], [data?.flags]);
    const hasFlags = flags.length > 0;
    const hasHighSeverity = (data?.high_severity_count || 0) > 0;
    const totalFlaggedVolume = useMemo(() => {
        return flags.reduce((acc, f) => acc + (f.amount ? Math.abs(Number(f.amount)) : 0), 0);
    }, [flags]);

    const topFlag = flags[0];
    const topSignals = useMemo(() => flags.slice(0, 2), [flags]);

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
                                <span className="text-[10px] font-black uppercase tracking-[3px] text-text-muted">
                                    Grip Radar
                                </span>
                                <span className="badge-success text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 border">
                                    <Check size={12} /> All Clear
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
                    className={`bg-surface-subtle border p-6 rounded-[2.5rem] relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all shadow-none hover:shadow-md ${hasHighSeverity
                            ? 'border-status-danger-border/40 hover:border-status-danger-border/70'
                            : 'border-status-warning-border/40 hover:border-status-warning-border/70'
                        }`}
                >
                    {/* Watermark Icon */}
                    <div className={`absolute right-6 top-6 transition-colors pointer-events-none ${hasHighSeverity
                            ? 'text-status-danger/10 group-hover:text-status-danger/20'
                            : 'text-status-warning/10 group-hover:text-status-warning/20'
                        }`}>
                        <ShieldAlert size={52} />
                    </div>

                    <div className="relative z-10 flex flex-col gap-3.5">
                        {/* Header Eyebrow & Status Badge */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-inner ${hasHighSeverity ? 'badge-danger' : 'badge-warning'
                                    }`}>
                                    <ShieldAlert size={16} />
                                </div>
                                <h2 className="text-[10px] font-black uppercase tracking-[3px] text-text-muted">
                                    Grip Radar
                                </h2>
                            </div>

                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 border ${hasHighSeverity ? 'badge-danger' : 'badge-warning'
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
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">
                                Flagged Outflow • Requires Review
                            </p>
                            {topFlag?.description && (
                                <p className="text-xs font-medium leading-relaxed mt-2.5 max-w-[340px] text-text-secondary line-clamp-2">
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
                                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-text-muted flex items-center gap-1.5 uppercase tracking-wider"
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
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-surface-pill border border-border-subtle text-text-muted">
                                        +{flags.length - 2} more
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Action Footer */}
                        <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-text-muted group-hover:text-accent-text transition-colors">
                            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
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

            {/* Apple-grade Review Bottom Sheet Drawer rendered in Portal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isDrawerOpen && (
                        <div className="fixed inset-0 z-[2000] flex items-end justify-center pointer-events-none">
                            {/* Backdrop with progressive blur & dimming */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                onClick={() => {
                                    haptics.selection();
                                    setIsDrawerOpen(false);
                                }}
                                className="absolute inset-0 bg-overlay backdrop-blur-md pointer-events-auto"
                            />

                            {/* Bottom Sheet Surface: Centered by flexbox, naturally sized, sits fully above mobile dock */}
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.85 }}
                                drag="y"
                                dragControls={dragControls}
                                dragListener={false}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0.08, bottom: 0.75 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 450) {
                                        haptics.impact('light');
                                        setIsDrawerOpen(false);
                                    } else {
                                        haptics.selection();
                                    }
                                }}
                                className="relative w-full max-w-lg max-h-[85vh] h-auto glass-drawer rounded-t-[2.5rem] flex flex-col shadow-2xl overflow-hidden pointer-events-auto z-[2000] touch-manipulation"
                            >
                                {/* Grabber Handle Area: Dedicated drag trigger */}
                                <div
                                    className="flex justify-center pt-3.5 pb-2 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
                                    onPointerDown={(e) => dragControls.start(e)}
                                    onClick={() => {
                                        haptics.selection();
                                        setIsDrawerOpen(false);
                                    }}
                                >
                                    <div className="w-10 h-1.5 bg-border-strong rounded-full transition-colors active:scale-95" />
                                </div>

                                {/* Clean, Compact Header Bar: Dedicated drag trigger (except buttons) */}
                                <div
                                    className="px-5 sm:px-6 py-3 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-md cursor-grab active:cursor-grabbing select-none touch-none"
                                    onPointerDown={(e) => {
                                        if ((e.target as HTMLElement).closest('button')) return;
                                        dragControls.start(e);
                                    }}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                            hasFlags ? (hasHighSeverity ? 'badge-danger' : 'badge-warning') : 'badge-success'
                                        }`}>
                                            {hasFlags ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-bold text-text-primary tracking-tight truncate heading-apple">
                                                    Grip Radar
                                                </h3>
                                                {hasFlags && (
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                                        hasHighSeverity ? 'badge-danger' : 'badge-warning'
                                                    }`}>
                                                        {flags.length} {flags.length === 1 ? 'Signal' : 'Signals'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-muted truncate mt-0.5">
                                                {hasFlags ? `Total flagged: ${formatCurrency(totalFlaggedVolume)}` : 'All signals clear'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleScan()}
                                            disabled={isScanning}
                                            className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-text-primary transition-all active:scale-95"
                                            title="Scan transactions now"
                                            aria-label="Scan transactions now"
                                        >
                                            <RotateCw size={16} className={isScanning ? 'animate-spin text-accent-text' : ''} />
                                        </button>

                                        {flags.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={handleDismissAll}
                                                disabled={dismissAllMutation.isPending}
                                                className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-xs font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
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
                                            <ChevronDown size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Content Body: Naturally scrolls without triggering drawer drag */}
                                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5 custom-scrollbar touch-pan-y overscroll-contain pb-[max(2rem,env(safe-area-inset-bottom,1.5rem))]">
                                    {!hasFlags ? (
                                        // Empty state inside drawer
                                        <div className="py-12 px-4 text-center space-y-3">
                                            <div className="w-12 h-12 rounded-2xl badge-success flex items-center justify-center mx-auto shadow-sm border">
                                                <ShieldCheck size={24} />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-text-primary">
                                                    All Clear • Zero Active Anomalies
                                                </h4>
                                                <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                                                    All transactions and committed subscriptions align with historical baselines.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <AnimatePresence mode="popLayout">
                                                {flags.map((flag) => {
                                                    const meta = getAnomalyMeta(flag.anomaly_type);
                                                    const Icon = meta.icon;
                                                    const isHigh = flag.severity === 'high';

                                                    return (
                                                        <motion.div
                                                            key={flag.id}
                                                            layout
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.96 }}
                                                            transition={{ duration: 0.2 }}
                                                            className={`p-4 rounded-2xl bg-surface border transition-all space-y-3 shadow-xs ${isHigh
                                                                    ? 'border-status-danger-border/40 hover:border-status-danger-border/70'
                                                                    : 'border-border-subtle hover:border-border-default'
                                                                }`}
                                                        >
                                                            {/* Row 1: Badges & Amount */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border ${meta.colorClass}`}>
                                                                        <Icon size={16} />
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${isHigh ? 'badge-danger' : 'badge-warning'
                                                                        }`}>
                                                                        {isHigh ? 'High Priority' : 'Review'}
                                                                    </span>
                                                                    <span className="badge-neutral text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border">
                                                                        {meta.label}
                                                                    </span>
                                                                </div>

                                                                {flag.amount != null && (
                                                                    <span className="text-base font-black text-text-primary tabular-nums shrink-0">
                                                                        {formatCurrency(Math.abs(Number(flag.amount)))}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Row 2: Full Title */}
                                                            <div>
                                                                <h4 className="text-sm sm:text-base font-bold text-text-primary leading-snug break-words">
                                                                    {flag.title}
                                                                </h4>
                                                            </div>

                                                            {/* Row 3: Narrative Explanation & Baseline Tag */}
                                                            <div className="p-3 rounded-xl bg-surface-subtle border border-border-subtle/70 space-y-2">
                                                                <p className="text-xs text-text-secondary leading-relaxed break-words">
                                                                    {flag.description}
                                                                </p>

                                                                {flag.expected_range && (
                                                                    <div className="flex items-center gap-2 pt-1.5 border-t border-border-subtle/50 text-xs flex-wrap">
                                                                        <span className="text-text-muted font-medium">Expected:</span>
                                                                        <span className="font-mono text-text-primary bg-surface-pill px-2 py-0.5 rounded border border-border-subtle/50 font-semibold">
                                                                            {flag.expected_range}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Row 4: Dedicated Full-width Actions */}
                                                            <div className="flex items-center justify-between gap-2 pt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleNavigate(flag)}
                                                                    className="flex-1 py-2 px-3 rounded-xl bg-surface-pill hover:bg-surface-hover border border-border-subtle text-xs font-semibold text-text-primary hover:text-accent-text flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                                                                >
                                                                    <span>{flag.anomaly_type === 'settle_up_aging' ? 'Inspect Settle Up' : 'Inspect Transaction'}</span>
                                                                    <ExternalLink size={12} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDismiss(e, flag.id)}
                                                                    className="py-2 px-3.5 rounded-xl bg-surface-pill hover:bg-surface-hover border border-border-subtle hover:border-status-danger-border text-xs font-semibold text-text-muted hover:text-status-danger flex items-center justify-center gap-1.5 transition-all active:scale-95"
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
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
});
