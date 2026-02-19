import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { SpendTrendPoint } from '../../features/dashboard/hooks';

interface SpendTrendChartProps {
    data: SpendTrendPoint[];
    frequency?: 'daily' | 'weekly' | 'monthly';
}

export const SpendTrendChart: React.FC<SpendTrendChartProps> = ({ data, frequency = 'monthly' }) => {
    const processedData = useMemo(() => {
        return data.map(item => {
            const date = parseISO(item.date);
            let formattedDate = '';

            if (frequency === 'monthly') {
                formattedDate = format(date, 'MMM');
            } else if (frequency === 'weekly') {
                formattedDate = `W${format(date, 'w')}`;
            } else {
                formattedDate = format(date, 'MMM dd');
            }

            return {
                ...item,
                formattedDate,
            };
        });
    }, [data, frequency]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={processedData}
                    margin={{ top: 20, right: 0, left: -25, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis
                        dataKey="formattedDate"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#4b5563', fontSize: 10, fontWeight: '900' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#4b5563', fontSize: 10, fontWeight: '900' }}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-[#050505] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border-l-rose-500 border-l-4">
                                        <p className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">
                                            {frequency === 'monthly' ? `${label} Spend` : label}
                                        </p>
                                        <p className="text-xl font-black text-white tracking-tighter">
                                            {formatCurrency(Number(payload[0].value))}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar
                        dataKey="amount"
                        radius={[6, 6, 0, 0]}
                        barSize={frequency === 'monthly' ? 40 : 20}
                    >
                        {processedData.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={index === processedData.length - 1 ? '#f43f5e' : 'rgba(244, 63, 94, 0.3)'}
                                className="transition-all duration-500 hover:fill-rose-500 hover:opacity-100"
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
