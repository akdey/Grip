import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, Calendar, TrendingUp, AlertCircle, CheckCircle, Wallet, Edit3, RefreshCw, Loader2, Sparkles, X } from 'lucide-react';
import { useGoals, useCreateGoal, useDeleteGoal, useCheckFeasibility } from '../features/goals/goalHooks';
import { Loader } from '../components/ui/Loader';
import { formatCurrency } from '../lib/formatters';
import { haptics } from '../lib/haptics';

interface GoalsProps {
    embedded?: boolean;
}

const Goals: React.FC<GoalsProps> = ({ embedded = false }) => {
    const { data: goals, isLoading } = useGoals();
    const createGoalMutation = useCreateGoal();
    const deleteGoalMutation = useDeleteGoal();
    const checkFeasibilityMutation = useCheckFeasibility();

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        target_amount: '',
        target_date: '',
    });
    const [feasibility, setFeasibility] = useState<any>(null);
    const [feasibilityError, setFeasibilityError] = useState<string | null>(null);
    const [customIncome, setCustomIncome] = useState<string>('');
    const [isEditingIncome, setIsEditingIncome] = useState(false);

    const handleCheckFeasibility = async (overrideIncome?: number) => {
        if (!formData.name.trim() || !formData.target_amount || !formData.target_date) return;
        haptics.selection();
        setFeasibilityError(null);

        const incomeToUse = overrideIncome !== undefined ? overrideIncome : (customIncome ? parseFloat(customIncome) : undefined);
        try {
            const result = await checkFeasibilityMutation.mutateAsync({
                name: formData.name.trim(),
                target_amount: parseFloat(formData.target_amount),
                target_date: formData.target_date,
                custom_expected_income: incomeToUse,
            });
            setFeasibility(result);
            if (result.detected_income && !customIncome && overrideIncome === undefined) {
                setCustomIncome(result.detected_income.toString());
            }
        } catch (err: any) {
            console.error('Feasibility check failed:', err);
            setFeasibilityError(err?.response?.data?.detail || err?.message || 'Unable to evaluate feasibility. Please check your inputs and try again.');
        }
    };

    const handleCreateGoal = async () => {
        if (!formData.name.trim() || !formData.target_amount || !formData.target_date) return;
        haptics.selection();

        try {
            await createGoalMutation.mutateAsync({
                name: formData.name.trim(),
                target_amount: parseFloat(formData.target_amount),
                target_date: formData.target_date,
                custom_expected_income: customIncome ? parseFloat(customIncome) : undefined,
            });

            setFormData({ name: '', target_amount: '', target_date: '' });
            setCustomIncome('');
            setIsEditingIncome(false);
            setFeasibility(null);
            setFeasibilityError(null);
            setShowForm(false);
        } catch (err: any) {
            console.error('Goal creation failed:', err);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className={embedded ? "py-16 flex items-center justify-center" : "min-h-screen bg-page flex items-center justify-center"}>
                <Loader />
            </div>
        );
    }

    const content = (
        <div className={embedded ? "space-y-4" : "px-4 py-4 space-y-4 max-w-4xl mx-auto"}>
            {/* Embedded Action Bar */}
            {embedded && (
                <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border-subtle">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent-subtle flex items-center justify-center border border-accent-border text-accent-text">
                            <Target size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-tight text-text-primary">Financial Goals</h2>
                            <p className="text-[10px] text-text-muted font-bold">Dual-Bucket Pacing & Surplus Allocation</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            haptics.selection();
                            setShowForm(!showForm);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-primary text-text-inverse font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-all active:scale-95 shadow-sm touch-manipulation"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>{showForm ? 'Close' : 'New Goal'}</span>
                    </button>
                </div>
            )}

            {/* Create Goal Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-surface border border-border-subtle rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-accent-text" />
                                    <h3 className="text-xs font-black uppercase tracking-[2px] text-text-primary">New Financial Target</h3>
                                </div>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setShowForm(false);
                                    }}
                                    className="w-8 h-8 rounded-full bg-surface-subtle hover:bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Inputs with Proper Labels & Affordance */}
                            <div className="space-y-4">
                                {/* Goal Title */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                                        Goal Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Carpenting, Goa Vacation, MacBook Pro"
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData({ ...formData, name: e.target.value });
                                            setFeasibility(null);
                                        }}
                                        className="w-full bg-surface-subtle border border-border-default rounded-2xl px-4 py-3 text-sm font-semibold text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-border-focus transition-all"
                                    />
                                </div>

                                {/* Target Amount & Target Date Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                                            Target Amount (₹)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
                                                ₹
                                            </span>
                                            <input
                                                type="number"
                                                step="any"
                                                min="1"
                                                placeholder="60,000"
                                                value={formData.target_amount}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, target_amount: e.target.value });
                                                    setFeasibility(null);
                                                }}
                                                className="w-full bg-surface-subtle border border-border-default rounded-2xl pl-8 pr-4 py-3 text-sm font-black text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-border-focus tabular-nums transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                                            Target Date
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={formData.target_date}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, target_date: e.target.value });
                                                    setFeasibility(null);
                                                }}
                                                className="w-full bg-surface-subtle border border-border-default rounded-2xl px-4 py-3 text-sm font-semibold text-text-primary focus:outline-none focus:border-border-focus transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feasibility Error Banner */}
                            {feasibilityError && (
                                <div className="p-3.5 rounded-2xl bg-status-danger-bg border border-status-danger-border flex items-start gap-2.5 text-xs text-status-danger-text">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <p className="font-semibold">{feasibilityError}</p>
                                </div>
                            )}

                            {/* Feasibility Result Box */}
                            {feasibility && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-4 rounded-2xl border ${feasibility.is_feasible
                                            ? 'bg-status-success-bg/40 border-status-success-border'
                                            : 'bg-status-warning-bg/40 border-status-warning-border'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {feasibility.is_feasible ? (
                                            <CheckCircle size={18} className="text-status-success mt-0.5 shrink-0" />
                                        ) : (
                                            <AlertCircle size={18} className="text-status-warning mt-0.5 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-text-primary mb-3 leading-relaxed font-medium">
                                                {feasibility.message}
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] mb-3">
                                                <div className="bg-surface/80 rounded-xl p-2.5 border border-border-subtle">
                                                    <span className="text-text-muted block font-semibold">Cash in Hand</span>
                                                    <span className="text-text-primary font-black text-xs tabular-nums">
                                                        {formatCurrency(feasibility.available_monthly_liquidity)}
                                                    </span>
                                                </div>
                                                <div className="bg-surface/80 rounded-xl p-2.5 border border-border-subtle">
                                                    <span className="text-text-muted block font-semibold">Freeze Now</span>
                                                    <span className="text-text-primary font-black text-xs tabular-nums">
                                                        {formatCurrency(feasibility.current_cycle_freeze ?? feasibility.required_monthly_savings)}
                                                    </span>
                                                </div>
                                                <div className="bg-surface/80 rounded-xl p-2.5 border border-border-subtle">
                                                    <span className="text-text-muted block font-semibold">Projected Capacity</span>
                                                    <span className="text-text-primary font-black text-xs tabular-nums">
                                                        {formatCurrency(feasibility.projected_total_savings ?? 0)}
                                                    </span>
                                                </div>
                                                <div className="bg-surface/80 rounded-xl p-2.5 border border-border-subtle">
                                                    <span className="text-text-muted block font-semibold">Cushion Left</span>
                                                    <span className="text-text-primary font-black text-xs tabular-nums">
                                                        {formatCurrency(Math.max(0, feasibility.available_monthly_liquidity - (feasibility.current_cycle_freeze ?? 0)))}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expected Income Override Widget */}
                                            <div className="pt-2.5 border-t border-border-subtle/70 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-text-muted font-medium flex items-center gap-1.5">
                                                        <Wallet size={13} className="text-text-primary/70" />
                                                        Expected Monthly Income:
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingIncome(!isEditingIncome)}
                                                        className="text-[11px] text-accent-text font-bold hover:underline"
                                                    >
                                                        {isEditingIncome ? 'Done' : 'Adjust'}
                                                    </button>
                                                </div>

                                                {isEditingIncome ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative flex-1">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">₹</span>
                                                            <input
                                                                type="number"
                                                                value={customIncome}
                                                                placeholder={(feasibility.detected_income || 0).toString()}
                                                                onChange={(e) => setCustomIncome(e.target.value)}
                                                                className="w-full bg-surface border border-border-subtle rounded-xl pl-7 pr-3 py-1.5 text-xs text-text-primary font-bold focus:outline-none focus:border-border-default tabular-nums"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCheckFeasibility(customIncome ? parseFloat(customIncome) : undefined)}
                                                            className="px-3.5 py-1.5 rounded-xl bg-primary text-text-inverse text-xs font-bold active:scale-95 transition-all shadow-xs"
                                                        >
                                                            Recalculate
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-surface/80 rounded-xl p-2.5 border border-border-subtle text-xs">
                                                        <span className="text-text-primary font-black tabular-nums">
                                                            {formatCurrency(customIncome ? parseFloat(customIncome) : (feasibility.detected_income || 0))}
                                                        </span>
                                                        <span className="text-[10px] text-text-muted font-medium">
                                                            {feasibility.salary_cycles_count ? `${feasibility.salary_cycles_count} payday(s) before target` : 'Before next payday'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Form Action Buttons */}
                            <div className="flex gap-2.5 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleCheckFeasibility()}
                                    disabled={!formData.name.trim() || !formData.target_amount || !formData.target_date || checkFeasibilityMutation.isPending}
                                    className="flex-1 py-3 rounded-2xl bg-surface-pill hover:bg-surface-hover border border-border-subtle text-xs font-bold text-text-primary uppercase tracking-wide transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation"
                                >
                                    {checkFeasibilityMutation.isPending ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Analyzing...</span>
                                        </>
                                    ) : (
                                        <span>Check Feasibility</span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateGoal}
                                    disabled={!feasibility?.is_feasible || createGoalMutation.isPending}
                                    className="flex-1 py-3 rounded-2xl bg-primary text-text-inverse text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md flex items-center justify-center gap-1.5 touch-manipulation"
                                >
                                    {createGoalMutation.isPending ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <span>Create Goal</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Goals List */}
            {goals && goals.length > 0 ? (
                <div className="space-y-3">
                    {goals.map((goal) => (
                        <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-surface border border-border-subtle rounded-3xl p-5 hover:border-border-default transition-all shadow-xs"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0 pr-3">
                                    <h3 className="text-base font-bold text-text-primary mb-1 truncate">{goal.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <Calendar size={13} />
                                        <span>Target: {formatDate(goal.target_date)}</span>
                                        {(() => {
                                            const daysLeft = Math.ceil((new Date(goal.target_date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
                                            return (
                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-pill border border-border-subtle font-semibold text-text-secondary tabular-nums">
                                                    {daysLeft > 0 ? `${daysLeft}d left` : 'Due today'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        deleteGoalMutation.mutate(goal.id);
                                    }}
                                    className="w-9 h-9 rounded-2xl bg-surface-subtle hover:bg-status-danger-bg border border-border-subtle hover:border-status-danger-border flex items-center justify-center transition-all text-text-muted hover:text-status-danger-text active:scale-90"
                                    aria-label="Delete goal"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="bg-surface-subtle rounded-2xl p-3 border border-border-subtle">
                                    <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1 font-semibold">Target</p>
                                    <p className="text-base sm:text-lg font-black text-text-primary tabular-nums">{formatCurrency(goal.target_amount)}</p>
                                </div>
                                <div className="bg-accent-subtle rounded-2xl p-3 border border-accent-border">
                                    <p className="text-[10px] text-accent-text uppercase tracking-widest mb-1 font-bold">Current Freeze</p>
                                    <p className="text-base sm:text-lg font-black text-text-primary tabular-nums">{formatCurrency(goal.monthly_contribution)}</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-2 bg-surface-pill rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (goal.current_saved / goal.target_amount) * 100)}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="absolute inset-y-0 left-0 bg-accent rounded-full"
                                />
                            </div>
                            <p className="text-[10px] text-text-muted mt-2 text-right font-medium tabular-nums">
                                {formatCurrency(goal.current_saved)} / {formatCurrency(goal.target_amount)}
                            </p>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-surface-subtle/40 border border-dashed border-border-subtle rounded-3xl p-6">
                    <div className="w-14 h-14 rounded-2xl bg-surface-pill border border-border-subtle flex items-center justify-center mx-auto mb-3 text-text-muted">
                        <Target size={24} />
                    </div>
                    <p className="text-sm font-bold text-text-primary">No goals yet</p>
                    <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                        Create your first financial target to automatically budget and freeze funds across your salary cycles.
                    </p>
                    {!showForm && (
                        <button
                            onClick={() => {
                                haptics.selection();
                                setShowForm(true);
                            }}
                            className="mt-4 px-4 py-2 rounded-full bg-primary text-text-inverse text-xs font-bold flex items-center gap-1.5 mx-auto active:scale-95 transition-all shadow-xs"
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            <span>Create Goal</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="min-h-screen text-text-primary pb-32 pb-safe">
            <header className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-border-subtle sticky top-0 bg-page/85 backdrop-blur-2xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-primary">
                        <Target size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-text-primary heading-apple">Goals</h1>
                        <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Financial Targets & Pacing</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        haptics.selection();
                        setShowForm(!showForm);
                    }}
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${showForm
                            ? 'bg-primary text-text-inverse border-transparent shadow-sm'
                            : 'bg-surface-subtle hover:bg-surface border-border-subtle text-text-muted hover:text-text-primary'
                        }`}
                    aria-label="Toggle new goal form"
                >
                    <Plus size={18} className={`transition-transform duration-200 ${showForm ? 'rotate-45' : ''}`} />
                </button>
            </header>
            {content}
        </div>
    );
};

export default Goals;
