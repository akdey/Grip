import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    Search, Calendar, DollarSign, ArrowRight, TrendingUp, AlertCircle, CheckCircle2
} from 'lucide-react';

interface Holding {
    id: string;
    name: string;
    ticker_symbol: string | null;
}

const WealthIntelligence: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
    const [activeTab, setActiveTab] = useState<'timing' | 'simulator'>('timing');

    return (
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 min-h-[500px]">
            <div className="flex space-x-6 border-b border-white/5 pb-4 mb-6">
                <button
                    onClick={() => setActiveTab('timing')}
                    className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'timing' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    Timing Alpha
                    {activeTab === 'timing' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-emerald-400" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('simulator')}
                    className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'simulator' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    What-If Simulator
                    {activeTab === 'simulator' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-emerald-400" />
                    )}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'timing' ? (
                    <TimingAlpha key="timing" holdings={holdings} />
                ) : (
                    <InvestmentSimulator key="simulator" />
                )}
            </AnimatePresence>
        </div>
    );
};

const TimingAlpha: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
    const [selectedHoldingId, setSelectedHoldingId] = useState<string>('');
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (holdings.length > 0 && !selectedHoldingId) {
            setSelectedHoldingId(holdings[0].id);
        }
    }, [holdings]);

    useEffect(() => {
        if (!selectedHoldingId) return;

        const fetchAnalysis = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/wealth/holdings/${selectedHoldingId}/sip-analysis`);
                setAnalysis(res.data);
            } catch (error) {
                console.error("Analysis failed", error);
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
        diff: perf.return_percentage - analysis.user_performance.return_percentage
    })).sort((a, b) => a.day - b.day) : [];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-200">SIP Timing Analysis</h3>
                    <p className="text-xs text-gray-500">Discover how your SIP date affects returns</p>
                </div>
                <select
                    value={selectedHoldingId}
                    onChange={(e) => setSelectedHoldingId(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-emerald-500/50"
                >
                    {holdings.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center animate-pulse">
                    <div className="text-emerald-500 text-sm">Crunching historical data...</div>
                </div>
            ) : analysis ? (
                <div className="space-y-6">
                    {/* Insight Card */}
                    <div className="bg-gradient-to-br from-emerald-900/10 to-teal-900/10 border border-emerald-500/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-full mt-1">
                                <TrendingUp size={18} className="text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="font-medium text-emerald-400">Analysis Result</h4>
                                <p className="text-sm text-gray-300 mt-1 leading-relaxed">{analysis.insight}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <p className="text-xs text-gray-500 uppercase">Your Date</p>
                            <p className="text-xl font-bold mt-1 text-white">{analysis.user_sip_date}<span className="text-xs font-normal text-gray-500 align-top">th</span></p>
                            <p className={`text-xs mt-1 ${analysis.user_performance.return_percentage >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {analysis.user_performance.return_percentage.toFixed(2)}% Return
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle2 size={40} /></div>
                            <p className="text-xs text-gray-500 uppercase">Best Date</p>
                            <p className="text-xl font-bold mt-1 text-emerald-400">{analysis.best_alternative.date}<span className="text-xs font-normal text-emerald-500/70 align-top">th</span></p>
                            <p className="text-xs text-emerald-500 mt-1">
                                +{(analysis.best_alternative.improvement || 0).toFixed(2)}% Extra
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <p className="text-xs text-gray-500 uppercase">Opportunity</p>
                            <p className="text-xl font-bold mt-1 text-white">
                                ₹{Math.abs(analysis.best_alternative.performance.current_value - analysis.user_performance.current_value).toFixed(0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Missed Value</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                                />
                                <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.isUserDate ? '#3b82f6' : entry.isBest ? '#10b981' : '#333'}
                                            fillOpacity={entry.isUserDate || entry.isBest ? 1 : 0.5}
                                        />
                                    ))}
                                </Bar>
                                <XAxis dataKey="day" stroke="#666" tick={{ fontSize: 10 }} tickFormatter={(d) => `${d}`} interval={2} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 text-[10px] text-gray-500 mt-2">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Your Day</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Best Day</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-700 rounded-full"></div> Others</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 text-gray-600">
                    Select a holding to analyze
                </div>
            )}
        </motion.div>
    );
};

const InvestmentSimulator: React.FC = () => {
    const [scheme, setScheme] = useState('');
    const [amount, setAmount] = useState<number>(10000);
    const [date, setDate] = useState<string>('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSimulate = async () => {
        if (!scheme || !date || !amount) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/wealth/simulate', {
                scheme_code: scheme,
                amount: Number(amount),
                date: date
            });
            setResult(res.data);
        } catch (err) {
            setError('Simulation failed. Check Scheme Code (MFAPI ID) and Date.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-200">History Simulator</h3>
                <p className="text-xs text-gray-500">"What if I had invested..." calculator</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase">Scheme Code (MFAPI)</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg flex items-center px-3 py-2">
                        <Search size={16} className="text-gray-500 mr-2" />
                        <input
                            type="text"
                            value={scheme}
                            onChange={(e) => setScheme(e.target.value)}
                            placeholder="e.g. 120503"
                            className="bg-transparent outline-none w-full text-sm placeholder-gray-600"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase">Investment Date</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg flex items-center px-3 py-2">
                        <Calendar size={16} className="text-gray-500 mr-2" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent outline-none w-full text-sm text-gray-300 [color-scheme:dark]"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase">Amount (₹)</label>
                    <div className="bg-white/5 border border-white/10 rounded-lg flex items-center px-3 py-2">
                        <DollarSign size={16} className="text-gray-500 mr-2" />
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="bg-transparent outline-none w-full text-sm"
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={handleSimulate}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Calculate Returns"}
            </button>

            {error && <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

            {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-xl p-6 mt-4">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-gray-500 text-sm">Invested Value</p>
                            <h3 className="text-2xl font-bold text-gray-300 mt-1">₹{result.invested_amount.toLocaleString()}</h3>
                            <p className="text-xs text-gray-500 mt-1">on {new Date(result.invested_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-500 text-sm">Current Value</p>
                            <h3 className={`text-3xl font-bold mt-1 ${result.absolute_return >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                ₹{result.current_value.toLocaleString()}
                            </h3>
                            <p className={`text-sm font-medium mt-1 ${result.absolute_return >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {result.absolute_return >= 0 ? "+" : ""}{result.return_percentage.toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default WealthIntelligence;
