import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Target, Lightbulb, BarChart3 } from 'lucide-react';
import { api } from '../../lib/api';

interface SIPDateAnalysisProps {
    holdingId: string;
}

interface SIPDatePerformance {
    sip_date: number;
    total_invested: number;
    current_value: number;
    absolute_return: number;
    return_percentage: number;
    xirr: number | null;
}

interface SIPAnalysisData {
    holding_id: string;
    holding_name: string;
    user_sip_date: number;
    user_performance: SIPDatePerformance;
    alternatives: { [key: number]: SIPDatePerformance };
    best_alternative: {
        date: number;
        performance: SIPDatePerformance;
        improvement: number;
    };
    insight: string;
    historical_pattern: string | null;
}

export const SIPDateAnalysis: React.FC<SIPDateAnalysisProps> = ({ holdingId }) => {
    const [analysis, setAnalysis] = useState<SIPAnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        fetchAnalysis();
    }, [holdingId]);

    const fetchAnalysis = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/wealth/holdings/${holdingId}/sip-analysis`);
            setAnalysis(response.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to analyze SIP date performance');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    if (loading) {
        return (
            <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-48 bg-surface-hover rounded"></div>
                    <div className="h-32 bg-surface-hover rounded"></div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-surface-hover rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                <p className="text-sm text-red-400">{error}</p>
            </div>
        );
    }

    if (!analysis) return null;

    const alternativeDates = Array.from({ length: 28 }, (_, i) => i + 1);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-accent-subtle rounded-xl text-primary">
                        <Calendar size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1 text-primary">Your SIP Date Performance</h3>
                        <p className="text-sm text-text-muted">
                            Analyzing your {analysis.holding_name} SIP based on actual purchase dates
                        </p>
                    </div>
                </div>
            </div>

            {/* User's Performance */}
            <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Target size={18} className="text-emerald-500" />
                    <h4 className="font-semibold text-primary">Your SIP Date: {analysis.user_sip_date}th of every month</h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-surface rounded-xl p-4 border border-border-subtle">
                        <p className="text-xs text-text-muted mb-1">Total Invested</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(analysis.user_performance.total_invested)}</p>
                    </div>
                    <div className="bg-surface rounded-xl p-4 border border-border-subtle">
                        <p className="text-xs text-text-muted mb-1">Current Value</p>
                        <p className="text-lg font-bold text-emerald-500">{formatCurrency(analysis.user_performance.current_value)}</p>
                    </div>
                    <div className="bg-surface rounded-xl p-4 border border-border-subtle">
                        <p className="text-xs text-text-muted mb-1">Returns</p>
                        <p className={`text-lg font-bold ${analysis.user_performance.absolute_return >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {formatCurrency(analysis.user_performance.absolute_return)}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                            {analysis.user_performance.return_percentage.toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-surface rounded-xl p-4 border border-border-subtle">
                        <p className="text-xs text-text-muted mb-1">XIRR</p>
                        <p className="text-lg font-bold text-primary">
                            {analysis.user_performance.xirr ? `${analysis.user_performance.xirr.toFixed(2)}%` : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Alternative Dates Comparison */}
            <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-text-muted" />
                    <h4 className="font-semibold text-primary">What if you had chosen different dates?</h4>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
                    {alternativeDates.map(date => {
                        const perf = analysis.alternatives[date];
                        if (!perf) return <div key={date} className="aspect-square bg-surface rounded-xl opacity-20" />;

                        const isUserDate = date === analysis.user_sip_date;
                        const isBestDate = date === analysis.best_alternative.date;
                        const diff = perf.absolute_return - analysis.user_performance.absolute_return;

                        // Determine styling
                        let bgClass = "bg-surface border-border-subtle text-text-muted";
                        if (isBestDate) bgClass = "bg-emerald-500/15 border-emerald-500/30 text-emerald-500";
                        else if (isUserDate) bgClass = "bg-accent-subtle border-accent-border text-accent-text shadow-sm";
                        else if (diff > 0) bgClass = "bg-surface-hover border-border-subtle text-primary";
                        else if (diff < 0) bgClass = "bg-surface border-border-subtle text-text-muted";

                        return (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: date * 0.01 }}
                                className={`aspect-square rounded-xl border p-1 sm:p-2 flex flex-col items-center justify-center transition-all cursor-default group relative ${bgClass}`}
                            >
                                <span className="text-xs sm:text-sm font-bold">{date}</span>

                                {isBestDate && <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mt-0.5">Best</span>}
                                {isUserDate && <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mt-0.5">You</span>}

                                {/* Difference Indicator (Dot) */}
                                {!isBestDate && !isUserDate && (
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${diff > 0 ? 'bg-emerald-500' : diff < 0 ? 'bg-red-500/50' : 'bg-neutral-400'}`} />
                                )}

                                {/* Hover Tooltip */}
                                <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 bg-surface border border-border-subtle p-3 rounded-xl shadow-2xl min-w-[140px] pointer-events-none">
                                    <p className="text-xs font-bold text-text-muted mb-1 uppercase tracking-wider">{date}th of Month</p>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-primary flex justify-between">
                                            <span>XIRR</span>
                                            <span>{perf.xirr ? perf.xirr.toFixed(2) : '-'}%</span>
                                        </p>
                                        <p className="text-xs text-text-muted flex justify-between">
                                            <span>Diff</span>
                                            <span className={diff >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                                                {diff >= 0 ? '+' : ''}{Math.round(diff).toLocaleString()}
                                            </span>
                                        </p>
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-surface" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* AI Insight */}
            <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-accent-subtle rounded-xl flex-shrink-0 text-primary">
                        <Lightbulb size={24} />
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2 text-primary">💡 Insight</h4>
                        <p className="text-sm text-text-muted leading-relaxed">{analysis.insight}</p>

                        {analysis.historical_pattern && (
                            <div className="mt-4 pt-4 border-t border-border-subtle">
                                <p className="text-xs text-text-muted flex items-center gap-2">
                                    <TrendingUp size={14} />
                                    {analysis.historical_pattern}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Best Alternative Highlight */}
            {analysis.user_sip_date !== analysis.best_alternative.date && analysis.best_alternative.improvement > 1000 && (
                <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-6">
                    <h4 className="font-semibold mb-3 text-primary">📈 Optimization Opportunity</h4>
                    <p className="text-sm text-text-muted mb-4">
                        Switching to {analysis.best_alternative.date}th date SIPs could improve your returns:
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-surface border border-border-subtle rounded-xl p-3">
                            <p className="text-xs text-text-muted mb-1">Potential Gain</p>
                            <p className="text-lg font-bold text-emerald-500">
                                {formatCurrency(analysis.best_alternative.improvement)}
                            </p>
                        </div>
                        <div className="bg-surface border border-border-subtle rounded-xl p-3">
                            <p className="text-xs text-text-muted mb-1">Better XIRR</p>
                            <p className="text-lg font-bold text-emerald-500">
                                {analysis.best_alternative.performance.xirr?.toFixed(2)}%
                            </p>
                        </div>
                        <div className="bg-surface border border-border-subtle rounded-xl p-3">
                            <p className="text-xs text-text-muted mb-1">Improvement</p>
                            <p className="text-lg font-bold text-emerald-500">
                                {((analysis.best_alternative.improvement / analysis.user_performance.total_invested) * 100).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
