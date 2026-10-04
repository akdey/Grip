
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SIPDateAnalysis } from './SIPDateAnalysis';
import { haptics } from '../../lib/haptics';

interface HoldingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    holding: any; // Using any temporarily, should strictly type share with parent
}

export const HoldingDetailsModal: React.FC<HoldingDetailsModalProps> = ({ isOpen, onClose, holding }) => {
    const [activeTab, setActiveTab] = useState<'performance' | 'sip-analysis'>('performance');

    // Process snapshots for chart
    const chartData = useMemo(() => {
        if (!holding?.snapshots) return [];
        return holding.snapshots.map((s: any) => ({
            date: new Date(s.captured_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            value: s.total_value,
            invested: s.total_value - (s.amount_invested_delta || 0), // Approx logic, actually unit * price
            price: s.price_per_unit
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [holding]);

    if (!holding) return null;

    // Check if holding has SIP data
    const hasSIPData = holding.snapshots?.some((s: any) => s.is_sip);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            haptics.selection();
                            onClose();
                        }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.85 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0.14, bottom: 0.8 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 140 || info.velocity.y > 550) {
                                haptics.impact('light');
                                onClose();
                            } else {
                                haptics.selection();
                            }
                        }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[90vh] glass-drawer rounded-t-[3rem] flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-auto select-none touch-none"
                    >
                        {/* Grabber Pill */}
                        <div
                            className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                            onClick={() => {
                                haptics.selection();
                                onClose();
                            }}
                        >
                            <div className="w-10 h-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors active:scale-95" />
                        </div>

                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-border-subtle flex justify-between items-start bg-surface-subtle shrink-0">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black text-primary line-clamp-1 tracking-tighter uppercase italic heading-apple">
                                    {holding.name}
                                </h2>
                                <div className="flex items-center gap-3 mt-2 text-xs text-text-muted font-bold uppercase tracking-widest">
                                    <span className="bg-accent-subtle text-primary px-3 py-1 rounded-full border border-border-subtle">{holding.asset_type}</span>
                                    {holding.ticker_symbol && <span>• {holding.ticker_symbol}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="w-14 h-14 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all shadow-xl group"
                                >
                                    <ChevronDown size={28} className="group-hover:translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs & Content Container */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {hasSIPData && (
                                <div className="flex gap-2 px-6 sm:px-10 border-b border-border-subtle bg-surface-subtle/50">
                                    <button
                                        onClick={() => setActiveTab('performance')}
                                        className={`px-6 py-4 text-xs font-black uppercase tracking-[3px] transition-all relative ${activeTab === 'performance' ? 'text-emerald-500' : 'text-text-muted hover:text-primary'}`}
                                    >
                                        Performance
                                        {activeTab === 'performance' && (
                                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('sip-analysis')}
                                        className={`px-6 py-4 text-xs font-black uppercase tracking-[3px] transition-all relative ${activeTab === 'sip-analysis' ? 'text-emerald-500' : 'text-text-muted hover:text-primary'}`}
                                    >
                                        SIP Intelligence
                                        {activeTab === 'sip-analysis' && (
                                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                                        )}
                                    </button>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                                {activeTab === 'performance' ? (
                                    <>
                                        {/* KPIS */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                <p className="text-xs text-text-muted">Current Value</p>
                                                <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(holding.current_value)}</p>
                                            </div>
                                            <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                <p className="text-xs text-text-muted">Invested</p>
                                                <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(holding.total_invested)}</p>
                                            </div>
                                            <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                <p className="text-xs text-text-muted">Net Returns</p>
                                                <p className={`text-xl font-bold mt-1 ${(holding.current_value - holding.total_invested) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                    {formatCurrency(holding.current_value - holding.total_invested)}
                                                </p>
                                            </div>
                                            <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle">
                                                <p className="text-xs text-text-muted">XIRR</p>
                                                <p className="text-xl font-bold mt-1 text-primary">
                                                    {holding.xirr ? `${holding.xirr.toFixed(1)}%` : "N/A"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Chart */}
                                        <div className="bg-surface-subtle rounded-xl border border-border-subtle p-4 h-[250px] sm:h-[300px]">
                                            <h3 className="text-sm font-medium text-text-muted mb-4 flex items-center gap-2">
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
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #333)" vertical={false} />
                                                    <XAxis dataKey="date" stroke="var(--color-text-muted, #888)" tick={{ fontSize: 10 }} minTickGap={30} />
                                                    <YAxis stroke="var(--color-text-muted, #888)" tick={{ fontSize: 10 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--color-bg-surface, #111)', borderColor: 'var(--color-border-subtle, #333)', color: 'var(--color-text-primary, #fff)', borderRadius: '8px', fontSize: '12px' }}
                                                        formatter={(val: any) => formatCurrency(Number(val))}
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
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
