import React, { useState, useEffect, useMemo } from 'react';
import { HoldingDetailsModal } from '../components/wealth/HoldingDetailsModal';
import { WealthLinker } from '../components/wealth/WealthLinker';
import { AddHoldingModal } from '../components/wealth/AddHoldingModal';
import { InvestmentSimulatorModal } from '../components/wealth/InvestmentSimulatorModal';
import { CAMSImportModal } from '../components/wealth/CAMSImportModal';
import { WealthCategoryCard } from '../components/wealth/WealthCategoryCard';
import WealthIntelligence from '../components/wealth/WealthIntelligence';
import { motion } from 'framer-motion';
import {
    TrendingUp, Wallet, Plus, RefreshCw, Link as LinkIcon,
    Activity, PieChart, Upload, Calculator, BrainCircuit,
    Layers, LineChart
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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

    // UI Tabs
    const [activeMainTab, setActiveMainTab] = useState<'trajectory' | 'intelligence'>('trajectory');

    // Modal States
    const [isLinkerOpen, setIsLinkerOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isCAMSImportOpen, setIsCAMSImportOpen] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState<any | null>(null);

    // Simulation State (Quick Forecast params)
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
    // Group holdings by asset_type
    const holdingsByType = useMemo(() => {
        return holdings.reduce((acc, h) => {
            const type = h.asset_type || 'Other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(h);
            return acc;
        }, {} as Record<string, Holding[]>);
    }, [holdings]);

    const totalWealth = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
    const absoluteReturn = totalWealth - totalInvested;
    const returnPercentage = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

    // Chart Data Preparation
    const chartData = useMemo(() => {
        if (!forecastData) return [];

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600">
                        Wealth
                    </h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px] mt-0.5">Your Financial Core</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsLinkerOpen(true)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium border border-white/5 transition-colors flex items-center gap-2"
                    >
                        <LinkIcon size={14} /> Link Transaction
                    </button>
                    <button
                        onClick={() => setIsCAMSImportOpen(true)}
                        className="p-2 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 transition-colors border border-purple-500/20"
                        title="Import CAMS Statement"
                    >
                        <Upload size={20} />
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="p-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors border border-emerald-500/20"
                        title="Add Asset Manually"
                    >
                        <Plus size={20} />
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={20} className={holdingsLoading || forecastLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet size={64} />
                    </div>
                    {holdingsLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-20 bg-white/10 rounded" />
                            <div className="h-8 w-32 bg-white/10 rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-500 text-sm font-medium">Net Worth</p>
                            <h2 className="text-3xl font-bold mt-2">{formatCurrency(totalWealth)}</h2>
                            <div className="flex items-center mt-2 space-x-2">
                                <span className={`text-sm px-2 py-0.5 rounded-full ${absoluteReturn >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                                    {absoluteReturn >= 0 ? "+" : ""}{formatCurrency(absoluteReturn)}
                                </span>
                            </div>
                        </>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6"
                >
                    {holdingsLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-20 bg-white/10 rounded" />
                            <div className="h-8 w-32 bg-white/10 rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-500 text-sm font-medium">Portfolio Returns</p>
                            <h2 className={`text-3xl font-bold mt-2 ${returnPercentage >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {returnPercentage.toFixed(2)}%
                            </h2>
                            <p className="text-xs text-gray-600 mt-2">Overall Absolute Return</p>
                        </>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 bg-gradient-to-br from-indigo-900/10 to-purple-900/10"
                >
                    {forecastLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-20 bg-white/10 rounded" />
                            <div className="h-8 w-32 bg-white/10 rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-500 text-sm font-medium">Projected (10Y)</p>
                            <h2 className="text-3xl font-bold mt-2 text-indigo-400">
                                {forecastData?.forecast.length ? formatCurrency(forecastData.forecast[forecastData.forecast.length - 1].yhat) : "..."}
                            </h2>
                            <p className="text-xs text-gray-500 mt-2 line-clamp-1">{forecastData?.summary_text}</p>
                        </>
                    )}
                </motion.div>
            </div>

            {/* Simulations & Intelligence Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* Financial Time Machine Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-1 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer"
                    onClick={() => setIsSimulatorOpen(true)}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calculator size={80} />
                    </div>
                    <div>
                        <div className="p-2 bg-indigo-500/20 rounded-lg w-fit mb-3 text-indigo-400">
                            <BrainCircuit size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Time Machine</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Simulate "What-If" scenarios. See how your investments would have performed if you timed them differently.
                        </p>
                    </div>
                    <button className="mt-4 w-full py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-300 uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                        Run Simulator <Calculator size={14} />
                    </button>
                </motion.div>

                {/* Main Predictions Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-3 bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 min-h-[350px]"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setActiveMainTab('trajectory')}
                                className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeMainTab === 'trajectory' ? 'text-indigo-400' : 'text-gray-600'}`}
                            >
                                <LineChart size={16} />
                                Future Predictions
                            </button>
                            <button
                                onClick={() => setActiveMainTab('intelligence')}
                                className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeMainTab === 'intelligence' ? 'text-emerald-400' : 'text-gray-600'}`}
                            >
                                <BrainCircuit size={16} />
                                Intelligence
                            </button>
                        </div>

                        {activeMainTab === 'trajectory' && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Monthly SIP</span>
                                    <input
                                        type="number"
                                        value={monthlySIP}
                                        onChange={(e) => setMonthlySIP(Number(e.target.value))}
                                        className="w-16 bg-transparent outline-none text-right font-mono text-sm"
                                    />
                                </div>
                                <button
                                    onClick={runSimulation}
                                    disabled={simulating}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-xs font-bold disabled:opacity-50 transition-colors"
                                >
                                    {simulating ? "..." : "Update"}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={`w-full ${activeMainTab === 'trajectory' ? 'h-[280px]' : ''}`}>
                        {activeMainTab === 'trajectory' ? (
                            forecastLoading ? (
                                <div className="w-full h-full flex items-center justify-center animate-pulse bg-white/[0.02] rounded-xl">
                                    <div className="text-gray-600 text-xs">Generating Prediction Model...</div>
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
                                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                        <XAxis dataKey="date" stroke="#444" tick={{ fontSize: 10 }} minTickGap={30} />
                                        <YAxis
                                            stroke="#444"
                                            tick={{ fontSize: 10 }}
                                            tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
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
            </div>

            {/* Investment Categories */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <Layers className="text-emerald-500" size={20} />
                    <h2 className="text-xl font-bold text-gray-200">Portfolio Breakdown</h2>
                </div>

                {holdingsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2].map(i => (
                            <div key={i} className="h-40 bg-[#0A0A0A] border border-white/5 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Map over grouped holdings */}
                        {Object.entries(holdingsByType).map(([type, typeHoldings], index) => (
                            <WealthCategoryCard
                                key={type}
                                title={type === 'MUTUAL_FUND' ? 'Mutual Funds' : type === 'STOCK' ? 'Stocks' : type}
                                type={type}
                                icon={
                                    type === 'MUTUAL_FUND' ? <PieChart size={20} className="text-emerald-400" /> :
                                        type === 'STOCK' ? <Activity size={20} className="text-blue-400" /> :
                                            <Wallet size={20} className="text-purple-400" />
                                }
                                holdings={typeHoldings}
                                onHoldingClick={fetchHoldingDetails}
                                onSimulate={type === 'MUTUAL_FUND' || type === 'STOCK' ? () => setIsSimulatorOpen(true) : undefined}
                                onAnalyze={type === 'MUTUAL_FUND' ? () => setActiveMainTab('intelligence') : undefined}
                            />
                        ))}

                        {holdings.length === 0 && (
                            <div className="col-span-full py-12 text-center border dashed border-white/10 rounded-2xl bg-[#0A0A0A]">
                                <p className="text-gray-500">No investments found.</p>
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="mt-4 px-6 py-2 bg-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-500 transition-colors"
                                >
                                    Add your first investment
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
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
