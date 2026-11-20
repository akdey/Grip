import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    GitFork,
    Plus,
    Minus,
    Trash2,
    Loader2,
    Check,
    AlertCircle,
    SlidersHorizontal,
    Sparkles,
    AlignLeft,
    Equal
} from 'lucide-react';
import { useCategories } from '../../features/transactions/categoryHooks';
import { useSplitTransaction, type Transaction } from '../../features/transactions/hooks';
import { CategoryIcon } from '../ui/CategoryIcon';
import { haptics } from '../../lib/haptics';
import { format, parseISO } from 'date-fns';

interface SplitTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
    onSuccess?: () => void;
}

interface SliceState {
    category: string;
    sub_category: string;
    ratio: string;
    amount: string;
    remarks: string;
}

const PRESET_RATIOS = [
    { label: '80:20', weights: [80, 20] },
    { label: '70:30', weights: [70, 30] },
    { label: '60:40', weights: [60, 40] },
    { label: '50:50', weights: [50, 50] },
];

const DEFAULT_SLICE_COLORS = [
    '#38bdf8', // sky
    '#34d399', // emerald
    '#fbbf24', // amber
    '#f87171', // rose
    '#a78bfa', // violet
    '#fb923c', // orange
];

export const SplitTransactionModal: React.FC<SplitTransactionModalProps> = ({
    isOpen,
    onClose,
    transaction,
    onSuccess
}) => {
    const { data: categories } = useCategories();
    const splitMutation = useSplitTransaction();

    const [splitMode, setSplitMode] = useState<'RATIO' | 'AMOUNT'>('RATIO');
    const absTotal = useMemo(() => Math.abs(Number(transaction?.amount || 0)), [transaction]);

    // Initial state setup
    const [slices, setSlices] = useState<SliceState[]>([
        {
            category: transaction?.category || '',
            sub_category: transaction?.sub_category || '',
            ratio: '80',
            amount: '',
            remarks: transaction?.remarks || ''
        },
        {
            category: '',
            sub_category: '',
            ratio: '20',
            amount: '',
            remarks: ''
        }
    ]);

    // Re-initialize when modal opens or transaction changes
    useEffect(() => {
        if (isOpen && transaction) {
            const firstCategory = transaction.category || (categories && categories[0]?.name) || '';
            const firstSubCategory = transaction.sub_category || '';

            setSlices([
                {
                    category: firstCategory,
                    sub_category: firstSubCategory,
                    ratio: '80',
                    amount: ((absTotal * 80) / 100).toFixed(2),
                    remarks: transaction.remarks || ''
                },
                {
                    category: '',
                    sub_category: '',
                    ratio: '20',
                    amount: ((absTotal * 20) / 100).toFixed(2),
                    remarks: ''
                }
            ]);
            setSplitMode('RATIO');
        }
    }, [isOpen, transaction, absTotal]);

    // Format currency helper
    const formatRupees = (val: number) => {
        return '₹' + val.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Date formatting helper
    const formattedDate = useMemo(() => {
        if (!transaction) return '';
        try {
            if (transaction.transaction_date) {
                return format(parseISO(transaction.transaction_date), 'dd MMM yyyy');
            }
            if (transaction.created_at) {
                return format(new Date(transaction.created_at), 'dd MMM yyyy');
            }
        } catch {
            return '';
        }
        return '';
    }, [transaction]);

    // RATIO calculations
    const totalRatio = useMemo(() => {
        return slices.reduce((acc, s) => {
            const num = parseFloat(s.ratio);
            return acc + (isNaN(num) || num < 0 ? 0 : num);
        }, 0);
    }, [slices]);

    const ratioCalculations = useMemo(() => {
        return slices.map(s => {
            const weight = parseFloat(s.ratio);
            if (isNaN(weight) || weight <= 0 || totalRatio <= 0) {
                return { amount: 0, percentage: 0 };
            }
            const percentage = (weight / totalRatio) * 100;
            const amount = (absTotal * weight) / totalRatio;
            return { amount, percentage };
        });
    }, [slices, totalRatio, absTotal]);

    // AMOUNT calculations
    const totalAllocatedAmount = useMemo(() => {
        return slices.reduce((acc, s) => {
            const val = parseFloat(s.amount);
            return acc + (isNaN(val) || val < 0 ? 0 : val);
        }, 0);
    }, [slices]);

    const remainingAmount = useMemo(() => {
        return Number((absTotal - totalAllocatedAmount).toFixed(2));
    }, [absTotal, totalAllocatedAmount]);

    // Active preset check
    const activePresetLabel = useMemo(() => {
        if (splitMode !== 'RATIO' || slices.length !== 2) return null;
        const w0 = parseFloat(slices[0].ratio);
        const w1 = parseFloat(slices[1].ratio);
        for (const p of PRESET_RATIOS) {
            if (p.weights[0] === w0 && p.weights[1] === w1) return p.label;
        }
        return null;
    }, [splitMode, slices]);

    // Validation
    const isValid = useMemo(() => {
        if (slices.length < 2) return false;

        // Ensure category and subcategory are set for all slices
        for (const s of slices) {
            if (!s.category.trim() || !s.sub_category.trim()) return false;
        }

        if (splitMode === 'RATIO') {
            if (totalRatio <= 0) return false;
            for (const s of slices) {
                const w = parseFloat(s.ratio);
                if (isNaN(w) || w <= 0) return false;
            }
            return true;
        } else {
            // AMOUNT mode
            for (const s of slices) {
                const amt = parseFloat(s.amount);
                if (isNaN(amt) || amt <= 0) return false;
            }
            return Math.abs(remainingAmount) < 0.01;
        }
    }, [slices, splitMode, totalRatio, remainingAmount]);

    // Presets handler
    const applyPreset = (weights: number[]) => {
        haptics.impact('light');
        setSlices(prev => {
            const newSlices: SliceState[] = [];
            weights.forEach((w, idx) => {
                const existing = prev[idx];
                newSlices.push({
                    category: existing?.category || (idx === 0 ? transaction?.category || '' : ''),
                    sub_category: existing?.sub_category || (idx === 0 ? transaction?.sub_category || '' : ''),
                    ratio: w.toString(),
                    amount: ((absTotal * w) / 100).toFixed(2),
                    remarks: existing?.remarks || ''
                });
            });
            return newSlices;
        });
    };

    // Split evenly across all slices
    const handleSplitEvenly = () => {
        haptics.impact('light');
        if (slices.length < 2) return;

        if (splitMode === 'RATIO') {
            const equalWeight = Math.round(100 / slices.length);
            setSlices(prev => prev.map(s => ({ ...s, ratio: equalWeight.toString() })));
        } else {
            const perSlice = (absTotal / slices.length).toFixed(2);
            setSlices(prev => {
                const updated = prev.map(s => ({ ...s, amount: perSlice }));
                // Adjust rounding diff on last slice
                const currentSum = parseFloat(perSlice) * slices.length;
                const diff = Number((absTotal - currentSum).toFixed(2));
                if (diff !== 0 && updated.length > 0) {
                    const lastVal = parseFloat(updated[updated.length - 1].amount);
                    updated[updated.length - 1].amount = (lastVal + diff).toFixed(2);
                }
                return updated;
            });
        }
    };

    // Stepper adjuster for ratio weights
    const adjustWeight = (index: number, delta: number) => {
        haptics.impact('light');
        setSlices(prev => {
            const updated = [...prev];
            const currentVal = Math.max(1, (parseFloat(updated[index].ratio) || 0) + delta);
            updated[index] = { ...updated[index], ratio: currentVal.toString() };
            return updated;
        });
    };

    // Slice manipulations
    const updateSlice = (index: number, field: keyof SliceState, value: string) => {
        setSlices(prev => {
            const updated = [...prev];
            const current = { ...updated[index], [field]: value };

            // Reset subcategory if category changes
            if (field === 'category') {
                const catObj = categories?.find(c => c.name === value);
                current.sub_category = catObj?.sub_categories?.[0]?.name || 'Uncategorized';
            }

            updated[index] = current;
            return updated;
        });
    };

    const addSlice = () => {
        haptics.impact('light');
        setSlices(prev => {
            const defaultRatio = Math.max(10, Math.floor(100 / (prev.length + 1)));
            const defaultAmount = remainingAmount > 0 ? remainingAmount.toFixed(2) : '0.00';
            return [
                ...prev,
                {
                    category: '',
                    sub_category: '',
                    ratio: defaultRatio.toString(),
                    amount: defaultAmount,
                    remarks: ''
                }
            ];
        });
    };

    const removeSlice = (index: number) => {
        if (slices.length <= 2) return;
        haptics.impact('light');
        setSlices(prev => prev.filter((_, i) => i !== index));
    };

    // Auto-fill remainder into a slice
    const fillRemainderIntoSlice = (index: number) => {
        if (remainingAmount <= 0) return;
        haptics.impact('light');
        setSlices(prev => {
            const updated = [...prev];
            const currentAmt = parseFloat(updated[index].amount) || 0;
            updated[index] = {
                ...updated[index],
                amount: (currentAmt + remainingAmount).toFixed(2)
            };
            return updated;
        });
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!isValid || splitMutation.isPending) return;
        haptics.impact('medium');

        const requestData = {
            split_mode: splitMode,
            splits: slices.map((s) => {
                if (splitMode === 'RATIO') {
                    return {
                        category: s.category,
                        sub_category: s.sub_category,
                        ratio: parseFloat(s.ratio),
                        remarks: s.remarks.trim() || undefined
                    };
                } else {
                    return {
                        category: s.category,
                        sub_category: s.sub_category,
                        amount: parseFloat(s.amount),
                        remarks: s.remarks.trim() || undefined
                    };
                }
            })
        };

        splitMutation.mutate(
            { id: transaction.id, data: requestData },
            {
                onSuccess: () => {
                    haptics.notification('success');
                    onClose();
                    onSuccess?.();
                },
                onError: () => {
                    haptics.notification('error');
                }
            }
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-overlay backdrop-blur-xl"
                    />

                    {/* Dialog Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 350, mass: 0.8 }}
                        className="relative w-full max-w-xl bg-surface border border-border-default rounded-3xl p-5 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.6)] z-10 flex flex-col max-h-[90vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between pb-4 border-b border-border-subtle shrink-0">
                            <div className="space-y-1 min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-accent-subtle/80 border border-accent-border/40 flex items-center justify-center text-accent shrink-0">
                                        <GitFork size={13} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted truncate">
                                        {transaction?.merchant_name || 'Transaction'} {formattedDate ? `• ${formattedDate}` : ''}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-text-primary tracking-tight">
                                    Split Transaction
                                </h2>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                                <div className="bg-surface-subtle border border-border-subtle rounded-2xl px-3.5 py-1.5 text-right shadow-xs">
                                    <span className="text-[9px] text-text-muted uppercase font-bold block leading-none tracking-wider">
                                        Order Total
                                    </span>
                                    <span className="text-sm font-bold font-mono tabular-nums text-text-primary leading-tight">
                                        {formatRupees(absTotal)}
                                    </span>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-90 transition-all touch-manipulation"
                                    aria-label="Close"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Mode Switcher */}
                        <div className="pt-3 pb-2 shrink-0 space-y-3">
                            <div className="flex p-1 bg-surface-subtle border border-border-subtle rounded-xl gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        haptics.selection();
                                        setSplitMode('RATIO');
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                        splitMode === 'RATIO'
                                            ? 'bg-surface text-text-primary shadow-sm border border-border-subtle'
                                            : 'text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    <SlidersHorizontal size={13} />
                                    <span>By Ratio / %</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        haptics.selection();
                                        setSplitMode('AMOUNT');
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                        splitMode === 'AMOUNT'
                                            ? 'bg-surface text-text-primary shadow-sm border border-border-subtle'
                                            : 'text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    <span className="font-mono">₹</span>
                                    <span>By Exact Amount</span>
                                </button>
                            </div>

                            {/* Proportional Segmented Visualizer Bar */}
                            <div className="bg-surface-subtle/70 border border-border-subtle/80 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                    <span className="flex items-center gap-1.5">
                                        <Sparkles size={11} className="text-accent" />
                                        Visual Allocation Breakdown
                                    </span>
                                    <span className="font-mono tabular-nums text-text-primary">
                                        {splitMode === 'RATIO'
                                            ? '100% Proportional'
                                            : `${Math.min(100, Math.max(0, (totalAllocatedAmount / absTotal) * 100)).toFixed(1)}% Allocated`}
                                    </span>
                                </div>

                                {/* Segmented Bar */}
                                <div className="h-3 w-full bg-surface border border-border-subtle rounded-full overflow-hidden flex p-0.5 gap-0.5 shadow-inner">
                                    {slices.map((slice, idx) => {
                                        const catObj = categories?.find(c => c.name === slice.category);
                                        const color = catObj?.color || DEFAULT_SLICE_COLORS[idx % DEFAULT_SLICE_COLORS.length];
                                        const pct = splitMode === 'RATIO'
                                            ? (ratioCalculations[idx]?.percentage || 0)
                                            : Math.max(0, (parseFloat(slice.amount || '0') / absTotal) * 100);

                                        if (pct <= 0) return null;

                                        return (
                                            <motion.div
                                                key={idx}
                                                layout
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                                className="h-full rounded-full transition-all relative"
                                                style={{ backgroundColor: color }}
                                                title={`${slice.sub_category || slice.category || `Slice #${idx + 1}`}: ${pct.toFixed(1)}%`}
                                            />
                                        );
                                    })}
                                    {splitMode === 'AMOUNT' && remainingAmount > 0.01 && (
                                        <motion.div
                                            layout
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(remainingAmount / absTotal) * 100}%` }}
                                            className="h-full rounded-full bg-border-subtle/80 border border-dashed border-border-default/60"
                                            title={`Unallocated: ${formatRupees(remainingAmount)}`}
                                        />
                                    )}
                                </div>

                                {/* Legend Chips */}
                                <div className="flex items-center gap-3 overflow-x-auto pt-0.5 no-scrollbar">
                                    {slices.map((slice, idx) => {
                                        const catObj = categories?.find(c => c.name === slice.category);
                                        const color = catObj?.color || DEFAULT_SLICE_COLORS[idx % DEFAULT_SLICE_COLORS.length];
                                        const pct = splitMode === 'RATIO'
                                            ? (ratioCalculations[idx]?.percentage || 0)
                                            : Math.max(0, (parseFloat(slice.amount || '0') / absTotal) * 100);

                                        return (
                                            <div key={idx} className="flex items-center gap-1.5 shrink-0">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                <span className="text-[10px] font-semibold text-text-primary truncate max-w-[110px]">
                                                    {slice.sub_category || slice.category || `Slice #${idx + 1}`}
                                                </span>
                                                <span className="text-[9px] font-mono text-text-muted tabular-nums">
                                                    {pct.toFixed(0)}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preset Pills for Ratio Mode */}
                            {splitMode === 'RATIO' && (
                                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] uppercase font-bold text-text-muted">Presets:</span>
                                        {PRESET_RATIOS.map(preset => {
                                            const isActive = activePresetLabel === preset.label;
                                            return (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => applyPreset(preset.weights)}
                                                    className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border active:scale-95 transition-all shrink-0 ${
                                                        isActive
                                                            ? 'bg-accent-solid text-text-on-accent border-accent-solid shadow-xs'
                                                            : 'bg-surface-subtle hover:bg-surface-hover border-border-subtle text-text-primary'
                                                    }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSplitEvenly}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-subtle hover:bg-surface-hover border border-border-subtle text-text-primary active:scale-95 transition-all shrink-0"
                                        title="Split equally across all slices"
                                    >
                                        <Equal size={12} />
                                        <span>Equal</span>
                                    </button>
                                </div>
                            )}

                            {/* Status Banner for Amount Mode */}
                            {splitMode === 'AMOUNT' && (
                                <div className="space-y-1.5">
                                    <div
                                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                                            Math.abs(remainingAmount) < 0.01
                                                ? 'bg-status-success-bg border-status-success-border text-status-success-text'
                                                : remainingAmount > 0
                                                ? 'bg-status-warning-bg border-status-warning-border text-status-warning-text'
                                                : 'bg-status-danger-bg border-status-danger-border text-status-danger-text'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {Math.abs(remainingAmount) < 0.01 ? (
                                                <Check size={15} className="text-status-success shrink-0" />
                                            ) : (
                                                <AlertCircle size={15} className="shrink-0" />
                                            )}
                                            <span className="truncate">
                                                {Math.abs(remainingAmount) < 0.01
                                                    ? 'Balanced! Exactly 100% allocated'
                                                    : remainingAmount > 0
                                                    ? `Remaining: ${formatRupees(remainingAmount)}`
                                                    : `Overallocated by ${formatRupees(Math.abs(remainingAmount))}`}
                                            </span>
                                        </div>
                                        <span className="font-mono font-semibold tabular-nums shrink-0 pl-2">
                                            Allocated: {formatRupees(totalAllocatedAmount)}
                                        </span>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSplitEvenly}
                                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-subtle hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-text-primary active:scale-95 transition-all"
                                        >
                                            <Equal size={11} />
                                            <span>Split Evenly Across Slices</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dynamic Slices List */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                            {slices.map((slice, idx) => {
                                const selectedCat = categories?.find(c => c.name === slice.category);
                                const subCategories = selectedCat?.sub_categories || [];
                                const ratioCalc = ratioCalculations[idx] || { amount: 0, percentage: 0 };
                                const sliceColor = selectedCat?.color || DEFAULT_SLICE_COLORS[idx % DEFAULT_SLICE_COLORS.length];

                                return (
                                    <div
                                        key={idx}
                                        className="bg-surface-subtle/50 border border-border-subtle rounded-2xl p-3.5 space-y-3 transition-all hover:border-border-default shadow-xs"
                                    >
                                        {/* Slice Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className="w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 shadow-xs"
                                                    style={{
                                                        backgroundColor: `${sliceColor}18`,
                                                        borderColor: `${sliceColor}30`,
                                                        color: sliceColor
                                                    }}
                                                >
                                                    <CategoryIcon name={slice.sub_category || slice.category || 'tag'} size={14} />
                                                </div>

                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface border border-border-subtle text-text-muted shrink-0">
                                                    Slice #{idx + 1}
                                                </span>

                                                {splitMode === 'RATIO' && (
                                                    <span className="text-xs font-mono font-semibold text-text-primary tabular-nums truncate">
                                                        {formatRupees(ratioCalc.amount)}{' '}
                                                        <span className="text-text-muted font-normal text-[10px]">
                                                            ({ratioCalc.percentage.toFixed(1)}%)
                                                        </span>
                                                    </span>
                                                )}

                                                {splitMode === 'AMOUNT' && (
                                                    <span className="text-xs font-mono font-semibold text-text-primary tabular-nums truncate">
                                                        {formatRupees(parseFloat(slice.amount) || 0)}{' '}
                                                        <span className="text-text-muted font-normal text-[10px]">
                                                            ({absTotal > 0 ? (((parseFloat(slice.amount) || 0) / absTotal) * 100).toFixed(1) : 0}%)
                                                        </span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {splitMode === 'AMOUNT' && remainingAmount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => fillRemainderIntoSlice(idx)}
                                                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-accent-subtle/70 border border-accent-border/40 text-accent hover:opacity-80 active:scale-95 transition-all"
                                                        title="Add remaining balance to this slice"
                                                    >
                                                        + Remainder
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSlice(idx)}
                                                    disabled={slices.length <= 2}
                                                    className="w-7 h-7 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-status-danger-text hover:bg-status-danger-bg hover:border-status-danger-border active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
                                                    title={slices.length <= 2 ? 'Minimum 2 slices required' : 'Delete slice'}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Category & Subcategory Selectors */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                    Category
                                                </label>
                                                <select
                                                    value={slice.category}
                                                    onChange={e => updateSlice(idx, 'category', e.target.value)}
                                                    className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-medium text-text-primary focus:outline-none focus:border-border-default transition-all"
                                                >
                                                    <option value="" disabled>Select Category</option>
                                                    {categories?.map(c => (
                                                        <option key={c.id || c.name} value={c.name}>
                                                            {c.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                    Sub-Category
                                                </label>
                                                <select
                                                    value={slice.sub_category}
                                                    onChange={e => updateSlice(idx, 'sub_category', e.target.value)}
                                                    disabled={!slice.category}
                                                    className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-medium text-text-primary focus:outline-none focus:border-border-default transition-all disabled:opacity-50"
                                                >
                                                    <option value="" disabled>Select Sub-Category</option>
                                                    {subCategories.map(s => (
                                                        <option key={s.id || s.name} value={s.name}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                    {subCategories.length === 0 && (
                                                        <option value="Uncategorized">Uncategorized</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Value Input (Ratio Stepper or Amount) & Remarks */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                            <div className="sm:col-span-5 space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                    {splitMode === 'RATIO' ? 'Ratio Weight' : 'Exact Amount (₹)'}
                                                </label>
                                                {splitMode === 'RATIO' ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustWeight(idx, -5)}
                                                            className="w-7 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-90 transition-all shrink-0"
                                                            title="Decrease weight"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="any"
                                                            placeholder="e.g. 80"
                                                            value={slice.ratio}
                                                            onChange={e => updateSlice(idx, 'ratio', e.target.value)}
                                                            className="w-full bg-surface border border-border-subtle rounded-xl px-2.5 py-1.5 text-center text-xs font-mono tabular-nums text-text-primary focus:outline-none focus:border-border-default transition-all"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustWeight(idx, 5)}
                                                            className="w-7 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-90 transition-all shrink-0"
                                                            title="Increase weight"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-mono">₹</span>
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={slice.amount}
                                                            onChange={e => updateSlice(idx, 'amount', e.target.value)}
                                                            className="w-full bg-surface border border-border-subtle rounded-xl pl-7 pr-3 py-1.5 text-xs font-mono tabular-nums text-text-primary focus:outline-none focus:border-border-default transition-all"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="sm:col-span-7 space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                    Remarks (Optional)
                                                </label>
                                                <div className="relative">
                                                    <AlignLeft size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" />
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Groceries, Personal portion"
                                                        value={slice.remarks}
                                                        onChange={e => updateSlice(idx, 'remarks', e.target.value)}
                                                        className="w-full bg-surface border border-border-subtle rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-border-default transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add Slice Button */}
                            <button
                                type="button"
                                onClick={addSlice}
                                className="w-full py-3 rounded-2xl bg-surface-subtle/80 hover:bg-surface-hover border border-dashed border-border-default text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary flex items-center justify-center gap-2 active:scale-[0.99] transition-all touch-manipulation"
                            >
                                <Plus size={14} />
                                <span>Add Another Split</span>
                            </button>
                        </div>

                        {/* Footer Action Buttons */}
                        <div className="pt-4 mt-2 border-t border-border-subtle flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={splitMutation.isPending}
                                className="px-5 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-hover text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-all disabled:opacity-50 touch-manipulation"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!isValid || splitMutation.isPending}
                                className="px-6 py-2.5 rounded-xl bg-accent-solid text-text-on-accent text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none touch-manipulation"
                            >
                                {splitMutation.isPending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Splitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} />
                                        <span>Split & Verify</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
