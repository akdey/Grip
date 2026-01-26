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
            {/* Header & Global Actions */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8 px-1">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black tracking-tighter text-white">
                        Wealth
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[3px]">Real-Time Portfolio Tracking</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setIsLinkerOpen(true)}
                        className="px-4 py-2 rounded-xl hover:bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                        <LinkIcon size={14} /> Link
                    </button>
                    <button
                        onClick={() => setIsCAMSImportOpen(true)}
                        className="px-4 py-2 rounded-xl hover:bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                        <Upload size={14} /> CAMS
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
                    >
                        <Plus size={14} /> Asset
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-colors"
                    >
                        <RefreshCw size={16} className={holdingsLoading || forecastLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Executive Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
                <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Wallet size={120} />
                    </div>
                    {holdingsLoading ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 w-24 bg-white/10 rounded" />
                            <div className="h-12 w-48 bg-white/10 rounded" />
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[2px] text-gray-500">Global Net Worth</p>
                            <h2 className="text-6xl font-black mt-4 tracking-tighter">{formatCurrency(totalWealth)}</h2>
                            <div className="flex items-center mt-6 gap-3">
                                <span className={`text-xs font-black px-3 py-1 rounded-full ${absoluteReturn >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-500"}`}>
                                    {absoluteReturn >= 0 ? "▲" : "▼"} {formatCurrency(Math.abs(absoluteReturn))} Profit
                                </span>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Invested: {formatCurrency(totalInvested)}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-10 flex flex-col justify-center">
                    {holdingsLoading ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 w-20 bg-white/10 rounded" />
                            <div className="h-10 w-24 bg-white/10 rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-[2px] text-gray-600">ROI Health</p>
                            <h2 className={`text-5xl font-black mt-4 tracking-tighter ${returnPercentage >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {returnPercentage.toFixed(1)}<span className="text-2xl opacity-50">%</span>
                            </h2>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-2">Overall Performance</p>
                        </>
                    )}
                </div>

                <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-10 flex flex-col justify-center bg-gradient-to-br from-indigo-500/5 to-transparent">
                    {forecastLoading ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 w-20 bg-white/10 rounded" />
                            <div className="h-10 w-24 bg-white/10 rounded" />
                        </div>
                    ) : (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-[2px] text-gray-600">10Y Projection</p>
                            <h2 className="text-5xl font-black mt-4 tracking-tighter text-indigo-400">
                                {forecastData?.forecast.length ? formatCurrency(forecastData.forecast[forecastData.forecast.length - 1].yhat) : "..."}
                            </h2>
                            <p className="text-[10px] text-indigo-500/50 font-bold uppercase tracking-wider mt-2 line-clamp-1">{forecastData?.summary_text}</p>
                        </>
                    )}
                </div>
            </div>

            {/* Hero Forecast Section */}
            <div className="space-y-6 mb-12">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <LineChart size={18} className="text-indigo-400" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Growth Trajectory</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Monthly SIP</span>
                            <input
                                type="number"
                                value={monthlySIP}
                                onChange={(e) => setMonthlySIP(Number(e.target.value))}
                                className="w-16 bg-transparent outline-none text-right font-mono text-sm text-indigo-300"
                            />
                        </div>
                        <button
                            onClick={runSimulation}
                            disabled={simulating}
                            className="px-4 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs font-bold transition-all"
                        >
                            {simulating ? "..." : "Simulate"}
                        </button>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#050505] border border-white/5 rounded-3xl p-8 min-h-[400px] relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />

                    {forecastLoading ? (
                        <div className="w-full h-[320px] flex items-center justify-center animate-pulse">
                            <div className="text-gray-600 text-xs font-mono uppercase tracking-widest">Crunching Market Dynamics...</div>
                        </div>
                    ) : (
                        <div className="h-[320px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="date" stroke="#333" tick={{ fontSize: 10, fontWeight: 700 }} minTickGap={50} axisLine={false} tickLine={false} />
                                    <YAxis
                                        stroke="#333"
                                        tick={{ fontSize: 10, fontWeight: 700 }}
                                        tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                        axisLine={false} tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '16px', padding: '12px' }}
                                        formatter={(val: number) => [formatCurrency(val), ""]}
                                        itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 900 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="forecast"
                                        stroke="#6366f1"
                                        strokeDasharray="8 4"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorForecast)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Intelligence Section */}
            <div className="mb-20">
                <div className="flex items-center gap-2 mb-6 px-1">
                    <BrainCircuit size={18} className="text-emerald-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Deep Intelligence</h2>
                </div>
                <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-4 md:p-10">
                    <WealthIntelligence holdings={holdings} />
                </div>
            </div>

            {/* Asset Categories */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Layers size={18} className="text-gray-400" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Portfolio Details</h2>
                    </div>
                </div>

                {holdingsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-white/[0.02] border border-white/5 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(holdingsByType).map(([type, typeHoldings]) => (
                            <WealthCategoryCard
                                key={type}
                                title={type === 'MUTUAL_FUND' ? 'Mutual Funds' : type === 'STOCK' ? 'Stocks' : type}
                                type={type}
                                icon={
                                    type === 'MUTUAL_FUND' ? <PieChart size={18} className="text-emerald-400" /> :
                                        type === 'STOCK' ? <Activity size={18} className="text-blue-400" /> :
                                            <Wallet size={18} className="text-purple-400" />
                                }
                                holdings={typeHoldings}
                                onHoldingClick={fetchHoldingDetails}
                                onSimulate={() => setIsSimulatorOpen(true)}
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
