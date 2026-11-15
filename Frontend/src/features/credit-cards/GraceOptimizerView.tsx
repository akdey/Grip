import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    Calendar,
    Sparkles,
    AlertCircle,
    ArrowRight,
    ShieldAlert,
    RotateCcw
} from 'lucide-react';
import { useCreditCardGraceOptimizer } from './hooks';
import { formatCurrency } from '../../lib/formatters';
import { Loader } from '../../components/ui/Loader';
import { haptics } from '../../lib/haptics';
import { useNavigate } from 'react-router-dom';

export const GraceOptimizerView: React.FC = () => {
    const navigate = useNavigate();
    const todayStr = new Date().toISOString().split('T')[0];
    const [simulatedDate, setSimulatedDate] = useState<string>(todayStr);

    const isSimulating = simulatedDate !== todayStr;
    const { data, isLoading, error } = useCreditCardGraceOptimizer(isSimulating ? simulatedDate : undefined);

    const getStatusBadge = (statusLabel: string) => {
        switch (statusLabel) {
            case 'Optimal Float':
                return 'badge-success';
            case 'High Utilization':
                return 'badge-danger';
            case 'Cycle Ending Soon':
                return 'badge-warning';
            default:
                return 'badge-neutral';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="py-16 flex items-center justify-center">
                <Loader text="Evaluating Billing Cycles..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-surface rounded-2xl border border-status-danger-border text-center">
                <AlertCircle className="w-8 h-8 text-status-danger-text mx-auto mb-2" />
                <p className="text-sm font-semibold text-text-primary">Unable to load Grace Period calculations</p>
                <p className="text-xs text-text-muted mt-1">Please try again or check your credit cards in the Vault.</p>
            </div>
        );
    }

    const cards = data?.cards || [];
    const recommended = data?.recommended_card;

    if (cards.length === 0) {
        return (
            <div className="p-8 bg-surface rounded-3xl border border-border-subtle text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center mx-auto text-text-muted">
                    <CreditCard size={24} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-semibold text-text-primary">No Active Credit Cards</h3>
                    <p className="text-xs text-text-muted max-w-sm mx-auto">
                        Add your credit cards with statement and payment due dates in Vault to unlock interest-free float optimization.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/credit-cards')}
                    className="px-4 py-2.5 rounded-xl bg-accent text-accent-text font-semibold text-xs inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                >
                    <span>Configure Cards in Vault</span>
                    <ArrowRight size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Control & Date Simulation Bar */}
            <div className="p-4 bg-surface rounded-2xl border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center border border-accent-border text-accent-text shrink-0">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-tight text-text-primary">Swipe Decision Engine</h2>
                        <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                            Maximize 45–52 Day Interest-Free Capital
                        </p>
                    </div>
                </div>

                {/* Date Simulator Picker */}
                <div className="flex items-center gap-2 self-start sm:self-auto bg-surface-subtle p-1.5 rounded-xl border border-border-subtle">
                    <Calendar size={14} className="text-text-muted ml-2 shrink-0" />
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Swipe Date:</span>
                    <input
                        type="date"
                        value={simulatedDate}
                        onChange={(e) => {
                            setSimulatedDate(e.target.value);
                            haptics.selection();
                        }}
                        className="bg-transparent text-xs text-text-primary font-semibold focus:outline-none cursor-pointer pr-2"
                    />
                    {isSimulating && (
                        <button
                            onClick={() => {
                                setSimulatedDate(todayStr);
                                haptics.impact();
                            }}
                            className="px-2 py-1 rounded-lg bg-surface border border-border-subtle text-[10px] font-semibold text-accent-text flex items-center gap-1 hover:bg-surface-hover transition-colors"
                            title="Reset to today"
                        >
                            <RotateCcw size={10} />
                            <span>Today</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Recommended Card Hero Banner */}
            {recommended && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-surface rounded-3xl border border-accent-border shadow-sm relative overflow-hidden"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-full bg-accent text-accent-text text-[10px] font-semibold uppercase tracking-wider shadow-xs">
                                    Top Recommendation
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(recommended.status_label)}`}>
                                    {recommended.status_label}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-2xl font-bold text-text-primary tracking-tight">
                                    {recommended.card_name}
                                    {recommended.last_four_digits && (
                                        <span className="text-sm font-normal text-text-muted ml-2">
                                            •••• {recommended.last_four_digits}
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-text-muted mt-1">{data?.insight}</p>
                            </div>

                            {/* Timeline Stepper */}
                            <div className="pt-2 grid grid-cols-3 gap-2 max-w-lg">
                                <div className="p-2.5 bg-surface-subtle rounded-xl border border-border-subtle">
                                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Purchase</p>
                                    <p className="text-xs font-semibold text-text-primary mt-0.5">
                                        {formatDate(data?.reference_date || todayStr)}
                                    </p>
                                </div>
                                <div className="p-2.5 bg-surface-subtle rounded-xl border border-border-subtle">
                                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Statement Date</p>
                                    <p className="text-xs font-semibold text-text-primary mt-0.5">
                                        {formatDate(recommended.next_statement_date)}
                                    </p>
                                    <span className="text-[10px] text-text-muted">in {recommended.days_until_statement}d</span>
                                </div>
                                <div className="p-2.5 bg-accent-subtle rounded-xl border border-accent-border">
                                    <p className="text-[10px] font-semibold text-accent-text uppercase tracking-wider">Payment Due</p>
                                    <p className="text-xs font-semibold text-text-primary mt-0.5">
                                        {formatDate(recommended.payment_due_date_resolved)}
                                    </p>
                                    <span className="text-[10px] text-accent-text font-semibold">in {recommended.grace_days}d</span>
                                </div>
                            </div>
                        </div>

                        {/* Grace Period Metric Display */}
                        <div className="flex md:flex-col items-center justify-between md:items-end gap-2 bg-surface-subtle md:bg-transparent p-4 md:p-0 rounded-2xl border md:border-0 border-border-subtle">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Interest-Free Float</span>
                            <div className="text-right">
                                <span className="text-4xl md:text-5xl font-bold text-text-primary tabular-nums tracking-tighter">
                                    {recommended.grace_days}
                                </span>
                                <span className="text-base font-medium text-text-muted ml-1.5">days</span>
                            </div>
                            <span className="text-xs font-semibold text-status-success">
                                0% interest until {formatDate(recommended.payment_due_date_resolved)}
                            </span>
                        </div>
                    </div>

                    {/* Utilization Bar */}
                    {recommended.credit_limit && (
                        <div className="mt-5 pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Limit Utilization:</span>
                                <span className="font-semibold text-text-primary tabular-nums">
                                    {formatCurrency(recommended.unbilled_amount)} / {formatCurrency(recommended.credit_limit)}
                                </span>
                                <span className={`text-[10px] font-semibold ${recommended.utilization_percentage && recommended.utilization_percentage > 30 ? 'text-status-warning' : 'text-status-success'}`}>
                                    ({recommended.utilization_percentage || 0}%)
                                </span>
                            </div>
                            <div className="w-full sm:w-48 h-1.5 bg-surface-subtle rounded-full overflow-hidden border border-border-subtle">
                                <div
                                    className={`h-full rounded-full ${
                                        recommended.utilization_percentage && recommended.utilization_percentage > 80
                                            ? 'bg-status-danger'
                                            : recommended.utilization_percentage && recommended.utilization_percentage > 30
                                            ? 'bg-status-warning'
                                            : 'bg-accent'
                                    }`}
                                    style={{ width: `${Math.min(100, recommended.utilization_percentage || 0)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* All Cards Ranked Grid */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        All Registered Cards (Ranked by Float)
                    </h4>
                    <span className="text-[10px] text-text-muted font-medium">
                        {cards.length} {cards.length === 1 ? 'card' : 'cards'} available
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cards.map((card, idx) => {
                        const isTop = card.is_recommended;
                        return (
                            <motion.div
                                key={card.card_id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`p-4 rounded-2xl border transition-all ${
                                    isTop
                                        ? 'bg-surface border-accent-border shadow-xs'
                                        : 'bg-surface border-border-subtle hover:border-border-default'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                            isTop
                                                ? 'bg-accent text-accent-text'
                                                : 'bg-surface-subtle text-text-muted border border-border-subtle'
                                        }`}>
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                                                <span>{card.card_name}</span>
                                                {card.last_four_digits && (
                                                    <span className="text-[10px] text-text-muted font-normal">
                                                        ••{card.last_four_digits}
                                                    </span>
                                                )}
                                            </h5>
                                            <p className="text-[10px] text-text-muted font-medium">
                                                Statement: {card.statement_date}th • Due: {card.payment_due_date}th
                                            </p>
                                        </div>
                                    </div>

                                    {/* Float Days Badge */}
                                    <div className="text-right shrink-0">
                                        <div className="text-base font-bold text-text-primary tabular-nums">
                                            {card.grace_days} <span className="text-[10px] font-normal text-text-muted">days</span>
                                        </div>
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(card.status_label)}`}>
                                            {card.status_label}
                                        </span>
                                    </div>
                                </div>

                                {/* Warning if high utilization */}
                                {card.warning && (
                                    <div className="mt-2.5 p-2 bg-status-danger-bg border border-status-danger-border rounded-xl flex items-center gap-2 text-status-danger-text text-xs">
                                        <ShieldAlert size={14} className="shrink-0" />
                                        <span>{card.warning}</span>
                                    </div>
                                )}

                                {/* Card Details Footer */}
                                <div className="mt-3 pt-3 border-t border-border-subtle grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-text-muted">Next Due:</span>{' '}
                                        <span className="font-semibold text-text-primary">
                                            {formatDate(card.payment_due_date_resolved)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-text-muted">Unbilled:</span>{' '}
                                        <span className="font-semibold text-text-primary tabular-nums">
                                            {formatCurrency(card.unbilled_amount)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
