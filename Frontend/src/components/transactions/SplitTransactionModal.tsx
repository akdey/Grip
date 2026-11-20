import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Loader2,
    Check,
    AlertCircle,
    Percent,
    IndianRupee
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

    // Initial state setup with 50/50 balance
    const [slices, setSlices] = useState<SliceState[]>([
        {
            category: transaction?.category || '',
            sub_category: transaction?.sub_category || '',
            ratio: '50',
            amount: ((absTotal * 50) / 100).toFixed(2),
            remarks: transaction?.remarks || ''
        },
        {
            category: transaction?.category || '',
            sub_category: '',
            ratio: '50',
            amount: (absTotal - parseFloat(((absTotal * 50) / 100).toFixed(2))).toFixed(2),
            remarks: ''
        }
    ]);

    // Re-initialize when modal opens or transaction changes
    useEffect(() => {
        if (isOpen && transaction) {
            const firstCat = transaction.category || (categories && categories[0]?.name) || '';
            const firstSub = transaction.sub_category || '';
            const halfAmt = Number(((absTotal * 50) / 100).toFixed(2));
            const remainAmt = Number((absTotal - halfAmt).toFixed(2));

            setSlices([
                {
                    category: firstCat,
                    sub_category: firstSub,
                    ratio: '50',
                    amount: halfAmt.toFixed(2),
                    remarks: transaction.remarks || ''
                },
                {
                    category: firstCat,
                    sub_category: '',
                    ratio: '50',
                    amount: remainAmt.toFixed(2),
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

    // Lookup category details from category and subcategory
    const getCategoryDetails = (catName: string, subCatName: string) => {
        const parent = categories?.find(c => c.name.toLowerCase() === (catName || '').toLowerCase());
        if (parent) {
            const sub = parent.sub_categories?.find(s => s.name.toLowerCase() === (subCatName || '').toLowerCase());
            return {
                parentCategory: parent.name,
                icon: sub?.icon || parent.icon || 'tag',
                color: sub?.color || parent.color || '#38bdf8'
            };
        }
        for (const c of categories || []) {
            const found = c.sub_categories?.find(s => s.name.toLowerCase() === (subCatName || '').toLowerCase());
            if (found) {
                return {
                    parentCategory: c.name,
                    icon: found.icon || c.icon || 'tag',
                    color: found.color || c.color || '#38bdf8'
                };
            }
        }
        return { parentCategory: catName || 'Uncategorized', icon: 'tag', color: '#38bdf8' };
    };

    // Category and Subcategory selection handlers
    const handleCategoryChange = (idx: number, newCategory: string) => {
        setSlices(prev => {
            const updated = [...prev];
            const parentCat = categories?.find(c => c.name === newCategory);
            const firstSub = parentCat?.sub_categories?.[0]?.name || '';
            updated[idx] = {
                ...updated[idx],
                category: newCategory,
                sub_category: firstSub
            };
            return updated;
        });
    };

    const handleSubCategoryChange = (idx: number, newSubCategory: string) => {
        setSlices(prev => {
            const updated = [...prev];
            updated[idx] = {
                ...updated[idx],
                sub_category: newSubCategory
            };
            return updated;
        });
    };

    // Auto-balancing Ratio handler: modifying one slice automatically balances the last/other slice to total 100%
    const handleRatioChange = (idx: number, rawVal: string) => {
        if (rawVal === '') {
            updateSlice(idx, 'ratio', '');
            return;
        }

        const numVal = parseFloat(rawVal);
        if (isNaN(numVal) || numVal < 0) {
            updateSlice(idx, 'ratio', rawVal);
            return;
        }

        if (slices.length > 1) {
            // Adjust the last slice, or slice 0 if the user is editing the last slice
            const targetIdx = idx === slices.length - 1 ? 0 : slices.length - 1;
            const otherSum = slices.reduce((sum, s, i) => {
                if (i === targetIdx) return sum;
                if (i === idx) return sum + numVal;
                const v = parseFloat(s.ratio) || 0;
                return sum + v;
            }, 0);

            const remainder = Math.max(0, Number((100 - otherSum).toFixed(1)));
            setSlices(prev => {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ratio: rawVal };
                updated[targetIdx] = {
                    ...updated[targetIdx],
                    ratio: remainder % 1 === 0 ? remainder.toString() : remainder.toFixed(1)
                };
                return updated;
            });
        } else {
            updateSlice(idx, 'ratio', rawVal);
        }
    };

    // Auto-balancing Amount handler: modifying one slice automatically balances the last/other slice to total absTotal
    const handleAmountChange = (idx: number, rawVal: string) => {
        if (rawVal === '') {
            updateSlice(idx, 'amount', '');
            return;
        }

        const numVal = parseFloat(rawVal);
        if (isNaN(numVal) || numVal < 0) {
            updateSlice(idx, 'amount', rawVal);
            return;
        }

        if (slices.length > 1) {
            const targetIdx = idx === slices.length - 1 ? 0 : slices.length - 1;
            const otherSum = slices.reduce((sum, s, i) => {
                if (i === targetIdx) return sum;
                if (i === idx) return sum + numVal;
                const v = parseFloat(s.amount) || 0;
                return sum + v;
            }, 0);

            const remainder = Math.max(0, Number((absTotal - otherSum).toFixed(2)));
            setSlices(prev => {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], amount: rawVal };
                updated[targetIdx] = {
                    ...updated[targetIdx],
                    amount: remainder.toFixed(2)
                };
                return updated;
            });
        } else {
            updateSlice(idx, 'amount', rawVal);
        }
    };

    // Seamless mode switch carrying over percentages and amounts
    const handleModeSwitch = (mode: 'RATIO' | 'AMOUNT') => {
        haptics.selection();
        setSplitMode(mode);
        if (mode === 'AMOUNT') {
            setSlices(prev => prev.map((s, idx) => {
                const calc = ratioCalculations[idx];
                return {
                    ...s,
                    amount: (calc?.amount || 0).toFixed(2)
                };
            }));
        } else {
            setSlices(prev => prev.map((s) => {
                const amt = parseFloat(s.amount) || 0;
                const pct = absTotal > 0 ? (amt / absTotal) * 100 : 0;
                return {
                    ...s,
                    ratio: Math.round(pct).toString()
                };
            }));
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
        const nextLen = slices.length + 1;
        const firstCategory = slices[0]?.category || (categories && categories[0]?.name) || '';

        if (splitMode === 'RATIO') {
            const equalWeight = Math.floor(100 / nextLen);
            const remainder = 100 - (equalWeight * (nextLen - 1));

            setSlices(prev => {
                const updated = prev.map(s => ({ ...s, ratio: equalWeight.toString() }));
                updated.push({
                    category: firstCategory,
                    sub_category: '',
                    ratio: remainder.toString(),
                    amount: '',
                    remarks: ''
                });
                return updated;
            });
        } else {
            const perSlice = Number((absTotal / nextLen).toFixed(2));
            const remainder = Number((absTotal - (perSlice * (nextLen - 1))).toFixed(2));

            setSlices(prev => {
                const updated = prev.map(s => ({ ...s, amount: perSlice.toFixed(2) }));
                updated.push({
                    category: firstCategory,
                    sub_category: '',
                    ratio: '',
                    amount: remainder.toFixed(2),
                    remarks: ''
                });
                return updated;
            });
        }
    };

    const removeSlice = (index: number) => {
        if (slices.length <= 2) return;
        haptics.impact('light');
        setSlices(prev => {
            const removed = prev[index];
            const filtered = prev.filter((_, i) => i !== index);
            const lastIdx = filtered.length - 1;

            if (splitMode === 'RATIO') {
                const removedWeight = parseFloat(removed.ratio) || 0;
                const currentLastWeight = parseFloat(filtered[lastIdx].ratio) || 0;
                const newWeight = Math.round(currentLastWeight + removedWeight);
                filtered[lastIdx] = { ...filtered[lastIdx], ratio: newWeight.toString() };
            } else {
                const removedAmt = parseFloat(removed.amount) || 0;
                const currentLastAmt = parseFloat(filtered[lastIdx].amount) || 0;
                const newAmt = Number((currentLastAmt + removedAmt).toFixed(2));
                filtered[lastIdx] = { ...filtered[lastIdx], amount: newAmt.toFixed(2) };
            }
            return filtered;
        });
    };

    // Validation check with error message
    const getValidationError = (): string | null => {
        if (slices.length < 2) return 'Split requires at least 2 parts.';

        for (let i = 0; i < slices.length; i++) {
            if (!slices[i].category.trim()) {
                return `Please select a category for Part ${i + 1}.`;
            }
            if (!slices[i].sub_category.trim()) {
                return `Please select a sub-category for Part ${i + 1}.`;
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
            if (Math.abs(remainingAmount) >= 0.02) {
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
                        sub_category: s.sub_category || 'General',
                        ratio: parseFloat(s.ratio),
                        remarks: s.remarks.trim() || undefined
                    };
                } else {
                    return {
                        category: s.category || 'Uncategorized',
                        sub_category: s.sub_category || 'General',
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
                {/* Clean Sub-header: Merchant name & Date */}
                <div className="px-6 pt-3 pb-2 flex items-center justify-between border-b border-border-subtle shrink-0">
                    <span className="text-xs font-semibold text-text-primary truncate max-w-[65%]">
                        {transaction?.merchant_name || 'Transaction'}
                    </span>
                    {formattedDate && (
                        <span className="text-xs font-mono text-text-muted shrink-0">
                            {formattedDate}
                        </span>
                    )}
                </div>

                {/* Single Inline Row: Split by (Ratio & Amount with inline icons) & Total Amount */}
                <div className="px-6 py-2.5 border-b border-border-subtle/60 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            Split by:
                        </span>
                        <div className="inline-flex p-0.5 bg-surface-subtle border border-border-subtle rounded-lg gap-0.5">
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('RATIO')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                                    splitMode === 'RATIO'
                                        ? 'bg-surface text-text-primary shadow-xs border border-border-subtle/50'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                <Percent size={11} />
                                <span>Ratio</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('AMOUNT')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                                    splitMode === 'AMOUNT'
                                        ? 'bg-surface text-text-primary shadow-xs border border-border-subtle/50'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                <IndianRupee size={11} />
                                <span>Amount</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total</span>
                        <span className="text-sm font-bold font-mono tabular-nums text-text-primary">
                            {formatRupees(absTotal)}
                        </span>
                    </div>
                </div>

                {/* Spacious Horizontal Carousel (Cards with Category, Sub-Category, and Auto-balanced Inputs) */}
                <div className="px-6 py-4 flex-1 flex flex-col justify-center min-h-[340px]">
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 no-scrollbar items-stretch">
                        {slices.map((slice, idx) => {
                            const details = getCategoryDetails(slice.category, slice.sub_category);
                            const ratioCalc = ratioCalculations[idx] || { amount: 0, percentage: 0 };
                            const sliceColor = details.color;

                            return (
                                <div
                                    key={idx}
                                    className="w-[285px] sm:w-[325px] shrink-0 snap-start bg-surface-subtle/80 hover:bg-surface-subtle border border-border-subtle rounded-3xl p-4 flex flex-col justify-between space-y-3.5 transition-all shadow-xs relative"
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

                                    {/* Category, Sub-Category & Remarks */}
                                    <div className="space-y-2.5 flex-1">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                Category
                                            </label>
                                            <select
                                                value={slice.category}
                                                onChange={e => handleCategoryChange(idx, e.target.value)}
                                                className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-medium text-text-primary focus:outline-none focus:border-border-default transition-all"
                                            >
                                                <option value="" disabled>Select Category...</option>
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
                                                onChange={e => handleSubCategoryChange(idx, e.target.value)}
                                                disabled={!slice.category}
                                                className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs font-medium text-text-primary focus:outline-none focus:border-border-default transition-all disabled:opacity-40"
                                            >
                                                <option value="" disabled>Select Sub-category...</option>
                                                {categories
                                                    ?.find(c => c.name.toLowerCase() === slice.category.toLowerCase())
                                                    ?.sub_categories?.map(s => (
                                                        <option key={s.id || s.name} value={s.name}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                                                Remarks (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Groceries, Personal items"
                                                value={slice.remarks}
                                                onChange={e => updateSlice(idx, 'remarks', e.target.value)}
                                                className="w-full bg-surface border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-border-default transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Part Value: Input & Resulting Amount (Auto-balances other parts) */}
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
                                                        max="100"
                                                        step="any"
                                                        placeholder="e.g. 50"
                                                        value={slice.ratio}
                                                        onChange={e => handleRatioChange(idx, e.target.value)}
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
                                                        max={absTotal}
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={slice.amount}
                                                        onChange={e => handleAmountChange(idx, e.target.value)}
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
                            className="w-[140px] sm:w-[160px] shrink-0 snap-start rounded-3xl border-2 border-dashed border-border-subtle hover:border-border-default flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-surface-subtle transition-all active:scale-95 text-text-muted hover:text-text-primary group select-none min-h-[300px]"
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
                        {splitMode === 'AMOUNT' ? (
                            Math.abs(remainingAmount) < 0.02 ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-success uppercase tracking-wider">
                                    <Check size={13} /> Balanced
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-warning uppercase tracking-wider">
                                    <AlertCircle size={13} />
                                    {remainingAmount > 0 ? `Remaining: ${formatRupees(remainingAmount)}` : `Over by: ${formatRupees(Math.abs(remainingAmount))}`}
                                </span>
                            )
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-success uppercase tracking-wider">
                                <Check size={13} /> 100% Allocated
                            </span>
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
