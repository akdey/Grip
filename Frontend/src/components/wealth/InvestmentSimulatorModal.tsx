import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, Calculator, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface InvestmentSimulatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SimulationResult {
    scheme_code: string;
    invested_date: string;
    invested_amount: number;
    start_nav: number;
    current_nav: number;
    units_allotted: number;
    current_value: number;
    absolute_return: number;
    return_percentage: number;
}

export const InvestmentSimulatorModal: React.FC<InvestmentSimulatorModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1); // 1: Input, 2: Loading, 3: Result
    const [schemes, setSchemes] = useState<{ schemeCode: string; schemeName: string }[]>([]);
    const [isSchemesLoading, setIsSchemesLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const [formData, setFormData] = useState({
        schemeName: '',
        schemeCode: '',
        date: '',
        amount: '',
        investmentType: 'LUMPSUM', // LUMPSUM | SIP
        endDate: '' // Optional
    });

    const [result, setResult] = useState<SimulationResult | null>(null);

    // Fetch schemes for search
    useEffect(() => {
        if (isOpen && schemes.length === 0) {
            setIsSchemesLoading(true);
            fetch('https://api.mfapi.in/mf')
                .then(res => res.json())
                .then(data => setSchemes(data))
                .catch(err => console.error(err))
                .finally(() => setIsSchemesLoading(false));
        }
    }, [isOpen]);

    const handleSimulate = async () => {
        if (!formData.schemeCode || !formData.date || !formData.amount) return;

        setStep(2); // Loading
        try {
            const res = await api.post('/wealth/simulate', {
                scheme_code: String(formData.schemeCode),
                amount: parseFloat(formData.amount) || 0,
                date: formData.date,
                investment_type: formData.investmentType,
                end_date: formData.endDate || null
            });
            setResult(res.data);
            setStep(3);
        } catch (error) {
            console.error(error);
            setStep(1);
            alert("Simulation failed. Check date ranges (End date must be after Start date).");
        }
    };

    const reset = () => {
        setResult(null);
        setStep(1);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-[#0F0F0F] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
                        <div>
                            <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-2">
                                <Calculator className="text-indigo-400" size={24} />
                                TIME MACHINE
                            </h2>
                            <p className="text-[10px] text-indigo-300/60 uppercase tracking-[3px] font-bold">Mutual Fund Simulator</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 overflow-y-auto">

                        {step === 1 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                {/* Search Fund */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Mutual Fund</label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            value={searchTerm}
                                            onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                                            onFocus={() => setShowDropdown(true)}
                                            placeholder="Search e.g. Parag Parikh Flexi Cap..."
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-600"
                                        />
                                        {isSchemesLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" />}

                                        {showDropdown && searchTerm.length > 1 && (
                                            <div className="absolute z-50 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-2xl max-h-60 overflow-y-auto shadow-2xl custom-scrollbar">
                                                {schemes.filter(s => s.schemeName.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50).map(s => (
                                                    <button
                                                        key={s.schemeCode}
                                                        onClick={() => {
                                                            setFormData({ ...formData, schemeCode: s.schemeCode, schemeName: s.schemeName });
                                                            setSearchTerm(s.schemeName);
                                                            setShowDropdown(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 text-xs transition-colors"
                                                    >
                                                        <p className="font-bold text-gray-200">{s.schemeName}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{s.schemeCode}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {formData.schemeCode && <p className="text-[10px] text-indigo-400 mt-2 font-mono">Picked: {formData.schemeCode}</p>}
                                    </div>
                                </div>

                                {/* Type Toggle */}
                                <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                                    {['LUMPSUM', 'SIP'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setFormData({ ...formData, investmentType: t })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.investmentType === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>


                                {/* Amount */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {formData.investmentType === 'SIP' ? 'Monthly Amount (₹)' : 'Investment Amount (₹)'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                        <input
                                            type="number"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="5000"
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date (Opt)</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            min={formData.date}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                            placeholder="Today"
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                                        />
                                        <p className="text-[9px] text-gray-600 ml-1">Leave empty for today</p>
                                    </div>
                                </div>


                                <button
                                    onClick={handleSimulate}
                                    disabled={!formData.schemeCode || !formData.date || !formData.amount}
                                    className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                                >
                                    Activate Simulation
                                    <ArrowRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                <p className="text-indigo-400 font-mono text-xs animate-pulse">Running {formData.investmentType} Analysis...</p>
                            </div>
                        )}

                        {step === 3 && result && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">

                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Snapshot</p>
                                    <h3 className="text-sm font-medium text-gray-300 max-w-[90%] mx-auto leading-relaxed">
                                        {formData.investmentType} of <span className="text-white font-bold">₹{parseFloat(formData.amount).toLocaleString()}</span> in <br />
                                        <span className="text-indigo-400">{formData.schemeName.substring(0, 35)}...</span><br />
                                        <span className="text-gray-500 text-xs">from {new Date(result.invested_date).toLocaleDateString()} to {result.end_date ? new Date(result.end_date).toLocaleDateString() : 'Today'}</span>
                                    </h3>
                                </div>

                                <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-full h-1 ${result.return_percentage >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />

                                    <div className="relative z-10">
                                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Total Value</p>
                                        <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
                                            ₹{Math.round(result.current_value).toLocaleString()}
                                        </h1>

                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${result.return_percentage >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {result.return_percentage >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                            <span className="font-bold font-mono text-sm">
                                                {result.return_percentage >= 0 ? '+' : ''}{result.return_percentage.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Background decoration */}
                                    <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 ${result.return_percentage >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                </div>

                                <div className="bg-white/[0.03] rounded-2xl p-4 grid grid-cols-2 gap-4 text-left">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Invested</p>
                                        <p className="font-mono text-sm text-gray-200">₹{Math.round(result.invested_amount).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Current NAV</p>
                                        <p className="font-mono text-sm text-gray-200">₹{result.current_nav.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Units</p>
                                        <p className="font-mono text-sm text-gray-200">{result.units_allotted.toFixed(3)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Gain/Loss</p>
                                        <p className={`font-mono text-sm ${result.absolute_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {result.absolute_return >= 0 ? '+' : ''}₹{Math.round(result.absolute_return).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={reset}
                                    className="w-full py-4 text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    Run Another Simulation
                                </button>
                            </motion.div>
                        )}

                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
