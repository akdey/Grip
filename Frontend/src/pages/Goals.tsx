import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, Calendar, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useGoals, useCreateGoal, useDeleteGoal, useCheckFeasibility } from '../features/goals/goalHooks';
import { Loader } from '../components/ui/Loader';

const Goals: React.FC = () => {
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

    const handleCheckFeasibility = async () => {
        if (!formData.name || !formData.target_amount || !formData.target_date) return;

        const result = await checkFeasibilityMutation.mutateAsync({
            name: formData.name,
            target_amount: parseFloat(formData.target_amount),
            target_date: formData.target_date,
        });
        setFeasibility(result);
    };

    const handleCreateGoal = async () => {
        if (!formData.name || !formData.target_amount || !formData.target_date) return;

        await createGoalMutation.mutateAsync({
            name: formData.name,
            target_amount: parseFloat(formData.target_amount),
            target_date: formData.target_date,
        });

        setFormData({ name: '', target_amount: '', target_date: '' });
        setFeasibility(null);
        setShowForm(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-page flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    return (
        <div className="min-h-screen text-primary pb-24">
            {/* Header */}
            <header className="px-4 py-6 flex items-center justify-between border-b border-border-subtle sticky top-0 bg-page/80 backdrop-blur-3xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center border border-accent-border text-accent-text">
                        <Target size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight text-primary heading-apple">Goals</h1>
                        <p className="text-[9px] text-text-muted uppercase tracking-widest font-bold">Financial Targets</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-10 h-10 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center hover:bg-surface-hover text-text-muted hover:text-primary transition-all active:scale-95"
                >
                    <Plus size={18} />
                </button>
            </header>

            <div className="px-4 py-6 space-y-4">
                {/* Create Goal Form */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-4 space-y-4">
                                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide">New Goal</h3>

                                <input
                                    type="text"
                                    placeholder="Goal name (e.g., Trip to Goa)"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 text-sm text-primary placeholder-text-muted/50 focus:outline-none focus:border-border-default"
                                />

                                <input
                                    type="number"
                                    placeholder="Target amount (₹)"
                                    value={formData.target_amount}
                                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                                    className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 text-sm text-primary placeholder-text-muted/50 focus:outline-none focus:border-border-default"
                                />

                                <input
                                    type="date"
                                    value={formData.target_date}
                                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                                    className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-border-default"
                                />

                                {/* Feasibility Check */}
                                {feasibility && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 rounded-xl border ${feasibility.is_feasible
                                            ? 'bg-emerald-500/10 border-emerald-500/20'
                                            : 'bg-amber-500/10 border-amber-500/20'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {feasibility.is_feasible ? (
                                                <CheckCircle size={18} className="text-emerald-400 mt-0.5" />
                                            ) : (
                                                <AlertCircle size={18} className="text-amber-400 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <p className="text-xs text-text-secondary mb-2">{feasibility.message}</p>
                                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                    <div>
                                                        <span className="text-text-muted block">Required/Month</span>
                                                        <span className="text-primary font-bold">{formatCurrency(feasibility.required_monthly_savings)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-text-muted block">Available Capacity</span>
                                                        <span className="text-primary font-bold">{formatCurrency(feasibility.available_monthly_liquidity)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCheckFeasibility}
                                        disabled={!formData.name || !formData.target_amount || !formData.target_date}
                                        className="flex-1 py-3 rounded-xl bg-surface border border-border-subtle text-xs font-bold text-text-muted uppercase tracking-wide hover:text-primary transition-all disabled:opacity-50"
                                    >
                                        Check Feasibility
                                    </button>
                                    <button
                                        onClick={handleCreateGoal}
                                        disabled={!feasibility?.is_feasible}
                                        className="flex-1 py-3 rounded-xl bg-primary text-background text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50 active:scale-95 shadow-md"
                                    >
                                        Create Goal
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
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-surface-subtle border border-border-subtle rounded-2xl p-4 hover:bg-surface-hover transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-primary mb-1">{goal.name}</h3>
                                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                            <Calendar size={12} />
                                            <span>Target: {formatDate(goal.target_date)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteGoalMutation.mutate(goal.id)}
                                        className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="bg-surface rounded-xl p-3 border border-border-subtle">
                                        <p className="text-[9px] text-text-muted uppercase tracking-widest mb-1">Target</p>
                                        <p className="text-base font-black text-primary">{formatCurrency(goal.target_amount)}</p>
                                    </div>
                                    <div className="bg-accent-subtle rounded-xl p-3 border border-accent-border">
                                        <p className="text-[9px] text-accent-text uppercase tracking-widest mb-1 font-bold">Monthly</p>
                                        <p className="text-base font-black text-primary">{formatCurrency(goal.monthly_contribution)}</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative h-2 bg-border-subtle rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(goal.current_saved / goal.target_amount) * 100}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="absolute inset-y-0 left-0 bg-accent rounded-full"
                                    />
                                </div>
                                <p className="text-[9px] text-text-muted mt-2 text-right">
                                    {formatCurrency(goal.current_saved)} / {formatCurrency(goal.target_amount)}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-accent-subtle border border-accent-border flex items-center justify-center mx-auto mb-4 text-accent-text">
                            <Target size={28} />
                        </div>
                        <p className="text-sm text-text-muted">No goals yet</p>
                        <p className="text-xs text-text-muted/60 mt-1">Create your first financial goal</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Goals;
