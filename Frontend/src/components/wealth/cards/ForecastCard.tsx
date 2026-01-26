import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';

const ForecastCard: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchForecast = async () => {
            try {
                const res = await api.post('/wealth/forecast', { years: 10 });
                setData(res.data.forecast);
            } catch (err) {
                setError("Data insufficient for projection");
            } finally {
                setLoading(false);
            }
        };
        fetchForecast();
    }, []);

    if (loading) return (
        <div className="bg-white/5 border border-white/5 rounded-2xl h-[180px] flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-500" size={24} />
        </div>
    );

    if (error || data.length === 0) return null;

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">AI Forecast</h3>
                <BrainCircuit size={14} className="text-emerald-400" />
            </div>

            <div className="bg-[#050505] border border-white/5 rounded-2xl p-5">
                <div className="mb-4">
                    <p className="text-xs text-gray-500 font-medium">10-Year Wealth Projection</p>
                    <p className="text-2xl font-black text-white mt-1">
                        ₹{data[data.length - 1].yhat.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                </div>

                <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="yhat"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorY)"
                                strokeWidth={2}
                            />
                            <XAxis dataKey="date" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#10b981', fontSize: '12px' }}
                                formatter={(val: any) => [`₹${val.toLocaleString()}`, 'Value']}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-gray-600 mt-2 italic text-center uppercase tracking-tighter">
                    Based on historical trends • Powered by Prophet AI
                </p>
            </div>
        </section>
    );
};

export default ForecastCard;
