import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target,
    Plus,
    Trash2,
    Calendar,
    ArrowLeft,
    Wallet,
    Sparkles,
    CheckCircle,
    AlertCircle,
    Loader2,
    Clock,
    TrendingUp,
    ShieldCheck,
    X,
    ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoals, useCreateGoal, useDeleteGoal, useCheckFeasibility, type Goal } from '../features/goals/goalHooks';
import { Loader } from '../components/ui/Loader';
import { Drawer } from '../components/ui/Drawer';
import { formatCurrency } from '../lib/formatters';
import { haptics } from '../lib/haptics';
import { addMonths, addYears, addDays, endOfYear, format, differenceInCalendarDays } from 'date-fns';

interface GoalsProps {
    embedded?: boolean;
}

const Goals: React.FC<GoalsProps> = ({ embedded = false }) => {
    const navigate = useNavigate();
    const { data: goals, isLoading } = useGoals();
    const createGoalMutation = useCreateGoal();
    const deleteGoalMutation = useDeleteGoal();
    const checkFeasibilityMutation = useCheckFeasibility();

    // Drawer & Deletion states
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

    // Form State
    const [formName, setFormName] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formDate, setFormDate] = useState('');
    const [feasibility, setFeasibility] = useState<any>(null);
    const [feasibilityError, setFeasibilityError] = useState<string | null>(null);
    const [customIncome, setCustomIncome] = useState<string>('');
    const [isEditingIncome, setIsEditingIncome] = useState(false);
    const [freezePercentage, setFreezePercentage] = useState<number>(50);

    // Live computed allocation preview based on user's slider
    const allocationPreview = useMemo(() => {
        if (!feasibility) return null;
        const currentSafe = feasibility.available_monthly_liquidity || 0;
        const fraction = Math.min(1.0, Math.max(0.05, freezePercentage / 100));
        const safeCap = currentSafe * fraction;
        const salaryCycles = feasibility.salary_cycles_count || 0;
        const targetAmt = parseFloat(formAmount || '0');
        
        let freezeNow = 0;
        if (salaryCycles === 0) {
            freezeNow = Math.min(targetAmt, safeCap);
        } else {
            freezeNow = Math.min(feasibility.required_monthly_savings, safeCap);
        }
        freezeNow = Math.round(freezeNow);
        const cushionLeft = Math.max(0, currentSafe - freezeNow);
        const daysInCycle = feasibility.days_left_in_cycle || 15;
        const dailyCushion = Math.round(cushionLeft / Math.max(1, daysInCycle));
        const nextCycleNeed = salaryCycles > 0 ? Math.max(0, Math.round((targetAmt - freezeNow) / salaryCycles)) : 0;

        return {
            freezeNow,
            cushionLeft,
            dailyCushion,
            nextCycleNeed,
            salaryCycles,
            daysInCycle
        };
    }, [feasibility, freezePercentage, formAmount]);

    // Metrics Overview
    const stats = useMemo(() => {
        if (!goals || goals.length === 0) {
            return {
                totalTarget: 0,
                totalMonthlyFreeze: 0,
                totalSaved: 0,
                activeCount: 0,
                averageProgress: 0,
            };
        }

        const totals = goals.reduce(
            (acc, goal) => {
                acc.totalTarget += Number(goal.target_amount) || 0;
                acc.totalMonthlyFreeze += Number(goal.monthly_contribution) || 0;
                acc.totalSaved += Number(goal.current_saved) || 0;
                acc.activeCount += 1;
                return acc;
            },
            { totalTarget: 0, totalMonthlyFreeze: 0, totalSaved: 0, activeCount: 0 }
        );

        const averageProgress = totals.totalTarget > 0 ? Math.round((totals.totalSaved / totals.totalTarget) * 100) : 0;

        return { ...totals, averageProgress };
    }, [goals]);

    const openCreateDrawer = () => {
        haptics.selection();
        setFormName('');
        setFormAmount('');
        // Default target date: 6 months ahead
        const defaultDate = format(addMonths(new Date(), 6), 'yyyy-MM-dd');
        setFormDate(defaultDate);
        setFeasibility(null);
        setFeasibilityError(null);
        setCustomIncome('');
        setIsEditingIncome(false);
        setFreezePercentage(50);
        setIsDrawerOpen(true);
    };

    const handleCheckFeasibility = async (
        overrideIncome?: number, 
        overrideAmount?: number, 
        overrideDate?: string,
        overrideFreezePct?: number
    ) => {
        const amtToUse = overrideAmount !== undefined ? overrideAmount : parseFloat(formAmount);
        const dateToUse = overrideDate !== undefined ? overrideDate : formDate;
        const nameToUse = formName.trim() || 'New Target';
        const freezePctToUse = overrideFreezePct !== undefined ? overrideFreezePct : freezePercentage;

        if (!amtToUse || !dateToUse) {
            setFeasibilityError('Please provide both target amount and deadline to check feasibility.');
            return;
        }

        haptics.selection();
        setFeasibilityError(null);

        const incomeToUse = overrideIncome !== undefined ? overrideIncome : (customIncome ? parseFloat(customIncome) : undefined);
        try {
            const result = await checkFeasibilityMutation.mutateAsync({
                name: nameToUse,
                target_amount: amtToUse,
                target_date: dateToUse,
                custom_expected_income: incomeToUse,
                freeze_percentage: freezePctToUse,
            });
            setFeasibility(result);
            if (result.current_freeze_percentage !== undefined && overrideFreezePct === undefined) {
                setFreezePercentage(result.current_freeze_percentage);
            }
            if (result.detected_income && !customIncome && overrideIncome === undefined) {
                setCustomIncome(result.detected_income.toString());
            }
        } catch (err: any) {
            console.error('Feasibility evaluation failed:', err);
            setFeasibilityError(err?.response?.data?.detail || err?.message || 'Unable to evaluate feasibility. Please verify your inputs.');
        }
    };

    const handleApplySuggestedDate = (suggestedDate: string) => {
        haptics.selection();
        setFormDate(suggestedDate);
        handleCheckFeasibility(undefined, undefined, suggestedDate);
    };

    const handleApplySuggestedAmount = (suggestedAmount: number) => {
        haptics.selection();
        const cleanAmount = Math.floor(suggestedAmount);
        setFormAmount(String(cleanAmount));
        handleCheckFeasibility(undefined, cleanAmount, undefined);
    };

    const handleQuickExtend = (type: '15d' | '1m' | '2m' | '3m') => {
        haptics.selection();
        const base = formDate ? new Date(formDate) : new Date();
        let nextDate: Date;
        if (type === '15d') nextDate = addDays(base, 15);
        else if (type === '1m') nextDate = addMonths(base, 1);
        else if (type === '2m') nextDate = addMonths(base, 2);
        else nextDate = addMonths(base, 3);

        const formatted = format(nextDate, 'yyyy-MM-dd');
        setFormDate(formatted);
        handleCheckFeasibility(undefined, undefined, formatted);
    };

    const handleCreateGoal = async () => {
        if (!formName.trim() || !formAmount || !formDate) return;
        haptics.selection();

        try {
            await createGoalMutation.mutateAsync({
                name: formName.trim(),
                target_amount: parseFloat(formAmount),
                target_date: formDate,
                custom_expected_income: customIncome ? parseFloat(customIncome) : undefined,
                freeze_percentage: freezePercentage,
            });

            setIsDrawerOpen(false);
            setFormName('');
            setFormAmount('');
            setFormDate('');
            setFeasibility(null);
            setFreezePercentage(50);
        } catch (err: any) {
            console.error('Failed to create goal:', err);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!goalToDelete) return;
        haptics.selection();
        await deleteGoalMutation.mutateAsync(goalToDelete.id);
        setGoalToDelete(null);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric',
        });
    };

    if (isLoading) {
        return <Loader fullPage text="Calculating Goal Commitments" />;
    }

    return (
        <div className="min-h-screen text-text-primary pb-32 pb-safe overflow-x-hidden">
            {/* Header */}
            {!embedded ? (
                <header className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 bg-page/85 backdrop-blur-2xl z-30 border-b border-border-subtle">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                haptics.selection();
                                navigate(-1);
                            }}
                            className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all touch-manipulation"
                            aria-label="Navigate back"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary heading-apple">
                                Financial Targets
                            </h1>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5">
                                Dual-Bucket Pacing & Salary Surplus Allocation
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={openCreateDrawer}
                        className="px-4 py-2.5 rounded-full bg-primary text-text-inverse font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md touch-manipulation"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>New Target</span>
                    </button>
                </header>
            ) : (
                <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border-subtle mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-surface-pill border border-border-subtle flex items-center justify-center text-text-primary">
                            <Target size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-tight text-text-primary">Financial Goals</h2>
                            <p className="text-[10px] text-text-muted font-bold">Salary Surplus & Dual-Bucket Pacing</p>
                        </div>
                    </div>
                    <button
                        onClick={openCreateDrawer}
                        className="px-3.5 py-2 rounded-full bg-primary text-text-inverse font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-xs touch-manipulation"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>Add Goal</span>
                    </button>
                </div>
            )}

            <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
                {/* Visual Overview Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Total Target Commitment */}
                    <div className="bg-surface border border-border-subtle p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[2px]">
                                Target Capital
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md badge-neutral">
                                {stats.activeCount} Active
                            </span>
                        </div>
                        <div>
                            <p className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight tabular-nums">
                                {formatCurrency(stats.totalTarget)}
                            </p>
                            <p className="text-xs text-text-muted mt-1 font-medium">
                                Cumulative goal commitments
                            </p>
                        </div>
                    </div>

                    {/* Monthly Safe-to-Spend Freeze */}
                    <div className="bg-surface border border-border-subtle p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-extrabold text-accent-text uppercase tracking-[2px]">
                                Monthly Freeze
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md badge-accent">
                                Discretionary Guard
                            </span>
                        </div>
                        <div>
                            <p className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight tabular-nums">
                                {formatCurrency(stats.totalMonthlyFreeze)}
                            </p>
                            <p className="text-xs text-text-muted mt-1 font-medium">
                                Allocated per cycle from Safe-to-Spend
                            </p>
                        </div>
                    </div>

                    {/* Overall Progress & Saved */}
                    <div className="bg-surface border border-border-subtle p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[2px]">
                                Accumulated Fund
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md badge-success">
                                {stats.averageProgress}% Overall
                            </span>
                        </div>
                        <div>
                            <p className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight tabular-nums">
                                {formatCurrency(stats.totalSaved)}
                            </p>
                            <p className="text-xs text-text-muted mt-1 font-medium flex items-center justify-between">
                                <span>Total capital preserved</span>
                                <span className="text-text-secondary font-semibold tabular-nums">
                                    Rem: {formatCurrency(Math.max(0, stats.totalTarget - stats.totalSaved))}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Educational / Architectural Context Pill */}
                <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface-pill border border-border-subtle flex items-center justify-center shrink-0 text-accent-text">
                            <ShieldCheck size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">
                                Dual-Bucket Salary Cycle Protection
                            </p>
                            <p className="text-[11px] text-text-muted">
                                Grip allocates a portion of current liquidity, then funds the remainder from upcoming income surpluses so your lifestyle isn't starved.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Goals List */}
                <div className="space-y-3">
                    {goals && goals.length > 0 ? (
                        <div className="space-y-3">
                            {goals.map((goal) => {
                                const targetDate = new Date(goal.target_date);
                                const daysRemaining = Math.max(0, differenceInCalendarDays(targetDate, new Date()));
                                const percentSaved = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_saved / goal.target_amount) * 100)) : 0;

                                return (
                                    <div
                                        key={goal.id}
                                        className="p-5 rounded-3xl bg-surface border border-border-subtle hover:border-border-default transition-all shadow-xs space-y-4 group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-11 h-11 rounded-2xl bg-surface-pill border border-border-subtle flex items-center justify-center shrink-0 text-text-primary group-hover:scale-105 transition-transform">
                                                    <Target size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-base text-text-primary truncate">
                                                        {goal.name}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                                            <Calendar size={12} />
                                                            <span>Target: {formatDate(goal.target_date)}</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md badge-neutral tabular-nums">
                                                            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Target date reached'}
                                                        </span>
                                                        {goal.monthly_contribution > 0 && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md badge-accent tabular-nums">
                                                                Freezing {formatCurrency(goal.monthly_contribution)}/mo
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    haptics.selection();
                                                    setGoalToDelete(goal);
                                                }}
                                                className="w-9 h-9 rounded-2xl bg-surface-subtle hover:bg-status-danger-bg border border-border-subtle hover:border-status-danger-border flex items-center justify-center transition-all text-text-muted hover:text-status-danger-text active:scale-90 shrink-0"
                                                aria-label="Delete goal"
                                                title="Delete goal"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>

                                        {/* Financial Breakdown Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                                            <div className="bg-surface-subtle p-3 rounded-2xl border border-border-subtle">
                                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Target Capital</p>
                                                <p className="text-base sm:text-lg font-black text-text-primary tabular-nums">
                                                    {formatCurrency(Number(goal.target_amount))}
                                                </p>
                                            </div>
                                            <div className="bg-surface-subtle p-3 rounded-2xl border border-border-subtle">
                                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Current Accumulation</p>
                                                <p className="text-base sm:text-lg font-black text-status-success-text tabular-nums">
                                                    {formatCurrency(Number(goal.current_saved))}
                                                </p>
                                            </div>
                                            <div className="bg-surface-subtle p-3 rounded-2xl border border-border-subtle col-span-2 sm:col-span-1">
                                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted mb-0.5">Safe Freeze / Mo</p>
                                                <p className="text-base sm:text-lg font-black text-accent-text tabular-nums">
                                                    {formatCurrency(Number(goal.monthly_contribution))}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Sleek Progress Bar */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="relative h-2.5 bg-surface-pill rounded-full overflow-hidden border border-border-subtle">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentSaved}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
                                                <span className="tabular-nums font-semibold text-text-primary">
                                                    {percentSaved}% completed
                                                </span>
                                                <span className="tabular-nums">
                                                    {formatCurrency(Number(goal.current_saved))} of {formatCurrency(Number(goal.target_amount))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-surface-subtle/50 border border-dashed border-border-subtle rounded-3xl">
                            <div className="w-14 h-14 rounded-2xl bg-surface-pill border border-border-subtle flex items-center justify-center mb-4 text-text-muted">
                                <Target size={24} />
                            </div>
                            <h3 className="text-sm font-bold text-text-primary">
                                No Financial Targets Active
                            </h3>
                            <p className="text-xs text-text-muted mt-1 max-w-sm">
                                Define goals to let Grip automatically protect monthly capital across your salary cycles without starving day-to-day spending.
                            </p>
                            <button
                                onClick={openCreateDrawer}
                                className="mt-5 px-4 py-2.5 rounded-full bg-primary text-text-inverse font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-xs touch-manipulation"
                            >
                                <Plus size={14} strokeWidth={2.5} />
                                <span>Create Financial Target</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Goal Fluid Drawer */}
            <Drawer
                isOpen={isDrawerOpen}
                onClose={() => {
                    haptics.selection();
                    setIsDrawerOpen(false);
                }}
                title="New Financial Target"
            >
                <div className="space-y-5 p-1">
                    {/* Goal Title */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                            Goal Purpose / Title
                        </label>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => {
                                setFormName(e.target.value);
                                setFeasibility(null);
                            }}
                            placeholder="e.g. Carpenting, House Downpayment, Japan Vacation, MacBook M4"
                            required
                            className="w-full bg-surface-subtle border border-border-default rounded-2xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus font-medium"
                        />
                    </div>

                    {/* Target Amount with Quick Increments */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                            Target Capital (₹)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-text-muted">
                                ₹
                            </span>
                            <input
                                type="number"
                                step="any"
                                min="1"
                                value={formAmount}
                                onChange={(e) => {
                                    setFormAmount(e.target.value);
                                    setFeasibility(null);
                                }}
                                placeholder="60,000"
                                required
                                className="w-full bg-surface-subtle border border-border-default rounded-2xl pl-9 pr-4 py-3 text-lg font-black text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus tabular-nums"
                            />
                        </div>
                        {/* Quick preset amount pills */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {[10000, 25000, 50000, 100000, 200000].map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => {
                                        haptics.selection();
                                        setFormAmount(String(amt));
                                        setFeasibility(null);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-95 transition-all tabular-nums"
                                >
                                    +₹{amt.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target Date with Quick Horizons */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                            Target Deadline
                        </label>
                        <input
                            type="date"
                            value={formDate}
                            onChange={(e) => {
                                setFormDate(e.target.value);
                                setFeasibility(null);
                            }}
                            required
                            className="w-full bg-surface-subtle border border-border-default rounded-2xl px-4 py-3 text-sm font-semibold text-text-primary focus:outline-none focus:border-border-focus"
                        />
                        {/* Quick date presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    const d = addMonths(new Date(), 3);
                                    setFormDate(format(d, 'yyyy-MM-dd'));
                                    setFeasibility(null);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                In 3 Months
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    const d = addMonths(new Date(), 6);
                                    setFormDate(format(d, 'yyyy-MM-dd'));
                                    setFeasibility(null);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                In 6 Months
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    const d = endOfYear(new Date());
                                    setFormDate(format(d, 'yyyy-MM-dd'));
                                    setFeasibility(null);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                Year End
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    const d = addYears(new Date(), 1);
                                    setFormDate(format(d, 'yyyy-MM-dd'));
                                    setFeasibility(null);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                In 1 Year
                            </button>
                        </div>
                    </div>

                    {/* Feasibility Error Banner */}
                    {feasibilityError && (
                        <div className="p-3.5 rounded-2xl bg-status-danger-bg border border-status-danger-border flex items-start gap-2.5 text-xs text-status-danger-text">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <p className="font-semibold">{feasibilityError}</p>
                        </div>
                    )}

                    {/* Feasibility Intelligence Output */}
                    {feasibility && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-2xl border ${
                                feasibility.is_feasible
                                    ? 'bg-status-success-bg/40 border-status-success-border'
                                    : 'bg-status-warning-bg/40 border-status-warning-border'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {feasibility.is_feasible ? (
                                    <CheckCircle size={18} className="text-status-success-text mt-0.5 shrink-0" />
                                ) : (
                                    <AlertCircle size={18} className="text-status-warning-text mt-0.5 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-text-primary mb-3 leading-relaxed font-medium">
                                        {feasibility.message}
                                    </p>

                                    {/* Interactive Safe-to-Spend Allocation Slider */}
                                    {allocationPreview && feasibility.available_monthly_liquidity > 0 && (
                                        <div className="bg-surface/90 rounded-2xl p-3.5 border border-border-subtle space-y-2.5 mb-3 shadow-xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <ShieldCheck size={14} className="text-primary shrink-0" />
                                                    <span className="text-xs font-bold text-text-primary">Surplus Allocation (Safe-to-Spend)</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-mono font-black text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                                                        {freezePercentage}%
                                                    </span>
                                                    <span className="text-[10px] font-mono font-bold text-text-muted">
                                                        (≈ {formatCurrency(allocationPreview.freezeNow)})
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-text-muted leading-relaxed">
                                                Essential bills & living buffer are already secured. Choose what % of your remaining pure surplus to commit today vs. future salary paydays.
                                            </p>

                                            {/* Range Slider */}
                                            <div className="space-y-1 pt-0.5">
                                                <input
                                                    type="range"
                                                    min={10}
                                                    max={100}
                                                    step={5}
                                                    value={freezePercentage}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setFreezePercentage(val);
                                                        haptics.selection();
                                                    }}
                                                    onMouseUp={() => handleCheckFeasibility(undefined, undefined, undefined, freezePercentage)}
                                                    onTouchEnd={() => handleCheckFeasibility(undefined, undefined, undefined, freezePercentage)}
                                                    className="w-full accent-primary h-2 bg-surface-pill rounded-lg cursor-pointer"
                                                />
                                                <div className="flex justify-between text-[9px] font-mono text-text-muted">
                                                    <span>10% (Flexible)</span>
                                                    {feasibility.default_freeze_percentage !== undefined && (
                                                        <span className="text-primary font-bold">
                                                            {feasibility.default_freeze_percentage}% (Smart Match • {allocationPreview.daysInCycle}d left)
                                                        </span>
                                                    )}
                                                    <span>100% (Full Surplus)</span>
                                                </div>
                                            </div>

                                            {/* Quick Preset Chips */}
                                            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mr-0.5">Presets:</span>
                                                {[25, 50, 75, 100].map((pct) => (
                                                    <button
                                                        key={pct}
                                                        type="button"
                                                        onClick={() => {
                                                            setFreezePercentage(pct);
                                                            haptics.selection();
                                                            handleCheckFeasibility(undefined, undefined, undefined, pct);
                                                        }}
                                                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono transition-all active:scale-95 border ${
                                                            freezePercentage === pct
                                                                ? 'bg-primary text-text-inverse border-primary shadow-xs'
                                                                : 'bg-surface border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-hover'
                                                        }`}
                                                    >
                                                        {pct}%
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

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
                                                {formatCurrency(allocationPreview?.freezeNow ?? (feasibility.current_cycle_freeze ?? feasibility.required_monthly_savings))}
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
                                                {formatCurrency(allocationPreview?.cushionLeft ?? Math.max(0, feasibility.available_monthly_liquidity - (feasibility.current_cycle_freeze ?? 0)))}
                                            </span>
                                            {allocationPreview && (
                                                <span className="text-[8px] text-text-muted block mt-0.5">
                                                    ≈ {formatCurrency(allocationPreview.dailyCushion)}/day ({allocationPreview.daysInCycle}d)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Smart Feasibility Optimizer / What-If Recommendations */}
                                    {!feasibility.is_feasible && (feasibility.suggested_target_date || feasibility.suggested_target_amount) && (
                                        <div className="pt-2.5 pb-1 border-t border-border-subtle/70 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                                                    <Sparkles size={13} className="text-accent-text" />
                                                    <span>What-If Optimizer</span>
                                                </div>
                                                <span className="text-[10px] text-text-muted font-medium">1-tap auto-solve</span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                {/* Recommendation 1: Shift Deadline */}
                                                {feasibility.suggested_target_date && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApplySuggestedDate(feasibility.suggested_target_date)}
                                                        className="w-full text-left p-2.5 rounded-xl bg-surface border border-border-subtle hover:border-border-default hover:bg-surface-hover active:scale-[0.98] transition-all flex items-center justify-between group touch-manipulation"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-lg bg-surface-pill border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-text-primary shrink-0">
                                                                <Calendar size={14} />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                                                    <span>Extend to {format(new Date(feasibility.suggested_target_date), 'MMM d, yyyy')}</span>
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-status-success-bg text-status-success-text font-bold">100% Solid</span>
                                                                </div>
                                                                <p className="text-[10px] text-text-muted">
                                                                    Gives {feasibility.suggested_cycles_needed} salary cycle(s) to hit full ₹{parseFloat(formAmount || '0').toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-accent-text group-hover:underline pl-2 shrink-0">Apply</span>
                                                    </button>
                                                )}

                                                {/* Recommendation 2: Cap Target Amount */}
                                                {feasibility.suggested_target_amount && feasibility.suggested_target_amount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApplySuggestedAmount(feasibility.suggested_target_amount)}
                                                        className="w-full text-left p-2.5 rounded-xl bg-surface border border-border-subtle hover:border-border-default hover:bg-surface-hover active:scale-[0.98] transition-all flex items-center justify-between group touch-manipulation"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-lg bg-surface-pill border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-text-primary shrink-0">
                                                                <Target size={14} />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                                                    <span>Cap target at ₹{Math.floor(feasibility.suggested_target_amount).toLocaleString()}</span>
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-status-success-bg text-status-success-text font-bold">Achievable Now</span>
                                                                </div>
                                                                <p className="text-[10px] text-text-muted">
                                                                    Safe savings capacity by {formDate ? format(new Date(formDate), 'MMM d, yyyy') : 'deadline'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-accent-text group-hover:underline pl-2 shrink-0">Apply</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Quick Step Sliders / Horizon Pills */}
                                            <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mr-1">Shift By:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickExtend('15d')}
                                                    className="px-2 py-0.5 rounded-lg bg-surface border border-border-subtle text-[10px] font-bold text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-95 transition-all"
                                                >
                                                    +15 Days
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickExtend('1m')}
                                                    className="px-2 py-0.5 rounded-lg bg-surface border border-border-subtle text-[10px] font-bold text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-95 transition-all"
                                                >
                                                    +1 Month
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickExtend('2m')}
                                                    className="px-2 py-0.5 rounded-lg bg-surface border border-border-subtle text-[10px] font-bold text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-95 transition-all"
                                                >
                                                    +2 Months
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickExtend('3m')}
                                                    className="px-2 py-0.5 rounded-lg bg-surface border border-border-subtle text-[10px] font-bold text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-95 transition-all"
                                                >
                                                    +3 Months
                                                </button>
                                            </div>
                                        </div>
                                    )}

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

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => handleCheckFeasibility()}
                            disabled={!formName.trim() || !formAmount || !formDate || checkFeasibilityMutation.isPending}
                            className="flex-1 py-3.5 rounded-2xl bg-surface-pill hover:bg-surface-hover border border-border-subtle text-xs font-bold text-text-primary uppercase tracking-wide transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation"
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
                            className="flex-1 py-3.5 rounded-2xl bg-primary text-text-inverse text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md flex items-center justify-center gap-1.5 touch-manipulation"
                        >
                            {createGoalMutation.isPending ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <span>Commit Target</span>
                            )}
                        </button>
                    </div>
                </div>
            </Drawer>

            {/* Delete Confirmation Modal */}
            {goalToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-overlay backdrop-blur-sm"
                        onClick={() => setGoalToDelete(null)}
                    />
                    <div className="relative bg-surface border border-border-default rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-status-danger-bg text-status-danger-text border border-status-danger-border flex items-center justify-center">
                            <Trash2 size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-text-primary">
                                Remove "{goalToDelete.name}"?
                            </h3>
                            <p className="text-xs text-text-muted">
                                This will remove the target ({formatCurrency(Number(goalToDelete.target_amount))}) and immediately unfreeze {formatCurrency(Number(goalToDelete.monthly_contribution))}/mo from your Safe-to-Spend allocation.
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setGoalToDelete(null)}
                                className="flex-1 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface border border-border-subtle text-xs font-bold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={deleteGoalMutation.isPending}
                                className="flex-1 py-2.5 rounded-xl bg-status-danger-solid hover:bg-status-danger-solid-hover text-white text-xs font-bold active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5"
                            >
                                {deleteGoalMutation.isPending && (
                                    <Loader2 size={13} className="animate-spin text-white" />
                                )}
                                <span>{deleteGoalMutation.isPending ? 'Removing...' : 'Delete'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Goals;
