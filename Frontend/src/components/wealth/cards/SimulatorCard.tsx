import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, DollarSign, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../../lib/api';

const SimulatorCard: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [scheme, setScheme] = useState('');
    const [amount, setAmount] = useState<number>(10000);
    const [date, setDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            setError('Select a fund and date first.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/wealth/simulate', {
                scheme_code: String(scheme),
                amount: Number(amount),
                date: date,
                end_date: endDate || undefined
            });
            setResult(res.data);
        } catch (err) {
            setError('Simulation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Historical Simulator</h3>
                <Sparkles size={14} className="text-indigo-400" />
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
                {/* Search */}
                <div className="space-y-1.5 relative">
                    <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Mutual Fund</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-4 py-3 focus-within:border-emerald-500/30 transition-colors">
                        <Search size={16} className="text-gray-500 mr-2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery.length >= 3 && setShowDropdown(true)}
                            placeholder="Search scheme..."
                            className="bg-transparent outline-none w-full text-sm text-white placeholder-gray-600"
                        />
                        {isSearching && <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin ml-2" />}
                    </div>

                    <AnimatePresence>
                        {showDropdown && searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[#121212] border border-white/10 rounded-xl overflow-hidden z-[60] shadow-2xl max-h-[200px] overflow-y-auto"
                            >
                                {searchResults.map((s) => (
                                    <button
                                        key={s.schemeCode}
                                        onClick={() => handleSelectScheme(s)}
                                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                    >
                                        <p className="text-sm font-medium text-gray-200 truncate">{s.schemeName}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{s.schemeCode}</p>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Amount</label>
                        <div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-3 py-3">
                            <span className="text-gray-500 text-sm mr-1">₹</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="bg-transparent outline-none w-full text-sm text-white"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Started on</label>
                        <div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-3 py-3">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-transparent outline-none w-full text-[13px] text-white [color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSimulate}
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]"
                >
                    {loading ? "Calculating..." : "Run Simulation"}
                </button>

                {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            </div>

            {/* Results Display */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/5 border border-white/5 rounded-2xl p-5 relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Value Today</p>
                                <h4 className={`text-2xl font-black mt-1 ${result.absolute_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ₹{result.current_value.toLocaleString()}
                                </h4>
                                <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${result.absolute_return >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                                    {result.absolute_return >= 0 ? '+' : ''}{result.return_percentage.toFixed(1)}%
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Invested</p>
                                <p className="text-sm font-bold text-gray-300">₹{result.invested_amount.toLocaleString()}</p>
                            </div>
                        </div>
                        {result.notes && (
                            <p className="mt-4 pt-4 border-t border-white/5 text-[11px] text-gray-500 italic leading-relaxed">
                                {result.notes}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default SimulatorCard;
