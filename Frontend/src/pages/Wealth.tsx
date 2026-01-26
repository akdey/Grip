
import React, { useState, useEffect } from 'react';
import { HoldingDetailsModal } from '../components/wealth/HoldingDetailsModal';
import { WealthLinker } from '../components/wealth/WealthLinker';
import { AddHoldingModal } from '../components/wealth/AddHoldingModal';
import { InvestmentSimulatorModal } from '../components/wealth/InvestmentSimulatorModal';
import { CAMSImportModal } from '../components/wealth/CAMSImportModal';
import WealthIntelligence from '../components/wealth/WealthIntelligence';
import { motion, AnimatePresence } from 'framer-motion'; import {
    TrendingUp, Wallet, ArrowUpRight, Plus, RefreshCw,
    MoreHorizontal, Link as LinkIcon, Activity, PieChart, Upload, Calculator
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

import { api } from '../lib/api';

// Types
interface Holding {
    id: string;
    name: string;
    asset_type: string;
    current_value: number;
    total_invested: number;
    xirr: number | null;
    ticker_symbol: string | null;
}

interface ForecastPoint {
    date: string;
    yhat: number;
    yhat_lower: number;
    yhat_upper: number;
}

interface ForecastResponse {
    history: ForecastPoint[];
    forecast: ForecastPoint[];
    summary_text: string;
}

const Wealth: React.FC = () => {
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
    const [holdingsLoading, setHoldingsLoading] = useState(true);
    const [forecastLoading, setForecastLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);
    const [activeMainTab, setActiveMainTab] = useState<'trajectory' | 'intelligence'>('trajectory');

    // Modal States
    const [isLinkerOpen, setIsLinkerOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isCAMSImportOpen, setIsCAMSImportOpen] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState<any | null>(null);


    // Simulation State
    const [monthlySIP, setMonthlySIP] = useState(5000);
    const [years, setYears] = useState(10);

    const fetchHoldingDetails = async (id: string) => {
        try {
            const res = await api.get(`/wealth/holdings/${id}`);
            setSelectedHolding(res.data);
        } catch (e) {
            console.error("Failed to fetch holding details", e);
        }
    };

    const fetchData = async () => {
        // Fetch Holdings
        setHoldingsLoading(true);
        api.get('/wealth/holdings')
            .then(res => {
                setHoldings(res.data);
            })
            .catch(err => console.error("Failed to fetch holdings", err))
            .finally(() => setHoldingsLoading(false));

        // Fetch Forecast
        setForecastLoading(true);
        api.post('/wealth/forecast', { years: 10, monthly_investment: 0 })
            .then(res => {
                setForecastData(res.data);
            })
            .catch(err => console.error("Failed to fetch forecast", err))
            .finally(() => setForecastLoading(false));
    };

    const runSimulation = async () => {
        setSimulating(true);
        try {
            const res = await api.post('/wealth/forecast', { years, monthly_investment: monthlySIP });
            setForecastData(res.data);
        } catch (error) {
            console.error("Simulation failed", error);
        } finally {
            setSimulating(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Derived Metrics
    const totalWealth = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
    const absoluteReturn = totalWealth - totalInvested;
    const returnPercentage = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

    // Chart Data Preparation
    const chartData = React.useMemo(() => {
        if (!forecastData) return [];

        // Combine history and forecast
        // History: Solid Line
        // Forecast: Dashed Line (conceptually, but Recharts handles single data stream better slightly differently)
        // We will output a single array with "value" (history) and "forecast" (prophet) keys.

        const historyPoints = forecastData.history.map(p => ({
            date: new Date(p.date).toLocaleDateString([], { month: 'short', year: '2-digit' }),
            value: p.yhat,
            forecast: null,
            fullDate: p.date
        }));

        const lastHistory = historyPoints[historyPoints.length - 1];

        const forecastPoints = forecastData.forecast.map(p => ({
            date: new Date(p.date).toLocaleDateString([], { month: 'short', year: '2-digit' }),
            value: null,
            forecast: p.yhat,
            fullDate: p.date
        }));

        // Connect the lines: Add last history point as first forecast point
        if (lastHistory && forecastPoints.length > 0) {
            forecastPoints.unshift({
                ...lastHistory,
                forecast: lastHistory.value,
                value: null
            });
        }

        return [...historyPoints, ...forecastPoints];
    }, [forecastData]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="min-h-screen text-white p-6 pb-24 overflow-x-hidden">
            {/* Header */}
            <header className="mb-12 relative z-10">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">Financial Command</p>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
                            Multi<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Verse</span>
                        </h1>
                        <p className="text-gray-500 font-medium">Your complete wealth ecosystem.</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsSimulatorOpen(true)}
                            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all hover:scale-105 active:scale-95"
                        >
                            <Calculator size={18} className="text-indigo-400 group-hover:text-indigo-300" />
                            <span className="text-sm font-semibold">Simulator</span>
                        </button>
                        <button
                            onClick={() => setIsCAMSImportOpen(true)}
                            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <Upload size={18} className="text-emerald-400 group-hover:text-emerald-300" />
                            <span className="text-sm font-semibold text-emerald-100">Import CAMS</span>
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 transition-all hover:scale-110 active:scale-95"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* Net Worth Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="col-span-1 md:col-span-1 bg-gradient-to-br from-[#151515] to-[#0A0A0A] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/10 transition-colors"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wallet size={120} />
                    </div>

                    <div className="relative z-10">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Net Worth</p>
                        {holdingsLoading ? (
                            <div className="h-12 w-48 bg-white/5 rounded-lg animate-pulse mt-2" />
                        ) : (
                            <h2 className="text-5xl font-black tracking-tighter text-white mt-2">
                                {formatCurrency(totalWealth)}
                            </h2>
                        )}

                        <div className="mt-6 flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${absoluteReturn >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                                {absoluteReturn >= 0 ? "+" : ""}{formatCurrency(absoluteReturn)}
                            </div>
                            <span className="text-xs text-gray-500 font-medium">All Time Return</span>
                        </div>
                    </div>

                    {/* Glow */}
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none" />
                </motion.div>

                {/* Stats & Projections */}
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">
                    {/* Returns Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-center"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full" />
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Portfolio Yield</p>
                        <div className="flex items-baseline gap-1 mt-2">
                            <h3 className={`text-4xl font-black tracking-tighter ${returnPercentage >= 0 ? "text-white" : "text-red-400"}`}>
                                {returnPercentage.toFixed(2)}
                            </h3>
                            <span className="text-lg font-bold text-gray-600">%</span>
                        </div>
                        <p className="text-xs text-emerald-500/60 mt-2 font-mono">XIRR Optimized</p>
                    </motion.div>

                    {/* Forecast Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-center"
                    >
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-[60px] rounded-full" />
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">10Y Projection</p>
                        <div className="mt-2">
                            {forecastLoading ? (
                                <div className="h-8 w-24 bg-white/5 rounded animate-pulse" />
                            ) : (
                                <h3 className="text-3xl font-black tracking-tighter text-purple-200">
                                    {forecastData?.forecast.length ? formatCurrency(forecastData.forecast[forecastData.forecast.length - 1].yhat) : "N/A"}
                                </h3>
                            )}
                        </div>
                        <p className="text-[10px] text-purple-400/60 mt-2 leading-tight max-w-[150px]">
                            Based on current trajectory & market conditions
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Chart Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 min-h-[400px]"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setActiveMainTab('trajectory')}
                                className={`text-lg font-semibold flex items-center gap-2 transition-colors ${activeMainTab === 'trajectory' ? 'text-white' : 'text-gray-500'}`}
                            >
                                <Activity size={18} className={activeMainTab === 'trajectory' ? "text-emerald-500" : "text-gray-600"} />
                                Wealth Trajectory
                            </button>
                            <button
                                onClick={() => setActiveMainTab('intelligence')}
                                className={`text-lg font-semibold flex items-center gap-2 transition-colors ${activeMainTab === 'intelligence' ? 'text-white' : 'text-gray-500'}`}
                            >
                                <TrendingUp size={18} className={activeMainTab === 'intelligence' ? "text-purple-500" : "text-gray-600"} />
                                Intelligence
                            </button>
                        </div>

                        {activeMainTab === 'trajectory' && (
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                    <span className="text-gray-400">SIP:</span>
                                    <input
                                        type="number"
                                        value={monthlySIP}
                                        onChange={(e) => setMonthlySIP(Number(e.target.value))}
                                        className="w-16 bg-transparent outline-none text-right font-mono"
                                    />
                                </div>
                                <button
                                    onClick={runSimulation}
                                    disabled={simulating}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white disabled:opacity-50 transition-colors"
                                >
                                    {simulating ? "..." : "Simulate"}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={`w-full relative ${activeMainTab === 'trajectory' ? 'h-[320px]' : 'min-h-[320px]'}`}>
                        {activeMainTab === 'trajectory' ? (
                            forecastLoading ? (
                                <div className="w-full h-full flex items-center justify-center animate-pulse bg-white/[0.02] rounded-xl">
                                    <div className="text-gray-600 text-xs">Generating Forecast...</div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 12 }} minTickGap={30} />
                                        <YAxis
                                            stroke="#666"
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '12px' }}
                                            formatter={(val: number) => formatCurrency(val)}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                            name="Historical"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="forecast"
                                            stroke="#6366f1"
                                            strokeDasharray="5 5"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorForecast)"
                                            name="Forecast"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )
                        ) : (
                            <WealthIntelligence holdings={holdings} />
                        )}
                    </div>
                </motion.div>

                {/* Holdings List */}
                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <PieChart size={18} className="text-purple-500" />
                            Holdings
                        </h3>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
                        >
                            Manage
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {holdingsLoading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-white/5 animate-pulse">
                                    <div className="space-y-2">
                                        <div className="h-4 w-24 bg-white/10 rounded" />
                                        <div className="h-3 w-16 bg-white/10 rounded" />
                                    </div>
                                    <div className="space-y-2 flex flex-col items-end">
                                        <div className="h-4 w-20 bg-white/10 rounded" />
                                        <div className="h-3 w-12 bg-white/10 rounded" />
                                    </div>
                                </div>
                            ))
                        ) : holdings.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">
                                <p>No holdings yet.</p>
                                <p className="text-xs mt-2">Map transactions to get started.</p>
                            </div>
                        ) : (
                            holdings.map((h, i) => (
                                <motion.div
                                    key={h.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => fetchHoldingDetails(h.id)}
                                    className="group flex justify-between items-center p-3 rounded-xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5 cursor-pointer"
                                    title="View details"
                                >
                                    <div>
                                        <h4 className="font-medium text-gray-200">{h.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-400">{h.asset_type}</span>
                                            {h.xirr && <span className="text-xs text-emerald-500 font-mono">XIRR {h.xirr.toFixed(1)}%</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{formatCurrency(h.current_value)}</p>
                                        <p className="text-xs text-gray-500">
                                            Inv: {formatCurrency(h.total_invested)}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                    <button
                        onClick={() => setIsLinkerOpen(true)}
                        className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                    >
                        <LinkIcon size={18} />
                        Link Transaction
                    </button>

                </div>
            </div>

            <WealthLinker
                isOpen={isLinkerOpen}
                onClose={() => setIsLinkerOpen(false)}
                holdings={holdings}
                onLinkSuccess={fetchData}
            />

            <AddHoldingModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchData}
            />

            <HoldingDetailsModal
                isOpen={!!selectedHolding}
                onClose={() => setSelectedHolding(null)}
                holding={selectedHolding}
            />

            <CAMSImportModal
                isOpen={isCAMSImportOpen}
                onClose={() => setIsCAMSImportOpen(false)}
                onSuccess={fetchData}
            />

            <InvestmentSimulatorModal
                isOpen={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 4px;
                }
            `}</style>
        </div >
    );
};

export default Wealth;
