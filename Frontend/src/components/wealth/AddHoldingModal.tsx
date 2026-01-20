import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { api } from '../../lib/api';

interface AddHoldingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddHoldingModal: React.FC<AddHoldingModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [showExistingFields, setShowExistingFields] = useState(false);
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
                >
                    {/* Fixed Header */}
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0F0F0F] flex-shrink-0">
                        <h3 className="font-semibold text-lg">Add New Asset</h3>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Scrollable Form Content */}
                    <div className="overflow-y-auto flex-1">
                        <div className="p-6 pb-18 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Asset Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Axis Bluechip Fund"
                                    className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
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
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Ticker / Scheme Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.ticker_symbol}
                                        onChange={e => setFormData({ ...formData, ticker_symbol: e.target.value })}
                                        placeholder={formData.api_source === 'MFAPI' ? "e.g. 120465" : "e.g. RELIANCE.NS"}
                                        className="w-full bg-[#151515] border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
                                    />
                                    <p className="text-[10px] text-gray-600 mt-1">
                                        {formData.api_source === 'MFAPI'
                                            ? "Use Scheme Code from MFAPI.in"
                                            : "Use Ticker Symbol (e.g., RELIANCE.NS for NSE)"}
                                    </p>
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
                    <div className="p-4 border-t border-white/5 bg-[#0F0F0F] flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <><Save size={18} /> Create Asset</>}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
