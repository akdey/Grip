import React, { memo } from 'react';
import { Sparkles, Activity, ArrowUpRight } from 'lucide-react';
import type { ForecastInfo } from '../hooks';

interface AIForecastProps {
    forecast: ForecastInfo | undefined;
    isLoading: boolean;
    formatCurrency: (amount: number) => string;
    onShowDetails: () => void;
}

export const AIForecast: React.FC<AIForecastProps> = memo(({
    forecast,
    isLoading,
    formatCurrency,
    onShowDetails
}) => {
    if (isLoading) {
        return (
            <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2.5rem] relative overflow-hidden animate-pulse h-[160px]">
                <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-white/[0.05]" />
                    <div className="h-3 w-32 bg-white/[0.05] rounded" />
                </div>
                <div className="mt-4 space-y-3">
                    <div className="h-8 w-40 bg-white/[0.05] rounded" />
                    <div className="h-3 w-60 bg-white/[0.05] rounded" />
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onShowDetails}
            className={`bg-gradient-to-r ${forecast?.confidence === 'low' ? 'from-amber-600/10 via-orange-600/10' : 'from-cyan-600/10 via-purple-600/10'} to-transparent border border-white/[0.05] p-6 rounded-[2.5rem] relative overflow-hidden group cursor-pointer active:scale-95 transition-all`}
        >
            <div className="absolute right-6 top-6 animate-pulse text-cyan-400/20">
                <Sparkles size={40} />
            </div>
            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full ${forecast?.confidence === 'low' ? 'bg-amber-400/10 text-amber-400' : 'bg-cyan-400/10 text-cyan-400'} flex items-center justify-center`}>
                        <Activity size={14} />
                    </div>
                    <h2 className="text-[9px] font-black uppercase tracking-[3px] text-white/40">AI Forecast (30d)</h2>
                    {forecast?.confidence === 'low' && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ⚠ Low Data
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-2xl font-black text-white tracking-tighter">{formatCurrency(forecast?.predicted_burden_30d || 0)}</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Predicted Burden • {forecast?.time_frame}</p>
                    <p className={`text-[10px] font-medium leading-tight mt-3 max-w-[260px] ${forecast?.confidence === 'low' ? 'text-amber-200/60' : 'text-cyan-200/60'}`}>
                        {forecast?.description}
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest">Tap for breakdown</span>
                    <ArrowUpRight size={10} className="text-cyan-400" />
                </div>
            </div>
        </div>
    );
});
