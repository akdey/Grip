import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    Search, Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle2,
    Info, BrainCircuit
} from 'lucide-react';

interface Holding {
    id: string;
    name: string;
    ticker_symbol: string | null;
}

const WealthIntelligence: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
    const [activeTab, setActiveTab] = useState<'timing' | 'simulator'>('timing');

    return (
        <div className="min-h-[500px]">
            <div className="flex space-x-6 border-b border-white/5 pb-4 mb-6 overflow-x-auto scrollbar-hide">
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
    // Filter for Mutual Funds only as SIP analysis is relevant for them
    const sipHoldings = holdings.filter(h => h.asset_type === 'MUTUAL_FUND');

    const [showInfo, setShowInfo] = useState(false);
    const [selectedHoldingId, setSelectedHoldingId] = useState<string>('');
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (sipHoldings.length > 0 && !selectedHoldingId) {
            setSelectedHoldingId(sipHoldings[0].id);
        }
    }, [sipHoldings]);

    // ... (fetch logic same)

    if (sipHoldings.length === 0) {
        // ...
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-200">SIP Timing Analysis</h3>
                        <button
                            onClick={() => setShowInfo(!showInfo)}
                            className={`transition-colors ${showInfo ? "text-emerald-400" : "text-gray-500 hover:text-white"}`}
                            title="How is this calculated?"
                        >
                            <Info size={16} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">Discover how your SIP date affects returns</p>
                </div>
                <select
                    value={selectedHoldingId}
                    onChange={(e) => setSelectedHoldingId(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-emerald-500/50"
                >
                    {sipHoldings.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
            </div>

            <AnimatePresence>
                {showInfo && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-200 overflow-hidden"
                    >
                        <p className="font-semibold text-indigo-400 mb-1 flex items-center gap-2">
                            <BrainCircuit size={16} /> How calculation works
                        </p>
                        <p className="leading-relaxed opacity-90">
                            We used a historical simulator to re-run your exact SIP transactions on <strong>every day of the month (1st–28th)</strong>.
                            The Top 3 performing dates are highlighted below, and the chart shows the return potential for all other days.
                        </p>
                        {analysis?.analysis_start && (
                            <p className="mt-3 text-xs text-indigo-300 font-mono border-t border-indigo-500/20 pt-2 flex items-center justify-between">
                                <span>Period: {new Date(analysis.analysis_start).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} — {new Date(analysis.analysis_end).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                <span className="opacity-50">Based on actual transaction history</span>
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="h-64 flex items-center justify-center animate-pulse">
                    <div className="text-emerald-500 text-sm">Crunching historical data...</div>
                </div>
            ) : error ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-red-500/10 rounded-xl bg-red-500/5">
                    <AlertCircle className="text-red-500 mb-2" size={32} />
                    <p className="text-red-400 font-medium mb-1">Analysis Unavailable</p>
                    <p className="text-xs text-gray-500 max-w-sm">{error}</p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (!searchQuery || searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        const handler = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await api.get('/wealth/search-mutual-funds', {
                    params: { q: searchQuery }
                });
                setSearchResults(res.data);
                setShowDropdown(true);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleSelectScheme = (s: any) => {
        setScheme(s.schemeCode);
        setSearchQuery(s.schemeName);
        setShowDropdown(false);
    };

    const handleSimulate = async () => {
        if (!scheme || !date || !amount) {
            setError('Please fill all fields and select a fund from search.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/wealth/simulate', {
                scheme_code: String(scheme),
                amount: Number(amount),
                date: date
            });
            setResult(res.data);
        } catch (err) {
            setError('Simulation failed. Check Scheme and Date.');
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
                <div className="space-y-2 relative">
                    <label className="text-xs text-gray-500 uppercase">Search Mutual Fund</label>
                    <div className={`bg-white/5 border rounded-lg flex items-center px-3 py-2 transition-colors ${showDropdown ? 'border-emerald-500/50' : 'border-white/10'}`}>
                        <Search size={16} className="text-gray-500 mr-2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setScheme(''); // Reset code when typing
                            }}
                            onFocus={() => searchQuery.length >= 3 && setShowDropdown(true)}
                            placeholder="e.g. HDFC Index Fund"
                            className="bg-transparent outline-none w-full text-sm placeholder-gray-600"
                        />
                        {isSearching && <div className="w-3 h-3 border-b-2 border-emerald-500 rounded-full animate-spin ml-2" />}
                    </div>

                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-[60] shadow-2xl max-h-[250px] overflow-y-auto custom-scrollbar">
                            {searchResults.map((s) => (
                                <button
                                    key={s.schemeCode}
                                    onClick={() => handleSelectScheme(s)}
                                    className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 transition-colors border-b border-white/5 last:border-0"
                                >
                                    <p className="text-sm font-medium text-gray-200 line-clamp-1">{s.schemeName}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Code: {s.schemeCode}</p>
                                </button>
                            ))}
                        </div>
                    )}
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
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
            >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Calculate Returns"}
            </button>

            {error && <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg flex items-center gap-2 border border-red-500/20"><AlertCircle size={16} /> {error}</div>}

            {result && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-gray-900 to-[#050505] border border-white/10 rounded-2xl p-6 mt-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full -mr-16 -mt-16" />

                    <div className="flex flex-col sm:flex-row justify-between gap-6 relative z-10">
                        <div>
                            <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Invested Value</p>
                            <h3 className="text-2xl font-bold text-gray-200 mt-1">₹{result.invested_amount.toLocaleString()}</h3>
                            <p className="text-xs text-gray-500 mt-1 bg-white/5 w-fit px-2 py-0.5 rounded border border-white/5">on {new Date(result.invested_date).toLocaleDateString()}</p>
                        </div>
                        <div className="sm:text-right">
                            <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Current Value</p>
                            <h3 className={`text-4xl font-bold mt-1 ${result.absolute_return >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                ₹{result.current_value.toLocaleString()}
                            </h3>
                            <div className={`inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg text-sm font-bold ${result.absolute_return >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                {result.absolute_return >= 0 ? <TrendingUp size={16} /> : <TrendingUp size={16} className="rotate-180" />}
                                {result.absolute_return >= 0 ? "+" : ""}{result.return_percentage.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                    {result.notes && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-xs text-gray-500 font-mono">{result.notes}</p>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

export default WealthIntelligence;
