import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Loader2,
    Check,
    AlertCircle,
    SlidersHorizontal,
    Equal
} from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { useCategories } from '../../features/transactions/categoryHooks';
import { useSplitTransaction, type Transaction } from '../../features/transactions/hooks';
import { CategoryIcon } from '../ui/CategoryIcon';
import { haptics } from '../../lib/haptics';
import { toast } from '../../lib/toast';
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

    // Initial state setup with empty/unpopulated ratios
    const [slices, setSlices] = useState<SliceState[]>([
        {
            category: transaction?.category || '',
            sub_category: transaction?.sub_category || '',
            ratio: '',
            amount: '',
            remarks: transaction?.remarks || ''
        },
        {
            category: '',
            sub_category: '',
            ratio: '',
            amount: '',
            remarks: ''
        }
    ]);

    // Re-initialize when modal opens or transaction changes
    useEffect(() => {
        if (isOpen && transaction) {
            setSlices([
                {
                    category: transaction.category || '',
                    sub_category: transaction.sub_category || '',
                    ratio: '',
                    amount: '',
                    remarks: transaction.remarks || ''
                },
                {
                    category: '',
                    sub_category: '',
                    ratio: '',
                    amount: '',
                    remarks: ''
                }
            ]);
            setSplitMode('RATIO');
        }
    }, [isOpen, transaction]);

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
            return acc + (isNaN(num) || num <= 0 ? 0 : num);
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
            return acc + (isNaN(val) || val <= 0 ? 0 : val);
        }, 0);
    }, [slices]);

    const remainingAmount = useMemo(() => {
        return Number((absTotal - totalAllocatedAmount).toFixed(2));
    }, [absTotal, totalAllocatedAmount]);

    // Lookup category details from subcategory
    const getSubCategoryDetails = (subCatName: string) => {
        for (const c of categories || []) {
            const found = c.sub_categories?.find(s => s.name === subCatName);
            if (found) {
                return {
                    parentCategory: c.name,
                    icon: found.icon || c.icon,
                    color: found.color || c.color
                };
            }
        }
        return { parentCategory: 'Uncategorized', icon: 'tag', color: '#38bdf8' };
    };

    // Handle single dropdown change (auto-sets subcategory and parent category)
    const handleSubCategoryChange = (idx: number, subCatName: string) => {
        const { parentCategory } = getSubCategoryDetails(subCatName);
        setSlices(prev => {
            const updated = [...prev];
            updated[idx] = {
                ...updated[idx],
                sub_category: subCatName,
                category: parentCategory
            };
            return updated;
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

    // Slice manipulations
    const updateSlice = (index: number, field: keyof SliceState, value: string) => {
        setSlices(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addSlice = () => {
        haptics.impact('light');
        setSlices(prev => [
            ...prev,
            {
                category: '',
                sub_category: '',
                ratio: '',
                amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : '',
                remarks: ''
            }
        ]);
    };

    const removeSlice = (index: number) => {
        if (slices.length <= 2) return;
        haptics.impact('light');
        setSlices(prev => prev.filter((_, i) => i !== index));
    };

    // Auto-fill remainder into the last slice
    const fillLastRemainder = () => {
        if (remainingAmount <= 0 || slices.length === 0) return;
        haptics.impact('light');
        const lastIdx = slices.length - 1;
        setSlices(prev => {
            const updated = [...prev];
            const currentAmt = parseFloat(updated[lastIdx].amount) || 0;
            updated[lastIdx] = {
                ...updated[lastIdx],
                amount: (currentAmt + remainingAmount).toFixed(2)
            };
            return updated;
        });
    };

    // Validation check with error message
    const getValidationError = (): string | null => {
        if (slices.length < 2) return 'Split requires at least 2 parts.';

        for (let i = 0; i < slices.length; i++) {
            if (!slices[i].sub_category.trim()) {
                return `Please select a category for Part ${i + 1}.`;
            }
        }

        if (splitMode === 'RATIO') {
            for (let i = 0; i < slices.length; i++) {
                const w = parseFloat(slices[i].ratio);
                if (isNaN(w) || w <= 0) {
                    return `Please enter a valid ratio percentage for Part ${i + 1}.`;
                }
            }
            if (totalRatio <= 0) return 'Total ratio percentage must be greater than zero.';
        } else {
            for (let i = 0; i < slices.length; i++) {
                const amt = parseFloat(slices[i].amount);
                if (isNaN(amt) || amt <= 0) {
                    return `Please enter a valid amount for Part ${i + 1}.`;
                }
            }
            if (Math.abs(remainingAmount) >= 0.01) {
                if (remainingAmount > 0) {
                    return `Unallocated balance of ${formatRupees(remainingAmount)} remaining.`;
                } else {
                    return `Allocated amount exceeds total by ${formatRupees(Math.abs(remainingAmount))}.`;
                }
            }
        }

        return null;
    };

    // Submit handler
    const handleSubmit = async () => {
        const err = getValidationError();
        if (err) {
            haptics.notification('error');
            toast.error(err);
            return;
        }

        haptics.impact('medium');

        const requestData = {
            split_mode: splitMode,
            splits: slices.map((s) => {
                if (splitMode === 'RATIO') {
                    return {
                        category: s.category || 'Uncategorized',
                        sub_category: s.sub_category,
                        ratio: parseFloat(s.ratio),
                        remarks: s.remarks.trim() || undefined
                    };
                } else {
                    return {
                        category: s.category || 'Uncategorized',
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
                onError: (apiErr: any) => {
                    haptics.notification('error');
                    toast.error(apiErr?.response?.data?.detail || 'Failed to split transaction');
                }
            }
        );
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Split Transaction"
            height="max-h-[92vh] h-auto"
            noPadding={true}
        >
            <div className="flex flex-col h-full select-text pb-2">
                {/* Clean Sub-header: Merchant & Total amount only */}
                <div className="px-6 pt-3.5 pb-2.5 flex items-center justify-between border-b border-border-subtle shrink-0">
                    <span className="text-xs font-medium text-text-muted truncate max-w-[65%]">
                        {transaction?.merchant_name || 'Transaction'} {formattedDate ? `• ${formattedDate}` : ''}
                    </span>
                    <span className="text-sm font-bold font-mono tabular-nums text-text-primary shrink-0">
                        Total {formatRupees(absTotal)}
                    </span>
                </div>

                {/* Compact Mode Switcher & Equal Split Action */}
                <div className="px-6 py-3 border-b border-border-subtle/60 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                            Split by:
                        </span>
                        <div className="inline-flex p-0.5 bg-surface-subtle border border-border-subtle rounded-lg gap-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    setSplitMode('RATIO');
                                }}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                                    splitMode === 'RATIO'
                                        ? 'bg-surface text-text-primary shadow-xs border border-border-subtle/50'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                Ratio (%)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    setSplitMode('AMOUNT');
                                }}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                                    splitMode === 'AMOUNT'
                                        ? 'bg-surface text-text-primary shadow-xs border border-border-subtle/50'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                Amount (₹)
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSplitEvenly}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold bg-surface-subtle hover:bg-surface-hover border border-border-subtle text-text-primary active:scale-95 transition-all"
                        title="Split equally across all parts"
                    >
                        <Equal size={11} />
                        <span>Split Evenly</span>
                    </button>
                </div>

                {/* Spacious Horizontal Carousel (No vertical scroll, larger cards) */}
                <div className="px-6 py-4 flex-1 flex flex-col justify-center min-h-[300px]">
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 no-scrollbar items-stretch">
                        {slices.map((slice, idx) => {
                            const details = getSubCategoryDetails(slice.sub_category);
                            const ratioCalc = ratioCalculations[idx] || { amount: 0, percentage: 0 };
                            const sliceColor = details.color;

                            return (
                                <div
                                    key={idx}
                                    className="w-[280px] sm:w-[320px] shrink-0 snap-start bg-surface-subtle/80 hover:bg-surface-subtle border border-border-subtle rounded-3xl p-4 flex flex-col justify-between space-y-4 transition-all shadow-xs relative"
                                >
                                    {/* Part Header: Tag, Icon, and Delete */}
                                    <div className="flex items-center justify-between pb-2 border-b border-border-subtle/50">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-lg flex items-center justify-center border shadow-2xs shrink-0"
                                                style={{
                                                    backgroundColor: `${sliceColor}18`,
                                                    borderColor: `${sliceColor}30`,
                                                    color: sliceColor
                                                }}
                                            >
                                                <CategoryIcon name={details.icon} size={13} />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                                Part #{idx + 1}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeSlice(idx)}
                                            disabled={slices.length <= 2}
                                            className="w-7 h-7 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-status-danger-text hover:bg-status-danger-bg hover:border-status-danger-border active:scale-90 transition-all disabled:opacity-20 disabled:pointer-events-none"
                                            title="Remove part"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>

                                    {/* Unified Category Selector & Remarks (No redundant primary category select!) */}
                                    <div className="space-y-3 flex-1">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                Category
                                            </label>
                                            <select
                                                value={slice.sub_category}
                                                onChange={e => handleSubCategoryChange(idx, e.target.value)}
                                                className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-medium text-text-primary focus:outline-none focus:border-border-default transition-all"
                                            >
                                                <option value="" disabled>Select Category...</option>
                                                {categories?.map(c => (
                                                    <optgroup key={c.id || c.name} label={c.name}>
                                                        {c.sub_categories?.map(s => (
                                                            <option key={s.id || s.name} value={s.name}>
                                                                {s.name}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                Remarks (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Personal items, Groceries"
                                                value={slice.remarks}
                                                onChange={e => updateSlice(idx, 'remarks', e.target.value)}
                                                className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-border-default transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Part Value: Input & Resulting Amount */}
                                    <div className="pt-3 border-t border-border-subtle/50 space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                            {splitMode === 'RATIO' ? 'Ratio Weight (%)' : 'Amount (₹)'}
                                        </label>

                                        {splitMode === 'RATIO' ? (
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="any"
                                                        placeholder="e.g. 50"
                                                        value={slice.ratio}
                                                        onChange={e => updateSlice(idx, 'ratio', e.target.value)}
                                                        className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono font-bold tabular-nums text-text-primary focus:outline-none focus:border-border-default"
                                                    />
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <span className="text-sm font-bold font-mono tabular-nums text-text-primary block leading-tight">
                                                        {formatRupees(ratioCalc.amount)}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-text-muted block leading-tight">
                                                        {ratioCalc.percentage > 0 ? `${ratioCalc.percentage.toFixed(1)}%` : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-mono">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={slice.amount}
                                                        onChange={e => updateSlice(idx, 'amount', e.target.value)}
                                                        className="w-full bg-surface border border-border-subtle rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold tabular-nums text-text-primary focus:outline-none focus:border-border-default"
                                                    />
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[10px] font-mono text-text-muted tabular-nums block">
                                                        {absTotal > 0 && parseFloat(slice.amount) > 0
                                                            ? `${(((parseFloat(slice.amount) || 0) / absTotal) * 100).toFixed(1)}%`
                                                            : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add Part Slot */}
                        <div
                            onClick={addSlice}
                            className="w-[140px] sm:w-[160px] shrink-0 snap-start rounded-3xl border-2 border-dashed border-border-subtle hover:border-border-default flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-surface-subtle transition-all active:scale-95 text-text-muted hover:text-text-primary group select-none min-h-[260px]"
                            title="Add another part"
                        >
                            <div className="w-9 h-9 rounded-full bg-surface-subtle group-hover:bg-surface border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-text-primary transition-all">
                                <Plus size={16} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                Add Part
                            </span>
                        </div>
                    </div>
                </div>

                {/* Clean Sticky Bottom Bar: Status on left, "Split" on right */}
                <div className="px-6 py-3.5 border-t border-border-subtle bg-surface flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                        {splitMode === 'AMOUNT' && (
                            Math.abs(remainingAmount) < 0.01 ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-success uppercase tracking-wider">
                                    <Check size={13} /> Balanced
                                </span>
                            ) : remainingAmount > 0 ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-status-warning">
                                        Remaining: {formatRupees(remainingAmount)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={fillLastRemainder}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-subtle border border-border-subtle text-text-primary hover:bg-surface-hover active:scale-95 transition-all"
                                    >
                                        + Fill
                                    </button>
                                </div>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-danger uppercase tracking-wider">
                                    <AlertCircle size={13} /> Over by {formatRupees(Math.abs(remainingAmount))}
                                </span>
                            )
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={splitMutation.isPending}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={splitMutation.isPending}
                            className="px-6 py-2.5 rounded-xl bg-accent-solid text-text-on-accent text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 active:scale-95 transition-all touch-manipulation disabled:opacity-50"
                        >
                            {splitMutation.isPending ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Splitting...</span>
                                </>
                            ) : (
                                <span>Split</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Drawer>
    );
};
