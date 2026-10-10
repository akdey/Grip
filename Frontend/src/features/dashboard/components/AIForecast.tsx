import React, { memo } from 'react';
import { Sparkles, Activity, ArrowUpRight, TrendingUp } from 'lucide-react';
import { haptics } from '../../../lib/haptics';
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

    const topCategories = (forecast?.breakdown || []).slice(0, 2);

    return (
        <div
            onClick={() => {
                haptics.selection();
                onShowDetails();
            }}
            className="bg-surface-subtle border border-border-subtle hover:border-accent-border/60 p-6 rounded-[2.5rem] relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all shadow-none hover:shadow-md"
        >
            <div className="absolute right-6 top-6 text-accent-text/10 group-hover:text-accent-text/20 transition-colors pointer-events-none">
                <Sparkles size={48} />
            </div>

            <div className="relative z-10 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent-subtle text-accent-text flex items-center justify-center border border-accent-border/40 shadow-inner">
                            <Activity size={13} />
                        </div>
                        <h2 className="text-[9px] font-black uppercase tracking-[3px] text-text-muted">
                            Forecast Intelligence
                        </h2>
                    </div>

                    {forecast?.confidence === 'low' ? (
                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            ⚠ Low Data
                        </span>
                    ) : (
                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-subtle text-accent-text border border-accent-border">
                            ML Model
                        </span>
                    )}
                </div>

                <div>
                    <p className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                        {formatCurrency(forecast?.predicted_burden_30d || 0)}
                    </p>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1">
                        Predicted Burden • {forecast?.time_frame || 'Next 30 Days'}
                    </p>
                    {forecast?.description && (
                        <p className="text-[10.5px] font-medium leading-relaxed mt-2.5 max-w-[280px] text-text-secondary line-clamp-2">
                            "{forecast.description}"
                        </p>
                    )}
                </div>

                {topCategories.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {topCategories.map((c, i) => (
                            <span
                                key={i}
                                className="text-[8px] font-bold px-2 py-0.5 rounded-md bg-surface border border-border-subtle text-text-muted uppercase tracking-wider"
                            >
                                {c.category}: {formatCurrency(c.predicted_amount)}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-1.5 mt-1 text-text-muted group-hover:text-accent-text transition-colors">
                    <span className="text-[8.5px] font-bold uppercase tracking-wider">
                        Explore Detailed Breakdown
                    </span>
                    <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
            </div>
        </div>
    );
});
