import React, { useEffect, useRef, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { SyncTrend } from '../../features/sync/types';

interface SyncTrendChartProps {
    data: SyncTrend[];
}

export const SyncTrendChart: React.FC<SyncTrendChartProps> = ({ data }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const processedData = useMemo(() => {
        let lastYield = 0;

        // Calculate Efficiency Ratio (%) instead of raw counts
        const ratios = data.map(item => {
            const totalSyncs = item.manual + item.system;
            let currentYield = totalSyncs > 0 ? (item.system / totalSyncs) * 100 : lastYield;

            // Bias: If zero manual effort and at least one system sync, it's a 100% win
            if (item.manual === 0 && item.system > 0) currentYield = 100;
            // Bias: If zero system and at least one manual, it's a 100% loss (0% yield)
            if (item.system === 0 && item.manual > 0) currentYield = 0;

            lastYield = currentYield;
            return {
                ...item,
                yield: currentYield,
                friction: 100 - currentYield,
                formattedDate: format(parseISO(item.date), 'MMM dd'),
            };
        });

        // Apply a simple 3-day rolling average to smooth the story
        return ratios.map((item, idx, arr) => {
            if (idx < 2) return item;
            const window = arr.slice(idx - 2, idx + 1);
            const avgYield = window.reduce((acc, curr) => acc + curr.yield, 0) / 3;
            return {
                ...item,
                yield: Math.round(avgYield),
                friction: Math.round(100 - avgYield)
            };
        });
    }, [data]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [processedData]);

    const minWidth = Math.max(processedData.length * 60, 300);

    return (
        <div className="w-full mt-6">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[2px] text-white/40">Automation Yield</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-lg font-black text-indigo-400 leading-none">
                            {processedData[processedData.length - 1]?.yield || 0}%
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-[2px] text-white/40">Human Friction</span>
                    <div className="flex items-center gap-2 mt-1 justify-end">
                        <span className="text-lg font-black text-rose-500 leading-none">
                            {processedData[processedData.length - 1]?.friction || 0}%
                        </span>
                        <span className="w-2 h-2 rounded-full bg-rose-500/50" />
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar scroll-smooth"
            >
                <div style={{ width: `${minWidth}px`, height: '240px' }} className="relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={processedData}
                            margin={{ top: 20, right: 10, left: -35, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorFriction" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />

                            <XAxis
                                dataKey="formattedDate"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#374151', fontSize: 9, fontWeight: '900' }}
                                dy={10}
                            />

                            <YAxis
                                domain={[0, 100]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#374151', fontSize: 9, fontWeight: '900' }}
                            />

                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const item = payload[0].payload;
                                        return (
                                            <div className="bg-[#0a0a0a] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-xl min-w-[160px]">
                                                <p className="text-[10px] font-black text-gray-500 uppercase mb-3 tracking-widest">{label}</p>
                                                <div className="space-y-2">
                                                    <div className="flex flex-col">
                                                        <div className="flex justify-between items-center mb-0.5">
                                                            <span className="text-[10px] font-black text-indigo-400">AUTOMATION</span>
                                                            <span className="text-[10px] font-black">{item.yield}%</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase">{item.system} Auto Entries</span>
                                                    </div>

                                                    <div className="h-[1px] bg-white/5 w-full" />

                                                    <div className="flex flex-col">
                                                        <div className="flex justify-between items-center mb-0.5">
                                                            <span className="text-[10px] font-black text-rose-500">FRICTION</span>
                                                            <span className="text-[10px] font-black">{item.friction}%</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase">{item.manual} Manual Entries</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey="yield"
                                stroke="#6366f1"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorYield)"
                                name="Auto Entry"
                                stackId="1"
                            />

                            <Area
                                type="monotone"
                                dataKey="friction"
                                stroke="#f43f5e"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                fillOpacity={1}
                                fill="url(#colorFriction)"
                                name="Manual Entry"
                                stackId="2"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <span className="text-xs font-black">AI</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/80 uppercase tracking-tight">Financial Autopilot</p>
                        <p className="text-[8px] text-gray-500 font-bold uppercase">Tracking Automated Growth</p>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <span className="text-[8px] font-black text-green-400 uppercase tracking-wider">Operational</span>
                </div>
            </div>
        </div>
    );
};
