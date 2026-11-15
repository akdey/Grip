import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hourglass, ShieldCheck, TrendingDown, AlertTriangle, ArrowRight, Sliders, RefreshCw } from 'lucide-react';
import { useSafeToSpend, useMonthlySummary } from '../hooks';
import { formatCurrency } from '../../../lib/formatters';
import { Loader } from '../../../components/ui/Loader';
import { haptics } from '../../../lib/haptics';

export const RunwaySimulatorView: React.FC = () => {
    const { data: safeToSpend, isLoading: isSafeLoading } = useSafeToSpend();
    const { data: monthlySummary, isLoading: isSummaryLoading } = useMonthlySummary();

    // Discretionary burn slider multiplier: 100% = normal burn, 0% = hardcore survival (zero non-essentials)
    const [burnScale, setBurnScale] = useState<number>(100);

    if (isSafeLoading || isSummaryLoading) {
        return (
            <div className="py-16 flex items-center justify-center">
                <Loader text="Evaluating Liquidity Runway..." />
            </div>
        );
    }

    const currentBalance = safeToSpend?.current_balance || 0;
    const frozenFunds = safeToSpend?.frozen_funds?.total_frozen || 0;
    const monthlyExpense = monthlySummary?.current_period_expense || (frozenFunds + 20000);

    // Fixed monthly commitments (bills, sureties, cc debt)
    const fixedMonthly = Math.min(frozenFunds, monthlyExpense);
    // Variable / discretionary monthly burn
    const baseDiscretionary = Math.max(0, monthlyExpense - fixedMonthly);
    
    // Scaled discretionary burn based on user slider
    const effectiveDiscretionary = baseDiscretionary * (burnScale / 100);
    const effectiveMonthlyBurn = Math.max(500, fixedMonthly + effectiveDiscretionary);
    const dailyBurn = effectiveMonthlyBurn / 30;

    // Runway calculations
    const runwayDays = dailyBurn > 0 ? Math.floor(currentBalance / dailyBurn) : 999;
    const runwayMonths = (runwayDays / 30).toFixed(1);

    const getRunwayStatus = (days: number) => {
        if (days >= 180) return { label: 'Robust Runway (>6 Mos)', badge: 'badge-success text-status-success' };
        if (days >= 90) return { label: 'Healthy Runway (3-6 Mos)', badge: 'badge-neutral text-text-primary' };
        if (days >= 30) return { label: 'Moderate Cushion (1-3 Mos)', badge: 'badge-warning text-status-warning' };
        return { label: 'Critical Runway (<30 Days)', badge: 'badge-danger text-status-danger' };
    };

    const status = getRunwayStatus(runwayDays);

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="p-4 bg-surface rounded-2xl border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center border border-accent-border text-accent-text shrink-0">
                        <Hourglass size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tight text-primary">Zero-Income Survival Runway</h2>
                        <p className="text-[10px] text-text-muted font-bold">Cashflow stress-testing if all inflows paused today</p>
                    </div>
                </div>

                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status.badge}`}>
                    {status.label}
                </div>
            </div>

            {/* Hero Runway Metric */}
            <div className="p-6 bg-surface rounded-3xl border border-border-subtle shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Solvency Cushion</p>
                        <div className="flex items-baseline gap-3">
                            <span className="text-5xl font-black text-primary tabular-nums tracking-tighter">
                                {runwayDays > 999 ? '999+' : runwayDays}
                            </span>
                            <span className="text-xl font-bold text-text-muted">days</span>
                            <span className="text-sm font-black text-accent-text ml-2">
                                (~{runwayMonths} months)
                            </span>
                        </div>
                        <p className="text-xs text-text-muted">
                            Based on your liquid capital of <span className="font-bold text-primary">{formatCurrency(currentBalance)}</span> sustaining an effective burn rate of <span className="font-bold text-primary">{formatCurrency(effectiveMonthlyBurn)}/mo</span>.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 min-w-[240px]">
                        <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Fixed Commitments</p>
                            <p className="text-sm font-black text-primary mt-0.5">{formatCurrency(fixedMonthly)}/mo</p>
                        </div>
                        <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Discretionary Burn</p>
                            <p className="text-sm font-black text-primary mt-0.5">{formatCurrency(effectiveDiscretionary)}/mo</p>
                        </div>
                    </div>
                </div>

                {/* Interactive Discretionary Slider */}
                <div className="mt-8 pt-6 border-t border-border-subtle space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <Sliders size={14} className="text-text-muted" />
                            <span className="font-bold text-primary">Simulate Discretionary Spending Scale:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-accent-text tabular-nums">{burnScale}%</span>
                            <button
                                onClick={() => {
                                    setBurnScale(100);
                                    haptics.selection();
                                }}
                                className="text-[10px] text-text-muted hover:text-primary transition-colors flex items-center gap-1 font-semibold"
                                title="Reset to baseline"
                            >
                                <RefreshCw size={10} />
                                <span>Reset</span>
                            </button>
                        </div>
                    </div>

                    <input
                        type="range"
                        min="0"
                        max="150"
                        step="5"
                        value={burnScale}
                        onChange={(e) => {
                            setBurnScale(parseInt(e.target.value));
                            haptics.selection();
                        }}
                        className="w-full accent-accent cursor-pointer"
                    />

                    <div className="flex justify-between text-[10px] text-text-muted font-medium">
                        <span>0% (Bare essentials only)</span>
                        <span>50% (Austerity)</span>
                        <span>100% (Current lifestyle)</span>
                        <span>150% (High spend)</span>
                    </div>
                </div>
            </div>

            {/* Solvency Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-surface rounded-2xl border border-border-subtle space-y-1.5">
                    <h4 className="font-bold text-primary flex items-center gap-2">
                        <ShieldCheck size={16} className="text-status-success" />
                        <span>Fixed Obligation Wall</span>
                    </h4>
                    <p className="text-text-muted">
                        Even if discretionary spending drops to zero, your fixed bills and sureties require <span className="font-bold text-primary">{formatCurrency(fixedMonthly)}</span> monthly. Your reserves cover fixed commitments for <span className="font-bold text-primary">{fixedMonthly > 0 ? (currentBalance / fixedMonthly).toFixed(1) : '∞'} months</span>.
                    </p>
                </div>

                <div className="p-4 bg-surface rounded-2xl border border-border-subtle space-y-1.5">
                    <h4 className="font-bold text-primary flex items-center gap-2">
                        <TrendingDown size={16} className="text-accent-text" />
                        <span>Daily Living Burn</span>
                    </h4>
                    <p className="text-text-muted">
                        At your current simulated level, each calendar day consumes approximately <span className="font-bold text-primary">{formatCurrency(dailyBurn)}</span> of liquid capital to maintain operations.
                    </p>
                </div>
            </div>
        </div>
    );
};
