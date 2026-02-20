import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Save, Search } from 'lucide-react';
import { api } from '../../lib/api';

interface AddHoldingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddHoldingModal: React.FC<AddHoldingModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [showExistingFields, setShowExistingFields] = useState(false);
    const [schemes, setSchemes] = useState<{ schemeCode: string; schemeName: string }[]>([]);
    const [isSchemesLoading, setIsSchemesLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        asset_type: 'MUTUAL_FUND',
        ticker_symbol: '',
        api_source: 'MFAPI',
        // For existing holdings
        current_units: '',
        total_invested: '',
        investment_start_date: '',
        investment_type: 'SIP',
        // For FD/RD
        interest_rate: '',
        maturity_date: ''
    });

    useEffect(() => {
        if (formData.api_source === 'MFAPI' && schemes.length === 0) {
            setIsSchemesLoading(true);
            fetch('https://api.mfapi.in/mf')
                .then(res => res.json())
                .then(data => setSchemes(data))
                .catch(err => console.error("Failed to fetch MF schemes", err))
                .finally(() => setIsSchemesLoading(false));
        }
    }, [formData.api_source]);

    // Update search term if ticker symbol exists (e.g. editing)
    useEffect(() => {
        if (formData.ticker_symbol && !searchTerm && formData.api_source === 'MFAPI') {
            // Try to find name if we have it, else keep blank or use ticker
            // Actually, better to just let user search.
        }
    }, [formData.ticker_symbol]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Prepare data, converting empty strings to null for optional fields
            const submitData = {
                ...formData,
                current_units: formData.current_units ? parseFloat(formData.current_units) : null,
                total_invested: formData.total_invested ? parseFloat(formData.total_invested) : null,
                investment_start_date: formData.investment_start_date || null,
                investment_type: formData.investment_type || null,
                interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
                maturity_date: formData.maturity_date || null,
            };

            await api.post('/wealth/holdings', submitData);
            onSuccess();
            onClose();
            setFormData({
                name: '',
                asset_type: 'MUTUAL_FUND',
                ticker_symbol: '',
                api_source: 'MFAPI',
                current_units: '',
                total_invested: '',
                investment_start_date: '',
                investment_type: 'SIP',
                interest_rate: '',
                maturity_date: ''
            });
        } catch (error) {
            console.error("Failed to create holding", error);
            alert("Error creating holding");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex justify-center pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
                />
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[90vh] bg-[#050505] border-t border-white/10 rounded-t-[3rem] flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto"
                >
                    {/* Fixed Header */}
                    <div className="p-6 sm:p-10 border-b border-white/10 flex justify-between items-center bg-gradient-to-b from-white/[0.05] to-transparent shrink-0">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Add New Asset</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[4px] mt-1">Portfolio Expansion Engine</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all shadow-xl group"
                            >
                                <ChevronDown size={28} className="group-hover:translate-y-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Form Content */}
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <div className="p-6 sm:p-10 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Asset Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Axis Bluechip Fund"
                                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                    <select
                                        value={formData.asset_type}
                                        onChange={e => setFormData({ ...formData, asset_type: e.target.value })}
                                        className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
                                    >
                                        <option value="MUTUAL_FUND">Mutual Fund</option>
                                        <option value="STOCK">Stock</option>
                                        <option value="SIP">SIP</option>
                                        <option value="FD">FD</option>
                                        <option value="RD">RD</option>
                                        <option value="PF">Provident Fund</option>
                                        <option value="GOLD">Gold</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
                                    <select
                                        value={formData.api_source}
                                        onChange={e => setFormData({ ...formData, api_source: e.target.value })}
                                        className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
                                    >
                                        <option value="MFAPI">MF API (India)</option>
                                        <option value="YFINANCE">Yahoo Finance</option>
                                        <option value="MANUAL">Manual</option>
                                    </select>
                                </div>
                            </div>

                            {formData.api_source !== 'MANUAL' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        {formData.api_source === 'MFAPI' ? 'Search Mutual Fund Scheme' : 'Ticker / Scheme Code'}
                                    </label>

                                    {formData.api_source === 'MFAPI' ? (
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                                                    onFocus={() => setShowDropdown(true)}
                                                    placeholder="Search e.g. Axis Bluechip..."
                                                    className="w-full bg-[#151515] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                                />
                                                {isSchemesLoading && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                                )}
                                            </div>

                                            {/* Dropdown */}
                                            {showDropdown && searchTerm.length > 1 && (
                                                <div className="absolute z-50 w-full mt-1 bg-[#151515] border border-white/10 rounded-xl max-h-60 overflow-y-auto shadow-2xl custom-scrollbar">
                                                    {schemes
                                                        .filter(s => s.schemeName.toLowerCase().includes(searchTerm.toLowerCase()))
                                                        .slice(0, 50)
                                                        .map(s => (
                                                            <button
                                                                key={s.schemeCode}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData({
                                                                        ...formData,
                                                                        ticker_symbol: s.schemeCode,
                                                                        name: s.schemeName // Auto-fill name
                                                                    });
                                                                    setSearchTerm(s.schemeName);
                                                                    setShowDropdown(false);
                                                                }}
                                                                className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 text-xs transition-colors group"
                                                            >
                                                                <p className="font-bold text-gray-200 group-hover:text-emerald-400">{s.schemeName}</p>
                                                                <p className="text-[10px] text-gray-500 mt-0.5">Code: {s.schemeCode}</p>
                                                            </button>
                                                        ))}
                                                    {schemes.filter(s => s.schemeName.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                                        <div className="p-4 text-center text-xs text-gray-500">No schemes found</div>
                                                    )}
                                                </div>
                                            )}
                                            {formData.ticker_symbol && (
                                                <p className="text-[10px] text-emerald-500 mt-1 font-mono">
                                                    ✓ Code: {formData.ticker_symbol}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                required
                                                value={formData.ticker_symbol}
                                                onChange={e => setFormData({ ...formData, ticker_symbol: e.target.value })}
                                                placeholder="e.g. RELIANCE.NS"
                                                className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                                            />
                                            <p className="text-[10px] text-gray-600 mt-1">
                                                Use Ticker Symbol (e.g., RELIANCE.NS for NSE)
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Manual Entry Fields */}
                            {formData.api_source === 'MANUAL' && (
                                <div className="space-y-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                                    <p className="text-xs text-blue-400 font-medium">📝 Manual Entry</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Current Units
                                            </label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                required
                                                value={formData.current_units}
                                                onChange={e => setFormData({ ...formData, current_units: e.target.value })}
                                                placeholder="e.g. 2500"
                                                className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Total Invested (₹)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.total_invested}
                                                onChange={e => setFormData({ ...formData, total_invested: e.target.value })}
                                                placeholder="e.g. 100000"
                                                className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FD/RD Specific Fields */}
                            {(formData.asset_type === 'FD' || formData.asset_type === 'RD') && (
                                <div className="space-y-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
                                    <p className="text-xs text-purple-400 font-medium">
                                        💰 {formData.asset_type === 'FD' ? 'Fixed Deposit' : 'Recurring Deposit'} Details
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Principal Amount (₹)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.total_invested}
                                                onChange={e => setFormData({ ...formData, total_invested: e.target.value })}
                                                placeholder={formData.asset_type === 'FD' ? "e.g. 100000" : "e.g. 5000 (monthly)"}
                                                className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                            <p className="text-[10px] text-gray-600 mt-1">
                                                {formData.asset_type === 'FD' ? 'One-time deposit' : 'Monthly deposit amount'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Interest Rate (% p.a.)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={formData.interest_rate}
                                                onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                                                placeholder="e.g. 7.5"
                                                className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.investment_start_date}
                                                onChange={e => setFormData({ ...formData, investment_start_date: e.target.value })}
                                                className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Maturity Date
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.maturity_date}
                                                onChange={e => setFormData({ ...formData, maturity_date: e.target.value })}
                                                className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-gray-600">
                                        💡 We'll calculate the current value based on interest accrued till today
                                    </p>
                                </div>
                            )}

                            {/* Existing Holdings Section - Only for Mutual Funds/Stocks */}
                            {formData.asset_type !== 'FD' && formData.asset_type !== 'RD' && (
                                <div className="border-t border-white/5 pt-4 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowExistingFields(!showExistingFields)}
                                        className="w-full text-left text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-between p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40"
                                    >
                                        <span>📊 Already own this asset? Add existing holdings</span>
                                        <span className="text-lg font-bold">{showExistingFields ? '−' : '+'}</span>
                                    </button>

                                    {showExistingFields && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-4 space-y-4 p-4 bg-white/[0.02] rounded-xl border border-white/5"
                                        >
                                            <p className="text-xs text-gray-500">
                                                Enter your current holdings to calculate accurate returns (XIRR)
                                            </p>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                        Current Units
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        value={formData.current_units}
                                                        onChange={e => setFormData({ ...formData, current_units: e.target.value })}
                                                        placeholder="e.g. 2500"
                                                        className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                        Total Invested (₹)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.total_invested}
                                                        onChange={e => setFormData({ ...formData, total_invested: e.target.value })}
                                                        placeholder="e.g. 100000"
                                                        className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    When did you start investing?
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.investment_start_date}
                                                    onChange={e => setFormData({ ...formData, investment_start_date: e.target.value })}
                                                    className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                                                />
                                                <p className="text-[10px] text-gray-600 mt-1">
                                                    Helps calculate accurate XIRR
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    Investment Type
                                                </label>
                                                <select
                                                    value={formData.investment_type}
                                                    onChange={e => setFormData({ ...formData, investment_type: e.target.value })}
                                                    className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
                                                >
                                                    <option value="SIP">SIP (Monthly)</option>
                                                    <option value="LUMPSUM">Lump Sum</option>
                                                </select>
                                                <p className="text-[10px] text-gray-600 mt-1">
                                                    SIP: Regular monthly investments | Lump Sum: One-time investment
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fixed Footer with Submit Button */}
                    <div className="p-8 sm:p-12 border-t border-white/5 bg-white/[0.01] flex-shrink-0">
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-emerald-900/20 disabled:opacity-50"
                        >
                            {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <><Save size={20} /> Deploy Asset to Portfolio</>}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
