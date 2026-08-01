import React, { useState } from 'react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Sparkles, Send, Code, Terminal, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAIQuery, type AIQueryResponse } from '../../features/dashboard/hooks';

const COLORS = ['#00f2ea', '#ff0050', '#6366f1', '#fbbf24', '#34d399', '#c084fc', '#f43f5e'];

const SAMPLE_QUERIES = [
    "Groceries vs Dining Out spend",
    "Top 5 spending categories this month",
    "Monthly spending trend over time",
    "Bills pending payment"
];

export const AskGripAI: React.FC = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<AIQueryResponse | null>(null);
    const [showSQL, setShowSQL] = useState(false);

    const { mutate: runQuery, isPending, error } = useAIQuery();

    const handleSubmit = (e?: React.FormEvent, textOverride?: string) => {
        if (e) e.preventDefault();
        const textToRun = textOverride || query;
        if (!textToRun.trim() || isPending) return;

        runQuery(textToRun.trim(), {
            onSuccess: (data) => {
                setResult(data);
            }
        });
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const renderChart = () => {
        if (!result || !result.data || result.data.length === 0) {
            return (
                <div className="p-8 text-center text-gray-400 bg-white/[0.02] rounded-2xl border border-white/5">
                    <p className="text-sm">No data returned for this query or category.</p>
                </div>
            );
        }

        const data = result.data;
        const xAxisKey = result.x_axis || Object.keys(data[0])[0];
        const yAxisKey = result.y_axis || Object.keys(data[0])[1] || Object.keys(data[0])[0];

        if (result.chart_type === 'pie') {
            return (
                <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey={yAxisKey}
                                nameKey={xAxisKey}
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                innerRadius={55}
                                paddingAngle={4}
                            >
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-[#0a0a0a] border border-white/10 p-3 rounded-xl shadow-xl">
                                                <p className="text-xs text-gray-400 font-bold">{payload[0].name}</p>
                                                <p className="text-lg font-black text-white">{formatCurrency(Number(payload[0].value))}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (result.chart_type === 'line') {
            return (
                <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis dataKey={xAxisKey} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-[#0a0a0a] border border-white/10 p-3 rounded-xl shadow-xl">
                                                <p className="text-xs text-gray-400 font-bold">{label}</p>
                                                <p className="text-lg font-black text-cyan-400">{formatCurrency(Number(payload[0].value))}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line type="monotone" dataKey={yAxisKey} stroke="#00f2ea" strokeWidth={3} dot={{ r: 4, fill: '#00f2ea' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (result.chart_type === 'metric' && data.length === 1) {
            const val = data[0][yAxisKey] || Object.values(data[0])[0];
            return (
                <div className="p-8 text-center bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/20">
                    <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-2">{result.title}</p>
                    <p className="text-4xl font-black text-white">{typeof val === 'number' ? formatCurrency(val) : String(val)}</p>
                </div>
            );
        }

        // Default to Bar chart
        return (
            <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey={xAxisKey} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-[#0a0a0a] border border-white/10 p-3 rounded-xl shadow-xl">
                                            <p className="text-xs text-gray-400 font-bold">{label}</p>
                                            <p className="text-lg font-black text-emerald-400">{formatCurrency(Number(payload[0].value))}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey={yAxisKey} fill="#10b981" radius={[6, 6, 0, 0]} barSize={36} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <Card className="relative overflow-hidden bg-gradient-to-b from-white/[0.04] to-white/[0.01] border-white/10 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Sparkles size={20} className="text-black" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            Ask Grip AI
                            <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Gemma 4
                            </span>
                        </h2>
                        <p className="text-xs text-gray-400">Ask any financial question in plain text</p>
                    </div>
                </div>
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => handleSubmit(e)} className="relative mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Compare Groceries vs Dining Out spend this month..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                />
                <button
                    type="submit"
                    disabled={isPending || !query.trim()}
                    className="absolute right-2 top-2 w-9 h-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 transition-all"
                >
                    {isPending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </form>

            {/* Quick Prompt Pills */}
            <div className="flex flex-wrap gap-2 mb-6">
                {SAMPLE_QUERIES.map((sample, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => {
                            setQuery(sample);
                            handleSubmit(undefined, sample);
                        }}
                        className="text-xs bg-white/[0.03] hover:bg-white/[0.08] text-gray-300 border border-white/10 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                    >
                        <span>✨</span>
                        {sample}
                    </button>
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-xs">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{(error as any)?.response?.data?.detail || 'An error occurred while generating query. Please try rephrasing.'}</span>
                </div>
            )}

            {/* Result Box */}
            {result && (
                <div className="space-y-4 animate-enter bg-black/20 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-white">{result.title}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{result.summary}</p>
                        </div>
                        <button
                            onClick={() => setShowSQL(!showSQL)}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 transition-all"
                        >
                            <Code size={13} />
                            {showSQL ? 'Hide SQL' : 'View SQL'}
                        </button>
                    </div>

                    {/* Chart Container */}
                    {renderChart()}

                    {/* SQL Inspector */}
                    {showSQL && (
                        <div className="mt-4 p-3 rounded-xl bg-[#080808] border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                            <div className="flex items-center gap-2 text-gray-500 mb-1 font-sans text-[10px] uppercase tracking-wider font-bold">
                                <Terminal size={12} />
                                Generated SQL Query
                            </div>
                            <code>{result.generated_sql}</code>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};
