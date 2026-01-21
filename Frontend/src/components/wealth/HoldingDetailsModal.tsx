
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SIPDateAnalysis } from './SIPDateAnalysis';

interface HoldingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    holding: any; // Using any temporarily, should strictly type share with parent
}

export const HoldingDetailsModal: React.FC<HoldingDetailsModalProps> = ({ isOpen, onClose, holding }) => {
    const [activeTab, setActiveTab] = useState<'performance' | 'sip-analysis'>('performance');

    if (!holding) return null;

    // Check if holding has SIP data
    const hasSIPData = holding.snapshots?.some((s: any) => s.is_sip);

    // Process snapshots for chart
    const chartData = useMemo(() => {
        if (!holding.snapshots) return [];
        return holding.snapshots.map((s: any) => ({
            date: new Date(s.captured_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            value: s.total_value,
            invested: s.total_value - (s.amount_invested_delta || 0), // Approx logic, actually unit * price
            price: s.price_per_unit
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [holding]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-[5%] left-[5%] right-[5%] bottom-[5%] md:top-[10%] md:left-[15%] md:right-[15%] md:bottom-[10%] bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 z-50 flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                                    {holding.name}
                                </h2>
                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                    <span className="bg-white/5 px-2 py-0.5 rounded text-xs border border-white/5">{holding.asset_type}</span>
                                    {holding.ticker_symbol && <span>• {holding.ticker_symbol}</span>}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        {hasSIPData && (
                            <div className="flex gap-2 mb-6 border-b border-white/5">
                                <button
                                    onClick={() => setActiveTab('performance')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'performance'
                                            ? 'text-emerald-400'
                                            : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    Performance
                                    {activeTab === 'performance' && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400"
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('sip-analysis')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'sip-analysis'
                                            ? 'text-emerald-400'
                                            : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    SIP Date Analysis
                                    {activeTab === 'sip-analysis' && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400"
                                        />
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'performance' ? (
                                <>
                                    {/* KPIS */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                            <p className="text-xs text-gray-500">Current Value</p>
                                            <p className="text-xl font-bold mt-1">{formatCurrency(holding.current_value)}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                            <p className="text-xs text-gray-500">Invested</p>
                                            <p className="text-xl font-bold mt-1">{formatCurrency(holding.total_invested)}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                            <p className="text-xs text-gray-500">Net Returns</p>
                                            <p className={`text-xl font-bold mt-1 ${(holding.current_value - holding.total_invested) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {formatCurrency(holding.current_value - holding.total_invested)}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                            <p className="text-xs text-gray-500">XIRR</p>
                                            <p className="text-xl font-bold mt-1 text-purple-400">
                                                {holding.xirr ? `${holding.xirr.toFixed(1)}%` : "N/A"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    <div className="bg-[#050505] rounded-xl border border-white/5 p-4 h-[300px]">
                                        <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                                            <TrendingUp size={16} /> Performance History
                                        </h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                                <XAxis dataKey="date" stroke="#444" tick={{ fontSize: 10 }} minTickGap={30} />
                                                <YAxis stroke="#444" tick={{ fontSize: 10 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
                                                    formatter={(val: number) => formatCurrency(val)}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#10b981"
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorVal)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <SIPDateAnalysis holdingId={holding.id} />
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
