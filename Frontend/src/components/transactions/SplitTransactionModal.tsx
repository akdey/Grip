import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitFork, Plus, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';
import { useCategories } from '../../features/transactions/categoryHooks';
import { useSplitTransaction, type Transaction } from '../../features/transactions/hooks';
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
            splits: slices.map((s, idx) => {
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-overlay backdrop-blur-md"
                    />

                    {/* Dialog Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                        className="relative w-full max-w-xl bg-surface border border-border-subtle rounded-3xl p-6 sm:p-7 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between pb-4 border-b border-border-subtle shrink-0">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-surface-subtle border border-border-subtle flex items-center justify-center text-accent">
                                        <GitFork size={14} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                        {transaction?.merchant_name || 'Transaction'} {formattedDate ? `• ${formattedDate}` : ''}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-text-primary tracking-tight">
                                    Split Transaction
                                </h2>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="bg-surface-subtle border border-border-subtle rounded-full px-3 py-1 text-right">
                                    <span className="text-[10px] text-text-muted uppercase font-bold block leading-none">Total</span>
                                    <span className="text-sm font-bold font-mono tabular-nums text-text-primary leading-tight">
                                        {formatRupees(absTotal)}
                                    </span>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-90 transition-all"
                                    aria-label="Close"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Mode Switcher */}
                        <div className="py-4 shrink-0 space-y-3">
                            <div className="flex p-1 bg-surface-subtle border border-border-subtle rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => {
                                        haptics.selection();
                                        setSplitMode('RATIO');
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                        splitMode === 'RATIO'
                                            ? 'bg-surface text-text-primary shadow-sm border border-border-subtle'
                                            : 'text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    By Ratio / %
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        haptics.selection();
                                        setSplitMode('AMOUNT');
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                                        splitMode === 'AMOUNT'
                                            ? 'bg-surface text-text-primary shadow-sm border border-border-subtle'
                                            : 'text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    By Exact Amount
                                </button>
                            </div>

                            {/* Preset Pills for Ratio Mode */}
                            {splitMode === 'RATIO' && (
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    <span className="text-[10px] uppercase font-bold text-text-muted shrink-0">Presets:</span>
                                    {PRESET_RATIOS.map(preset => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => applyPreset(preset.weights)}
                                            className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-surface-subtle hover:bg-surface-hover border border-border-subtle text-text-primary active:scale-95 transition-all shrink-0"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Status Banner for Amount Mode */}
                            {splitMode === 'AMOUNT' && (
                                <div
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                                        Math.abs(remainingAmount) < 0.01
                                            ? 'bg-status-success-bg border-status-success-border text-status-success-text'
                                            : remainingAmount > 0
                                            ? 'bg-status-warning-bg border-status-warning-border text-status-warning-text'
                                            : 'bg-status-danger-bg border-status-danger-border text-status-danger-text'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {Math.abs(remainingAmount) < 0.01 ? (
                                            <Check size={16} className="text-status-success shrink-0" />
                                        ) : (
                                            <AlertCircle size={16} className="shrink-0" />
                                        )}
                                        <span>
                                            {Math.abs(remainingAmount) < 0.01
                                                ? 'Balanced! Exactly 100% allocated'
                                                : remainingAmount > 0
                                                ? `Remaining to allocate: ${formatRupees(remainingAmount)}`
                                                : `Overallocated by: ${formatRupees(Math.abs(remainingAmount))}`}
                                        </span>
                                    </div>
                                    <span className="font-mono font-semibold tabular-nums">
                                        Allocated: {formatRupees(totalAllocatedAmount)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Dynamic Slices List */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                            {slices.map((slice, idx) => {
                                const selectedCat = categories?.find(c => c.name === slice.category);
                                const subCategories = selectedCat?.sub_categories || [];
                                const ratioCalc = ratioCalculations[idx] || { amount: 0, percentage: 0 };

                                return (
                                    <div
                                        key={idx}
                                        className="bg-surface-subtle/60 border border-border-subtle rounded-2xl p-3.5 space-y-3 transition-all hover:border-border-default"
                                    >
                                        {/* Slice Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface border border-border-subtle text-text-muted">
                                                    Slice #{idx + 1}
                                                </span>
                                                {splitMode === 'RATIO' && (
                                                    <span className="text-xs font-mono font-semibold text-text-primary tabular-nums">
                                                        {formatRupees(ratioCalc.amount)}{' '}
                                                        <span className="text-text-muted font-normal text-[11px]">
                                                            ({ratioCalc.percentage.toFixed(1)}%)
                                                        </span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {splitMode === 'AMOUNT' && remainingAmount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => fillRemainderIntoSlice(idx)}
                                                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
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

                                        {/* Value Input (Ratio weight or Amount) & Remarks */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                            <div className="sm:col-span-5 space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                    {splitMode === 'RATIO' ? 'Ratio Weight' : 'Exact Amount (₹)'}
                                                </label>
                                                {splitMode === 'RATIO' ? (
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="any"
                                                            placeholder="e.g. 80"
                                                            value={slice.ratio}
                                                            onChange={e => updateSlice(idx, 'ratio', e.target.value)}
                                                            className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono tabular-nums text-text-primary focus:outline-none focus:border-border-default transition-all"
                                                        />
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
                                                            className="w-full bg-surface border border-border-subtle rounded-xl pl-7 pr-3 py-2 text-xs font-mono tabular-nums text-text-primary focus:outline-none focus:border-border-default transition-all"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="sm:col-span-7 space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                    Remarks (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Groceries, Personal portion"
                                                    value={slice.remarks}
                                                    onChange={e => updateSlice(idx, 'remarks', e.target.value)}
                                                    className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-border-default transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add Slice Button */}
                            <button
                                type="button"
                                onClick={addSlice}
                                className="w-full py-2.5 rounded-2xl bg-surface-subtle hover:bg-surface-hover border border-dashed border-border-subtle text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
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
                                className="px-5 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-hover text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!isValid || splitMutation.isPending}
                                className="px-6 py-2.5 rounded-xl bg-accent-solid text-text-on-accent text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
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
