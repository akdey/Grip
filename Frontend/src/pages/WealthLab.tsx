import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, BrainCircuit, LineChart, Calculator, Upload,
    RefreshCw, Sparkles, TrendingUp, Layers
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import { api } from '../lib/api';
import { InvestmentSimulatorModal } from '../components/wealth/InvestmentSimulatorModal';
import { StatementImportModal } from '../components/wealth/StatementImportModal';
import WealthIntelligence from '../components/wealth/WealthIntelligence';

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

const WealthLab: React.FC = () => {
    const navigate = useNavigate();

    // Data States
    const [holdings, setHoldings] = useState<any[]>([]);
    const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
    const [loadingForecast, setLoadingForecast] = useState(true);
    const [simulating, setSimulating] = useState(false);

    // Active Tab in Lab
    const [activeTab, setActiveTab] = useState<'forecast' | 'intelligence'>('forecast');

    // Modals
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isStatementImportOpen, setIsStatementImportOpen] = useState(false);

    // Simulation params
    const [monthlySIP, setMonthlySIP] = useState(5000);
    const [years, setYears] = useState(10);

    const fetchHoldingsAndForecast = async () => {
        setLoadingForecast(true);
        try {
            const [holdingsRes, forecastRes] = await Promise.all([
                api.get('/wealth/holdings').catch(() => ({ data: [] })),
                api.post('/wealth/forecast', { years: 10, monthly_investment: 0 }).catch(() => ({ data: null }))
            ]);
            setHoldings(holdingsRes.data || []);
            setForecastData(forecastRes.data);
        } catch (e) {
            console.error("Failed to load Wealth Lab data", e);
        } finally {
            setLoadingForecast(false);
        }
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
        fetchHoldingsAndForecast();
    }, []);

    // Format currency
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    // Chart Data Preparation
    const chartData = useMemo(() => {
        if (!forecastData) return [];

        const historyPoints = (forecastData.history || []).map(p => ({
            date: new Date(p.date).toLocaleDateString([], { month: 'short', year: '2-digit' }),
            value: p.yhat,
            forecast: null,
            fullDate: p.date
        }));

        const lastHistory = historyPoints[historyPoints.length - 1];

        const forecastPoints = (forecastData.forecast || []).map(p => ({
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

    return (
        <div className="min-h-screen text-primary p-6 pb-24 overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/wealth')}
                        className="w-10 h-10 rounded-2xl bg-surface-subtle hover:bg-surface-hover border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary transition-all active:scale-95 shadow-sm"
                        title="Back to Portfolio"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black tracking-tighter text-primary heading-apple">
                                Wealth Lab
                            </h1>
                            <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent-text text-[10px] font-black uppercase tracking-wider border border-accent/20">
                                Experimental
                            </span>
                        </div>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5">
                            Prophet ML Forecasts, What-If Simulators & Intelligence
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsStatementImportOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-surface-hover text-primary text-xs font-semibold border border-border-subtle transition-colors flex items-center gap-1.5"
                    >
                        <Upload size={14} /> Import CAS (CAMS/KFin)
                    </button>
                    <button
                        onClick={() => setIsSimulatorOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent-hover transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                        <Calculator size={14} /> Time Machine Simulator
                    </button>
                    <button
                        onClick={fetchHoldingsAndForecast}
                        className="w-9 h-9 rounded-xl bg-surface-subtle hover:bg-surface-hover text-primary transition-colors border border-border-subtle flex items-center justify-center"
                        aria-label="Refresh Lab"
                    >
                        <RefreshCw size={15} className={loadingForecast ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Quick Navigation Tabs inside Lab */}
            <div className="flex border-b border-border-subtle mb-6 gap-6">
                <button
                    onClick={() => setActiveTab('forecast')}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors relative ${
                        activeTab === 'forecast'
                            ? 'text-primary'
                            : 'text-text-muted hover:text-primary'
                    }`}
                >
                    <LineChart size={15} />
                    Future Predictions (Prophet ML)
                    {activeTab === 'forecast' && (
                        <motion.div
                            layoutId="lab-tab-indicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                        />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('intelligence')}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors relative ${
                        activeTab === 'intelligence'
                            ? 'text-primary'
                            : 'text-text-muted hover:text-primary'
                    }`}
                >
                    <BrainCircuit size={15} />
                    Portfolio Intelligence & Allocation
                    {activeTab === 'intelligence' && (
                        <motion.div
                            layoutId="lab-tab-indicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                        />
                    )}
                </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'forecast' ? (
                <div className="space-y-6">
                    {/* Controls & Projection Banner */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Simulation Controls Card */}
                        <div className="lg:col-span-1 bg-surface-subtle border border-border-subtle rounded-2xl p-6 flex flex-col justify-between">
                            <div>
                                <div className="p-2.5 bg-accent-subtle rounded-xl w-fit mb-3 text-primary">
                                    <Sparkles size={20} />
                                </div>
                                <h3 className="text-base font-bold text-primary mb-1">Projection Model</h3>
                                <p className="text-xs text-text-muted leading-relaxed mb-4">
                                    Simulate your portfolio's compound trajectory with future monthly contributions.
                                </p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] text-text-muted uppercase font-bold mb-1">
                                            Monthly Contribution
                                        </label>
                                        <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-xl border border-border-subtle">
                                            <span className="text-text-muted text-xs">₹</span>
                                            <input
                                                type="number"
                                                value={monthlySIP}
                                                onChange={(e) => setMonthlySIP(Number(e.target.value))}
                                                className="w-full bg-transparent outline-none font-mono text-sm text-primary"
                                                placeholder="5000"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-text-muted uppercase font-bold mb-1">
                                            Horizon (Years)
                                        </label>
                                        <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-xl border border-border-subtle">
                                            <input
                                                type="number"
                                                value={years}
                                                onChange={(e) => setYears(Number(e.target.value))}
                                                className="w-full bg-transparent outline-none font-mono text-sm text-primary"
                                                placeholder="10"
                                            />
                                            <span className="text-text-muted text-xs">Years</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={runSimulation}
                                disabled={simulating}
                                className="w-full mt-6 py-2.5 bg-accent text-black rounded-xl text-xs font-bold hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
                            >
                                {simulating ? "Calculating Forecast..." : "Update Prediction"}
                            </button>
                        </div>

                        {/* Prophet ML Forecast Chart */}
                        <div className="lg:col-span-3 bg-surface-subtle border border-border-subtle rounded-2xl p-6 min-h-[380px] flex flex-col justify-between">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-primary">10-Year Monte Carlo Trajectory</h3>
                                    <p className="text-[11px] text-text-muted">
                                        Historical vs Machine Learning Forecast with upper & lower confidence intervals
                                    </p>
                                </div>
                                {forecastData?.forecast?.length ? (
                                    <div className="text-right">
                                        <p className="text-[10px] text-text-muted uppercase font-semibold">Estimated Value</p>
                                        <p className="text-lg font-black text-accent-text">
                                            {formatCurrency(forecastData.forecast[forecastData.forecast.length - 1].yhat)}
                                        </p>
                                    </div>
                                ) : null}
                            </div>

                            <div className="w-full h-[280px]">
                                {loadingForecast ? (
                                    <div className="w-full h-full flex items-center justify-center animate-pulse bg-surface rounded-xl">
                                        <div className="text-text-muted text-xs">Generating Prediction Model...</div>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="labColorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="labColorForecast" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--color-accent-solid, #22d3ee)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--color-accent-solid, #22d3ee)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #333)" vertical={false} />
                                            <XAxis dataKey="date" stroke="var(--color-text-muted, #888)" tick={{ fontSize: 10 }} minTickGap={30} />
                                            <YAxis
                                                stroke="var(--color-text-muted, #888)"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--color-bg-surface, #121212)', borderColor: 'var(--color-border-subtle, #333)', color: 'var(--color-text-primary, #fff)', borderRadius: '8px', fontSize: '12px' }}
                                                formatter={(val: any) => formatCurrency(Number(val) || 0)}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#labColorValue)"
                                                name="Historical"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="forecast"
                                                stroke="var(--color-accent-solid, #22d3ee)"
                                                strokeDasharray="5 5"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#labColorForecast)"
                                                name="Forecast"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {forecastData?.summary_text && (
                                <p className="text-xs text-text-muted mt-3 italic line-clamp-1">
                                    "{forecastData.summary_text}"
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* INTELLIGENCE TAB */
                <WealthIntelligence holdings={holdings} />
            )}

            {/* Modals */}
            <InvestmentSimulatorModal
                isOpen={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
            />

            <StatementImportModal
                isOpen={isStatementImportOpen}
                onClose={() => setIsStatementImportOpen(false)}
                onSuccess={fetchHoldingsAndForecast}
            />
        </div>
    );
};

export default WealthLab;
