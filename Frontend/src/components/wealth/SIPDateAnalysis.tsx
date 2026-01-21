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
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-48 bg-white/10 rounded"></div>
                    <div className="h-32 bg-white/10 rounded"></div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-white/10 rounded"></div>
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

    const alternativeDates = [1, 5, 10, 15, 20, 25];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl">
                        <Calendar size={24} className="text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1">Your SIP Date Performance</h3>
                        <p className="text-sm text-gray-400">
                            Analyzing your {analysis.holding_name} SIP based on actual purchase dates
                        </p>
                    </div>
                </div>
            </div>

            {/* User's Performance */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Target size={18} className="text-emerald-500" />
                    <h4 className="font-semibold">Your SIP Date: {analysis.user_sip_date}th of every month</h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">Total Invested</p>
                        <p className="text-lg font-bold">{formatCurrency(analysis.user_performance.total_invested)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">Current Value</p>
                        <p className="text-lg font-bold text-emerald-400">{formatCurrency(analysis.user_performance.current_value)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">Returns</p>
                        <p className={`text-lg font-bold ${analysis.user_performance.absolute_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(analysis.user_performance.absolute_return)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {analysis.user_performance.return_percentage.toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-500 mb-1">XIRR</p>
                        <p className="text-lg font-bold text-purple-400">
                            {analysis.user_performance.xirr ? `${analysis.user_performance.xirr.toFixed(2)}%` : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Alternative Dates Comparison */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-blue-500" />
                    <h4 className="font-semibold">What if you had chosen different dates?</h4>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
                    {alternativeDates.map(date => {
                        const perf = analysis.alternatives[date];
                        if (!perf) return <div key={date} className="aspect-square bg-white/5 rounded-xl opacity-20" />;

                        const isUserDate = date === analysis.user_sip_date;
                        const isBestDate = date === analysis.best_alternative.date;
                        const diff = perf.absolute_return - analysis.user_performance.absolute_return;

                        // Determine styling
                        let bgClass = "bg-white/5 border-transparent text-gray-500";
                        if (isBestDate) bgClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]";
                        else if (isUserDate) bgClass = "bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]";
                        else if (diff > 0) bgClass = "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10 text-gray-300";
                        else if (diff < 0) bgClass = "bg-red-500/5 border-red-500/10 hover:bg-red-500/10 text-gray-300";

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
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${diff > 0 ? 'bg-emerald-500' : diff < 0 ? 'bg-red-500/50' : 'bg-gray-700'}`} />
                                )}

                                {/* Hover Tooltip */}
                                <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 bg-[#1A1A1A] border border-white/20 p-3 rounded-xl shadow-2xl min-w-[140px] pointer-events-none">
                                    <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{date}th of Month</p>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-white flex justify-between">
                                            <span>XIRR</span>
                                            <span>{perf.xirr ? perf.xirr.toFixed(2) : '-'}%</span>
                                        </p>
                                        <p className="text-xs text-gray-400 flex justify-between">
                                            <span>Diff</span>
                                            <span className={diff >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                {diff >= 0 ? '+' : ''}{Math.round(diff).toLocaleString()}
                                            </span>
                                        </p>
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1A1A1A]" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* AI Insight */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl flex-shrink-0">
                        <Lightbulb size={24} className="text-purple-400" />
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2 text-purple-300">💡 Insight</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">{analysis.insight}</p>

                        {analysis.historical_pattern && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-gray-400 flex items-center gap-2">
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
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
                    <h4 className="font-semibold mb-3 text-emerald-300">📈 Optimization Opportunity</h4>
                    <p className="text-sm text-gray-300 mb-4">
                        Switching to {analysis.best_alternative.date}th date SIPs could improve your returns:
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-black/20 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">Potential Gain</p>
                            <p className="text-lg font-bold text-emerald-400">
                                {formatCurrency(analysis.best_alternative.improvement)}
                            </p>
                        </div>
                        <div className="bg-black/20 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">Better XIRR</p>
                            <p className="text-lg font-bold text-emerald-400">
                                {analysis.best_alternative.performance.xirr?.toFixed(2)}%
                            </p>
                        </div>
                        <div className="bg-black/20 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">Improvement</p>
                            <p className="text-lg font-bold text-emerald-400">
                                {((analysis.best_alternative.improvement / analysis.user_performance.total_invested) * 100).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
