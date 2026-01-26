import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip, XAxis } from 'recharts';
import { TrendingUp, CheckCircle2, Info } from 'lucide-react';

interface TimingAnalysisCardProps {
    analysis: any;
    showInfo: boolean;
    setShowInfo: (show: boolean) => void;
}

const TimingAnalysisCard: React.FC<TimingAnalysisCardProps> = ({ analysis, showInfo, setShowInfo }) => {
    if (!analysis) return null;

    const chartData = Object.entries(analysis.alternatives).map(([day, perf]: [string, any]) => ({
        day: parseInt(day),
        return: perf.return_percentage,
        isUserDate: parseInt(day) === analysis.user_sip_date,
        isBest: parseInt(day) === analysis.best_alternative.date,
    })).sort((a, b) => a.day - b.day);

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">SIP Intelligence</h3>
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className={`p-1 rounded-full transition-colors ${showInfo ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                        <Info size={14} />
                    </button>
                </div>
            </div>

            {/* Main Insight Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-4 overflow-hidden relative"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp size={60} className="text-emerald-400" />
                </div>

                <div className="relative z-10">
                    <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Optimization Result
                    </p>
                    <p className="text-sm text-gray-200 leading-relaxed font-medium">
                        {analysis.insight}
                    </p>
                </div>
            </motion.div>

            {/* Value Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Your Date</p>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-white">{analysis.user_sip_date}</span>
                        <span className="text-xs text-gray-500">th</span>
                    </div>
                    <p className={`text-[11px] mt-1 font-medium ${analysis.user_performance.return_percentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {analysis.user_performance.return_percentage.toFixed(1)}% Return
                    </p>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Best Potential</p>
                    <div className="flex items-baseline gap-1 mt-1 font-bold text-emerald-400">
                        <span className="text-2xl">{analysis.best_alternative.date}</span>
                        <span className="text-xs opacity-70">th</span>
                    </div>
                    <p className="text-[11px] text-emerald-500/80 mt-1 font-medium italic">
                        +₹{Math.abs(analysis.best_alternative.improvement || 0).toLocaleString()} Extra
                    </p>
                </div>
            </div>

            {/* Chart Card */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] text-gray-500 font-medium italic">Day-wise Return Potential</p>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1 text-[9px] text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> You
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Best
                        </div>
                    </div>
                </div>

                <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <Bar dataKey="return" radius={[2, 2, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.isUserDate ? '#3b82f6' : entry.isBest ? '#10b981' : '#1a1a1a'}
                                    />
                                ))}
                            </Bar>
                            <XAxis
                                dataKey="day"
                                hide
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={() => null} // Native clean look
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-gray-600 font-mono">
                    <span>1st</span>
                    <span>14th</span>
                    <span>28th</span>
                </div>
            </div>
        </section>
    );
};

export default TimingAnalysisCard;
