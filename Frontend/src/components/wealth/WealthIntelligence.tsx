import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    AlertCircle, TrendingUp
} from 'lucide-react';

interface Holding {
    id: string;
    name: string;
    ticker_symbol: string | null;
    asset_type?: string;
}

const WealthIntelligence: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
    return (
        <div className="min-h-[400px]">
            <TimingAlpha holdings={holdings} />
        </div>
    );
};

const TimingAlpha: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
    const sipHoldings = holdings.filter(h => h.asset_type === 'MUTUAL_FUND');

    const [selectedHoldingId, setSelectedHoldingId] = useState<string>('');
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (sipHoldings.length > 0 && !selectedHoldingId) {
            setSelectedHoldingId(sipHoldings[0].id);
        }
    }, [sipHoldings]);

    useEffect(() => {
        if (!selectedHoldingId) return;

        const fetchAnalysis = async () => {
            setLoading(true);
            setError(null);
            setAnalysis(null);
            try {
                const res = await api.get(`/wealth/holdings/${selectedHoldingId}/sip-analysis`);
                setAnalysis(res.data);
            } catch (error: any) {
                console.error("Analysis failed", error);
                const msg = error.response?.data?.detail || "Could not analyze. Insufficient history.";
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [selectedHoldingId]);

    const chartData = analysis ? Object.entries(analysis.alternatives).map(([day, perf]: [string, any]) => ({
        day: parseInt(day),
        return: perf.return_percentage,
        isUserDate: parseInt(day) === analysis.user_sip_date,
        isBest: parseInt(day) === analysis.best_alternative.date,
    })).sort((a, b) => a.day - b.day) : [];

    if (sipHoldings.length === 0) {
        return (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-white/5 rounded-[2rem] bg-white/[0.02]">
                <p className="text-gray-500 text-sm font-medium">No Mutual Funds found for timing analysis.</p>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
            {/* Header / Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">SIP Optimization</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px] mt-1">Historically Best Investment Days</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5">
                    {sipHoldings.map(h => (
                        <button
                            key={h.id}
                            onClick={() => setSelectedHoldingId(h.id)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${selectedHoldingId === h.id
                                    ? "bg-white text-black shadow-xl"
                                    : "text-gray-500 hover:text-gray-300"
                                }`}
                        >
                            {h.name.split(' ').slice(0, 2).join(' ')}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-white/5 border-t-white rounded-full animate-spin" />
                </div>
            ) : error ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-12 border border-red-500/10 rounded-[3rem] bg-red-500/5">
                    <AlertCircle className="text-red-500/30 mb-4" size={40} />
                    <p className="text-red-400 text-sm font-bold tracking-tight">{error}</p>
                </div>
            ) : analysis ? (
                <div className="space-y-12">
                    {/* Insights Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50">Potential Alpha</p>
                            <h4 className="text-4xl font-black text-emerald-400 tracking-tighter">
                                +₹{Math.abs(analysis.best_alternative.improvement || 0).toLocaleString()}
                            </h4>
                            <p className="text-xs text-gray-500 font-medium">Extra returns unlocked with optimal timing</p>
                        </div>

                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Optimal Cycle</p>
                            <h4 className="text-4xl font-black text-white tracking-tighter">
                                {analysis.best_alternative.date}<span className="text-lg opacity-30">th</span>
                            </h4>
                            <p className="text-xs text-gray-500 font-medium">Historically the absolute best entry day</p>
                        </div>

                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Current Schedule</p>
                            <h4 className="text-4xl font-black text-white/30 tracking-tighter">
                                {analysis.user_sip_date}<span className="text-lg opacity-30">th</span>
                            </h4>
                            <p className="text-xs text-gray-500 font-medium">Your current investment performance</p>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem]">
                        <div className="h-[220px] w-full mb-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '16px', fontSize: '12px' }}
                                        formatter={(val: number) => [`${val.toFixed(2)}%`, 'Return']}
                                    />
                                    <Bar dataKey="return" radius={[8, 8, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.isUserDate ? '#3b82f6' : entry.isBest ? '#10b981' : '#1a1a1a'}
                                                fillOpacity={1}
                                            />
                                        ))}
                                    </Bar>
                                    <XAxis dataKey="day" hide />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-700 border-t border-white/5 pt-6">
                            <span>1st of month</span>
                            <div className="flex gap-6">
                                <span className="flex items-center gap-2 text-blue-500"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Current</span>
                                <span className="flex items-center gap-2 text-emerald-500"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Optimal</span>
                                <span className="flex items-center gap-2 text-gray-700"><div className="w-1.5 h-1.5 bg-gray-800 rounded-full" /> Historical Data Points</span>
                            </div>
                            <span>28th of month</span>
                        </div>
                    </div>

                    <p className="text-base text-gray-400 font-medium leading-[1.6] max-w-2xl px-2">
                        <TrendingUp className="inline-block mr-2 text-emerald-500" size={18} />
                        {analysis.insight.replace('SIPs', 'investments')}
                    </p>
                </div>
            ) : null}
        </motion.div>
    );
};

export default WealthIntelligence;
