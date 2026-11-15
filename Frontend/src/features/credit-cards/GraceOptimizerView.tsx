import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    Calendar,
    AlertCircle,
    ArrowRight,
    ShieldAlert,
    RotateCcw,
    Clock,
    Sparkles,
    CheckCircle2
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

    const formatShortDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="py-20 flex items-center justify-center">
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
    const otherCards = cards.filter(c => c.card_id !== recommended?.card_id);

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
                    className="px-4 py-2.5 rounded-xl bg-accent-subtle text-accent-text border border-accent-border font-semibold text-xs inline-flex items-center gap-2 hover:bg-surface-hover active:scale-95 transition-all"
                >
                    <span>Configure Cards in Vault</span>
                    <ArrowRight size={14} />
                </button>
            </div>
        );
    }

    const isCycleClosingSoon = recommended && recommended.days_until_statement <= 1;

    return (
        <div className="space-y-5">
            {/* Date Simulator Pill Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-border-subtle">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-text-muted ml-1" />
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                        Purchase Date:
                    </span>
                    <input
                        type="date"
                        value={simulatedDate}
                        onChange={(e) => {
                            setSimulatedDate(e.target.value);
                            haptics.selection();
                        }}
                        className="bg-surface-subtle border border-border-subtle rounded-lg px-2 py-1 text-xs text-text-primary font-semibold focus:outline-none cursor-pointer"
                    />
                </div>

                {isSimulating && (
                    <button
                        onClick={() => {
                            setSimulatedDate(todayStr);
                            haptics.impact();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface-subtle border border-border-subtle text-[10px] font-semibold text-accent-text flex items-center gap-1 hover:bg-surface-hover transition-colors"
                    >
                        <RotateCcw size={11} />
                        <span>Reset to Today</span>
                    </button>
                )}
            </div>

            {/* Recommended Card Hero Banner */}
            {recommended && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-surface rounded-[2rem] border border-border-subtle shadow-sm space-y-5 relative overflow-hidden"
                >
                    {/* Top Row: Card Identity & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md badge-neutral text-[10px] font-semibold uppercase tracking-wider">
                                    ★ Top Card
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(recommended.status_label)}`}>
                                    {recommended.status_label}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-text-primary tracking-tight flex items-baseline gap-2 pt-1">
                                <span>{recommended.card_name}</span>
                                {recommended.last_four_digits && (
                                    <span className="text-xs font-normal text-text-muted">
                                        •••• {recommended.last_four_digits}
                                    </span>
                                )}
                            </h2>
                        </div>

                        {/* Large Float Days Pill */}
                        <div className="text-right shrink-0">
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-4xl sm:text-5xl font-black text-text-primary tabular-nums tracking-tighter">
                                    {recommended.grace_days}
                                </span>
                                <span className="text-sm font-semibold text-text-muted">days</span>
                            </div>
                            <span className="text-[10px] font-semibold text-text-muted block">
                                0% Interest Float
                            </span>
                        </div>
                    </div>

                    {/* Cycle Timeline Stepper */}
                    <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                            <span>Purchase</span>
                            <span>Statement Close</span>
                            <span>Payment Due</span>
                        </div>

                        {/* Timeline Track */}
                        <div className="relative flex items-center justify-between">
                            <div className="absolute left-2 right-2 h-0.5 bg-border-subtle" />
                            <div className="w-4 h-4 rounded-full bg-accent border-2 border-surface z-10" />
                            <div className={`w-4 h-4 rounded-full z-10 border-2 border-surface ${
                                isCycleClosingSoon ? 'bg-status-warning' : 'bg-surface-pill border-border-subtle'
                            }`} />
                            <div className="w-4 h-4 rounded-full bg-status-success border-2 border-surface z-10" />
                        </div>

                        <div className="flex items-center justify-between text-xs font-semibold text-text-primary pt-0.5">
                            <div>
                                <p>{formatShortDate(data?.reference_date || todayStr)}</p>
                                <span className="text-[10px] text-text-muted font-normal">
                                    {isSimulating ? 'Simulated' : 'Today'}
                                </span>
                            </div>
                            <div className="text-center">
                                <p>{formatShortDate(recommended.next_statement_date)}</p>
                                <span className="text-[10px] text-text-muted font-normal">
                                    {recommended.days_until_statement === 0 ? 'Closes Today' : `in ${recommended.days_until_statement}d`}
                                </span>
                            </div>
                            <div className="text-right">
                                <p>{formatShortDate(recommended.payment_due_date_resolved)}</p>
                                <span className="text-[10px] text-text-muted font-normal">
                                    in {recommended.grace_days}d
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Strategic Advice Callout */}
                    {isCycleClosingSoon ? (
                        <div className="p-3.5 rounded-2xl bg-surface-subtle border border-status-warning-border flex items-start gap-3">
                            <Clock size={16} className="text-status-warning shrink-0 mt-0.5" />
                            <div className="text-xs space-y-0.5">
                                <span className="font-semibold text-text-primary block">
                                    Statement Cycle Ending
                                </span>
                                <p className="text-text-muted leading-relaxed">
                                    This purchase will be billed immediately. Swiping tomorrow (after the new statement generates) will rollover your purchase into the next cycle for <span className="font-semibold text-text-primary">~50 days float</span>!
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start gap-3">
                            <Sparkles size={16} className="text-accent-text shrink-0 mt-0.5" />
                            <div className="text-xs space-y-0.5">
                                <span className="font-semibold text-text-primary block">
                                    Optimal Float Window
                                </span>
                                <p className="text-text-muted leading-relaxed">
                                    Zero-interest capital active until <span className="font-semibold text-text-primary">{formatDate(recommended.payment_due_date_resolved)}</span>.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Credit Limit & Utilization */}
                    {recommended.credit_limit && (
                        <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                                    Limit Utilization:
                                </span>
                                <span className="font-semibold text-text-primary tabular-nums">
                                    {formatCurrency(recommended.unbilled_amount)} / {formatCurrency(recommended.credit_limit)}
                                </span>
                                <span className={`text-[10px] font-semibold ${
                                    recommended.utilization_percentage && recommended.utilization_percentage > 30
                                        ? 'text-status-warning'
                                        : 'text-status-success'
                                }`}>
                                    ({recommended.utilization_percentage || 0}%)
                                </span>
                            </div>

                            <div className="w-full sm:w-44 h-1.5 bg-surface-subtle rounded-full overflow-hidden border border-border-subtle">
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

            {/* Other Registered Cards */}
            {otherCards.length > 0 && (
                <div className="space-y-3 pt-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted px-1">
                        Other Cards in Vault
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {otherCards.map((card, idx) => (
                            <div
                                key={card.card_id}
                                className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                                            <span>{card.card_name}</span>
                                            {card.last_four_digits && (
                                                <span className="text-[10px] text-text-muted">
                                                    •••• {card.last_four_digits}
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-[10px] text-text-muted mt-0.5">
                                            Statement: {card.statement_date}th • Due: {card.payment_due_date}th
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="text-base font-bold text-text-primary tabular-nums">
                                            {card.grace_days} <span className="text-[10px] font-normal text-text-muted">days</span>
                                        </span>
                                        <span className={`block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${getStatusBadge(card.status_label)}`}>
                                            {card.status_label}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                                    <span className="text-[10px] text-text-muted">
                                        Due {formatShortDate(card.payment_due_date_resolved)}
                                    </span>
                                    <span className="font-semibold text-text-primary tabular-nums text-[10px]">
                                        Unbilled: {formatCurrency(card.unbilled_amount)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
