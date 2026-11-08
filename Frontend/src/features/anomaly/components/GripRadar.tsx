import React, { memo, useState } from 'react';
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

export const GripRadar: React.FC<GripRadarProps> = memo(({ formatCurrency }) => {
    const navigate = useNavigate();
    const { data, isLoading } = useAnomalyFlags();
    const scanMutation = useScanAnomalies();
    const dismissMutation = useDismissAnomaly();
    const dismissAllMutation = useDismissAllAnomalies();

    const [isScanning, setIsScanning] = useState(false);

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
    const hasHighSeverity = data?.high_severity_count ? data.high_severity_count > 0 : false;

    if (isLoading) {
        return (
            <div className="bg-surface-subtle border border-border-subtle p-5 rounded-[2.5rem] relative overflow-hidden animate-pulse h-[110px]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-2xl bg-surface-pill" />
                    <div className="h-3.5 w-36 bg-surface-pill rounded" />
                </div>
            </div>
        );
    }

    if (!hasFlags) {
        return (
            <div className="bg-surface-subtle border border-border-subtle hover:border-border-default/50 p-4 sm:p-5 rounded-[2.5rem] transition-all flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <ShieldCheck size={16} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-[2px] text-text-muted">
                                Grip Radar
                            </span>
                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Check size={8} /> All Clear
                            </span>
                        </div>
                        <p className="text-xs text-text-muted/80 truncate mt-0.5">
                            No active spending anomalies or duplicate charges detected.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleScan}
                    disabled={isScanning}
                    className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-primary font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
                    title="Scan transactions now"
                >
                    <RotateCw size={12} className={isScanning ? 'animate-spin text-accent' : ''} />
                    <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Scan'}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="bg-surface-subtle border border-border-subtle hover:border-border-default/60 p-5 sm:p-6 rounded-[2.5rem] relative overflow-hidden transition-all shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-2xl flex items-center justify-center border shadow-inner shrink-0 ${
                        hasHighSeverity
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    }`}>
                        <ShieldAlert size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-[9px] font-black uppercase tracking-[2.5px] text-text-muted">
                                Grip Radar
                            </h2>
                            <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                hasHighSeverity
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse'
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {flags.length} {flags.length === 1 ? 'Anomaly' : 'Anomalies'} Detected
                            </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                            Automated signals requiring your review
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleScan}
                        disabled={isScanning}
                        className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-primary transition-all active:scale-95"
                        title="Scan transactions now"
                    >
                        <RotateCw size={13} className={isScanning ? 'animate-spin text-accent' : ''} />
                    </button>
                    {flags.length > 1 && (
                        <button
                            type="button"
                            onClick={handleDismissAll}
                            disabled={dismissAllMutation.isPending}
                            className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-[10px] font-bold text-text-muted hover:text-primary transition-all active:scale-95"
                        >
                            Dismiss All
                        </button>
                    )}
                </div>
            </div>

            {/* List of active anomalies */}
            <div className="space-y-2.5">
                <AnimatePresence>
                    {flags.map((flag) => {
                        const Icon = getAnomalyIcon(flag.anomaly_type);
                        const isHigh = flag.severity === 'high';

                        return (
                            <motion.div
                                key={flag.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => handleNavigate(flag)}
                                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                                    isHigh
                                        ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 hover:border-rose-500/35'
                                        : 'bg-surface hover:bg-surface-hover border-border-subtle hover:border-border-default/60'
                                }`}
                            >
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border mt-0.5 ${
                                        isHigh
                                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                            : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                    }`}>
                                        <Icon size={14} />
                                    </div>

                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-xs font-black text-primary group-hover:text-accent transition-colors">
                                                {flag.title}
                                            </span>
                                            {flag.amount != null && (
                                                <span className="text-xs font-black text-primary">
                                                    • {formatCurrency(Math.abs(Number(flag.amount)))}
                                                </span>
                                            )}
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                isHigh
                                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            }`}>
                                                {flag.severity}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-text-muted leading-relaxed">
                                            {flag.description}
                                        </p>

                                        {flag.expected_range && (
                                            <span className="inline-block text-[9px] font-mono text-text-muted/80 bg-surface/80 px-2 py-0.5 rounded border border-border-subtle/50">
                                                {flag.expected_range}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <span className="text-[10px] font-bold text-accent-text group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                        <span>View</span>
                                        <ExternalLink size={10} />
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDismiss(e, flag.id)}
                                        className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-rose-400 transition-colors"
                                        title="Dismiss anomaly alert"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
});

