import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CreditCard, PieChart } from 'lucide-react';

// Subcomponents
import TimingAnalysisCard from './cards/TimingAnalysisCard';
import ForecastCard from './cards/ForecastCard';
import SimulatorCard from './cards/SimulatorCard';

interface Holding {
    id: string;
    name: string;
    ticker_symbol: string | null;
    asset_type?: string;
}

const WealthIntelligence: React.FC<{ holdings: Holding[] }> = ({ holdings }) => {
    // Filter for Mutual Funds for SIP analysis
    const sipHoldings = holdings.filter(h => h.asset_type === 'MUTUAL_FUND');

    const [selectedHoldingId, setSelectedHoldingId] = useState<string>('');
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showInfo, setShowInfo] = useState(false);

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
            try {
                const res = await api.get(`/wealth/holdings/${selectedHoldingId}/sip-analysis`);
                setAnalysis(res.data);
            } catch (err: any) {
                const msg = err.response?.data?.detail || "Calculation in progress or data missing.";
                setError(msg);
                setAnalysis(null);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [selectedHoldingId]);

    return (
        <div className="space-y-8 pb-32">
            {/* 1. Global Portfolio Summary Card */}
            <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <PieChart size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Asset Intelligence Hub</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-4xl font-black text-white tracking-tight">₹{holdings.reduce((sum, h: any) => sum + (h.current_value || 0), 0).toLocaleString()}</span>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[11px] font-bold text-gray-400">
                                {holdings.length} Active Assets
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Asset Pill Selector (Horizontal Scroll) */}
            <div className="space-y-3">
                <div className="flex items-baseline justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Select Portfolio</h3>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-4 px-1 scrollbar-hide">
                    {sipHoldings.map(h => (
                        <button
                            key={h.id}
                            onClick={() => setSelectedHoldingId(h.id)}
                            className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border ${selectedHoldingId === h.id
                                    ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                                    : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
                                }`}
                        >
                            {h.name}
                        </button>
                    ))}
                    {sipHoldings.length === 0 && (
                        <div className="text-[11px] text-gray-600 bg-white/5 border border-dashed border-white/10 rounded-2xl px-6 py-3 w-full text-center">
                            No mutual fund data discovered yet.
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Deep Analysis Deck */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedHoldingId}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-10"
                >
                    {/* Timing Logic */}
                    {loading ? (
                        <div className="h-48 flex items-center justify-center bg-white/5 rounded-3xl animate-pulse">
                            <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Analyzing Dates...</div>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-3xl">
                            <AlertCircle className="mx-auto text-red-500/50 mb-3" size={32} />
                            <p className="text-sm font-medium text-red-400">{error}</p>
                        </div>
                    ) : (
                        <TimingAnalysisCard
                            analysis={analysis}
                            showInfo={showInfo}
                            setShowInfo={setShowInfo}
                        />
                    )}

                    {/* Forecast Card (Independent) */}
                    <ForecastCard />

                    {/* Simulator Card - Always visible logic tool */}
                    <SimulatorCard />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default WealthIntelligence;
