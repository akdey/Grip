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
            <div className="bg-surface-subtle border border-border-subtle p-6 rounded-[2.5rem] relative overflow-hidden animate-pulse h-[160px]">
                <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-surface-pill" />
                    <div className="h-3 w-32 bg-surface-pill rounded" />
                </div>
                <div className="mt-4 space-y-3">
                    <div className="h-8 w-40 bg-surface-pill rounded" />
                    <div className="h-3 w-60 bg-surface-pill rounded" />
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onShowDetails}
            className="bg-surface-subtle border border-border-subtle hover:border-accent-border p-6 rounded-[2.5rem] relative overflow-hidden group cursor-pointer active:scale-95 transition-all"
        >
            <div className="absolute right-6 top-6 text-accent-text/10">
                <Sparkles size={40} />
            </div>
            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent-subtle text-accent-text flex items-center justify-center">
                        <Activity size={14} />
                    </div>
                    <h2 className="text-[9px] font-black uppercase tracking-[3px] text-text-muted">Next Month Forecast</h2>
                    {forecast?.confidence === 'low' && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-status-warning-bg text-status-warning-text border border-status-warning-border">
                            ⚠ Low Data
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(forecast?.predicted_burden_30d || 0)}</p>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1">Predicted Burden • {forecast?.time_frame}</p>
                    <p className="text-[10px] font-medium leading-tight mt-3 max-w-[260px] text-text-secondary">
                        {forecast?.description}
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-bold text-text-muted group-hover:text-accent-text uppercase tracking-widest transition-colors">Tap for breakdown</span>
                    <ArrowUpRight size={10} className="text-text-muted group-hover:text-accent-text transition-colors" />
                </div>
            </div>
        </div>
    );
});
