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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                    <XAxis
                        dataKey="formattedDate"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: '900' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: '900' }}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--color-bg-surface-subtle)' }}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-surface border border-border-subtle p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                                        <p className="text-[10px] font-black text-text-muted uppercase mb-2 tracking-widest">
                                            {frequency === 'monthly' ? `${label} Spend` : label}
                                        </p>
                                        <p className="text-xl font-black text-primary tracking-tighter">
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
                                fill={index === processedData.length - 1 ? 'var(--color-accent-solid, #22d3ee)' : 'var(--color-border-strong, rgba(255, 255, 255, 0.18))'}
                                className="transition-all duration-300 hover:fill-accent-hover"
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
