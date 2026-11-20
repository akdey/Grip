import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus,
    Minus,
    Trash2,
    Loader2,
    Check,
    AlertCircle,
    GitFork,
    Equal
} from 'lucide-react';
import { Drawer } from '../ui/Drawer';
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

    // Auto-fill remainder into the last slice
    const fillLastRemainder = () => {
        if (remainingAmount <= 0 || slices.length === 0) return;
        fillRemainderIntoSlice(slices.length - 1);
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
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Split Transaction"
            height="max-h-[85vh] h-auto"
            noPadding={true}
        >
            <div className="flex flex-col h-full select-text">
                {/* Clean Sub-header: Merchant & Total amount only */}
                <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-border-subtle shrink-0">
                    <span className="text-[11px] font-medium text-text-muted truncate max-w-[65%]">
                        {transaction?.merchant_name || 'Transaction'} {formattedDate ? `• ${formattedDate}` : ''}
                    </span>
                    <span className="text-xs font-bold font-mono tabular-nums text-text-primary shrink-0">
                        Total {formatRupees(absTotal)}
                    </span>
                </div>

                {/* Compact Mode Switcher & Presets Toolbar (Small fonts, no repeating info) */}
                <div className="px-5 py-2.5 border-b border-border-subtle/60 flex items-center justify-between gap-2 overflow-x-auto shrink-0 no-scrollbar">
                    {/* Small font toggle */}
                    <div className="flex items-center gap-1.5 shrink-0">
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
                                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
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
                                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                                    splitMode === 'AMOUNT'
                                        ? 'bg-surface text-text-primary shadow-xs border border-border-subtle/50'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                Amount (₹)
                            </button>
                        </div>
                    </div>

                    {/* Presets or Equal split in small pills */}
                    <div className="flex items-center gap-1 shrink-0">
                        {splitMode === 'RATIO' ? (
                            <>
                                {PRESET_RATIOS.map(p => (
                                    <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => applyPreset(p.weights)}
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border transition-all ${
                                            activePresetLabel === p.label
                                                ? 'bg-accent-solid text-text-on-accent border-accent-solid'
                                                : 'bg-surface-subtle hover:bg-surface-hover border-border-subtle text-text-muted hover:text-text-primary'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </>
                        ) : null}
                        <button
                            type="button"
                            onClick={handleSplitEvenly}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-subtle hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-text-primary transition-all"
                            title="Split equally across slices"
                        >
                            <Equal size={10} />
                            <span>Equal</span>
                        </button>
                    </div>
                </div>

                {/* Playing Cards Horizontal Deck (No vertical scroll!) */}
                <div className="px-5 py-3.5 flex-1 flex flex-col justify-center min-h-0">
                    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 pt-1 no-scrollbar items-stretch">
                        {slices.map((slice, idx) => {
                            const selectedCat = categories?.find(c => c.name === slice.category);
                            const subCategories = selectedCat?.sub_categories || [];
                            const ratioCalc = ratioCalculations[idx] || { amount: 0, percentage: 0 };
                            const sliceColor = selectedCat?.color || '#38bdf8';

                            return (
                                <div
                                    key={idx}
                                    className="w-[245px] sm:w-[265px] shrink-0 snap-start bg-surface-subtle/70 hover:bg-surface-subtle border border-border-subtle rounded-2xl p-3 flex flex-col justify-between space-y-2.5 transition-all shadow-xs relative"
                                >
                                    {/* Playing Card Top: Card index & icon + Delete */}
                                    <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle/50">
                                        <div className="flex items-center gap-1.5">
                                            <div
                                                className="w-5 h-5 rounded-md flex items-center justify-center border shadow-2xs"
                                                style={{
                                                    backgroundColor: `${sliceColor}18`,
                                                    borderColor: `${sliceColor}30`,
                                                    color: sliceColor
                                                }}
                                            >
                                                <CategoryIcon name={slice.sub_category || slice.category || 'tag'} size={12} />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                                Card {idx + 1} of {slices.length}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {splitMode === 'AMOUNT' && remainingAmount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => fillRemainderIntoSlice(idx)}
                                                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-accent-subtle/70 border border-accent-border/40 text-accent hover:opacity-80 active:scale-95 transition-all"
                                                    title="Fill remainder"
                                                >
                                                    + Rem
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeSlice(idx)}
                                                disabled={slices.length <= 2}
                                                className="w-6 h-6 rounded-md bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-status-danger-text hover:bg-status-danger-bg hover:border-status-danger-border active:scale-90 transition-all disabled:opacity-20 disabled:pointer-events-none"
                                                title="Remove slice"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Middle: Category Selectors */}
                                    <div className="space-y-1.5 flex-1">
                                        <div>
                                            <label className="text-[9px] font-bold uppercase tracking-wider text-text-muted block mb-0.5">
                                                Category
                                            </label>
                                            <select
                                                value={slice.category}
                                                onChange={e => updateSlice(idx, 'category', e.target.value)}
                                                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-[11px] font-medium text-text-primary focus:outline-none focus:border-border-default transition-all"
                                            >
                                                <option value="" disabled>Select Category</option>
                                                {categories?.map(c => (
                                                    <option key={c.id || c.name} value={c.name}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-bold uppercase tracking-wider text-text-muted block mb-0.5">
                                                Sub-Category
                                            </label>
                                            <select
                                                value={slice.sub_category}
                                                onChange={e => updateSlice(idx, 'sub_category', e.target.value)}
                                                disabled={!slice.category}
                                                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-[11px] font-medium text-text-primary focus:outline-none focus:border-border-default transition-all disabled:opacity-50"
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

                                        <div>
                                            <label className="text-[9px] font-bold uppercase tracking-wider text-text-muted block mb-0.5">
                                                Remarks
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Groceries"
                                                value={slice.remarks}
                                                onChange={e => updateSlice(idx, 'remarks', e.target.value)}
                                                className="w-full bg-surface border border-border-subtle rounded-lg px-2 py-1 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-border-default transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Card Bottom / Suit Value: Stepper or Amount */}
                                    <div className="pt-2 border-t border-border-subtle/50">
                                        {splitMode === 'RATIO' ? (
                                            <div className="flex items-center justify-between gap-1.5">
                                                <div className="flex items-center gap-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => adjustWeight(idx, -5)}
                                                        className="w-6 h-6 rounded bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90"
                                                    >
                                                        <Minus size={10} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="any"
                                                        value={slice.ratio}
                                                        onChange={e => updateSlice(idx, 'ratio', e.target.value)}
                                                        className="w-12 bg-surface border border-border-subtle rounded px-1 py-0.5 text-center text-xs font-mono font-bold tabular-nums text-text-primary focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => adjustWeight(idx, 5)}
                                                        className="w-6 h-6 rounded bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90"
                                                    >
                                                        <Plus size={10} />
                                                    </button>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-xs font-bold font-mono tabular-nums text-text-primary block leading-tight">
                                                        {formatRupees(ratioCalc.amount)}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-text-muted block leading-none">
                                                        {ratioCalc.percentage.toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-1.5">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-mono">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={slice.amount}
                                                        onChange={e => updateSlice(idx, 'amount', e.target.value)}
                                                        className="w-full bg-surface border border-border-subtle rounded-lg pl-5 pr-2 py-1 text-xs font-mono font-bold tabular-nums text-text-primary focus:outline-none"
                                                    />
                                                </div>
                                                <span className="text-[10px] font-mono text-text-muted tabular-nums shrink-0">
                                                    {absTotal > 0 ? (((parseFloat(slice.amount) || 0) / absTotal) * 100).toFixed(0) : 0}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Deal New Playing Card (Add Slice) */}
                        <div
                            onClick={addSlice}
                            className="w-[120px] sm:w-[130px] shrink-0 snap-start rounded-2xl border-2 border-dashed border-border-subtle hover:border-border-default flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-surface-subtle transition-all active:scale-95 text-text-muted hover:text-text-primary group select-none min-h-[220px]"
                            title="Add another split slice"
                        >
                            <div className="w-8 h-8 rounded-full bg-surface-subtle group-hover:bg-surface border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-text-primary transition-all">
                                <Plus size={15} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                Add Card
                            </span>
                        </div>
                    </div>
                </div>

                {/* Clean Sticky Bottom Bar (Rethought buttons) */}
                <div className="px-5 py-3 border-t border-border-subtle bg-surface flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                        {splitMode === 'AMOUNT' ? (
                            Math.abs(remainingAmount) < 0.01 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-success uppercase tracking-wider">
                                    <Check size={12} /> Balanced
                                </span>
                            ) : remainingAmount > 0 ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-status-warning">
                                        Remaining: {formatRupees(remainingAmount)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={fillLastRemainder}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle text-text-primary hover:bg-surface-hover active:scale-95 transition-all"
                                    >
                                        + Fill
                                    </button>
                                </div>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-danger uppercase tracking-wider">
                                    <AlertCircle size={12} /> Over by {formatRupees(Math.abs(remainingAmount))}
                                </span>
                            )
                        ) : (
                            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                                {slices.length} Cards • 100% Split
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={splitMutation.isPending}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!isValid || splitMutation.isPending}
                            className="px-5 py-2 rounded-xl bg-accent-solid text-text-on-accent text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none touch-manipulation"
                        >
                            {splitMutation.isPending ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Splitting...</span>
                                </>
                            ) : (
                                <>
                                    <Check size={13} />
                                    <span>Split & Verify</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Drawer>
    );
};
