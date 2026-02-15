import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, LayoutGroup } from 'framer-motion';
import { api } from '../lib/api';
import { useCreditCards } from '../features/credit-cards/hooks';
import { useCategories } from '../features/transactions/categoryHooks';
import type { TransactionType } from '../features/transactions/categoryHooks';
import { useTransaction, useVerifyTransaction, useDeleteTransaction } from '../features/transactions/hooks';
import {
    ArrowLeft,
    Trash2,
    Calendar,
    Clock,
    ChevronRight,
    Calculator,
    AlignLeft,
    Save,
    CreditCard,
    Banknote,
    Landmark,
    Search,
    ChevronLeft,
    ToggleLeft,
    ToggleRight,
    Check,
    Tag as TagIcon,
    X,
    Plus,
    Store,
    Sparkles
} from 'lucide-react';
import { format, parse, parseISO } from 'date-fns';
import { Drawer } from '../components/ui/Drawer';
import { CalculatorDrawer } from '../components/ui/CalculatorDrawer';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { Loader } from '../components/ui/Loader';

const AddEntry: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: creditCards } = useCreditCards();
    const { data: categories, isLoading: isCategoriesLoading } = useCategories();
    const { data: existingTxn, isLoading: isTxnLoading } = useTransaction(id);
    const verifyMutation = useVerifyTransaction();
    const deleteMutation = useDeleteTransaction();

    const [type, setType] = useState<TransactionType>('EXPENSE');

    // Form State
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [subCategory, setSubCategory] = useState<string | null>(null);
    const [merchantName, setMerchantName] = useState('');
    const [remarks, setRemarks] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [time, setTime] = useState(format(new Date(), 'HH:mm'));
    const [accountType, setAccountType] = useState('ACCOUNT'); // Default to Bank
    const [cardId, setCardId] = useState('');
    const [isSurety, setIsSurety] = useState(false);

    // Navigation and View states
    const [isCategoryOpen, setCategoryOpen] = useState(false);
    const [isCalculatorOpen, setCalculatorOpen] = useState(false);
    const [view, setView] = useState<'CATEGORIES' | 'SUBCATEGORIES'>('CATEGORIES');
    const [tempCategory, setTempCategory] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Add Mode state (for inline creation)
    const [isAddMode, setAddMode] = useState<'NONE' | 'CATEGORY' | 'SUB_CATEGORY'>('NONE');
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('Store');
    const [newColor, setNewColor] = useState('#6366f1');

    const dateInputRef = useRef<HTMLInputElement>(null);
    const timeInputRef = useRef<HTMLInputElement>(null);

    // Reset state when moving from edit to new
    useEffect(() => {
        if (!id) {
            setAmount('');
            setCategory(null);
            setSubCategory(null);
            setMerchantName('');
            setRemarks('');
            setTags([]);
            setIsSurety(false);
            setAccountType('ACCOUNT'); // Default to Bank
            setCardId('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setTime(format(new Date(), 'HH:mm'));
            setTempCategory(null);
            setView('CATEGORIES');
        }
    }, [id]);

    // Populate state if editing
    useEffect(() => {
        if (existingTxn && id) {
            setAmount(Math.abs(existingTxn.amount).toString());
            setCategory(existingTxn.category);
            setSubCategory(existingTxn.sub_category || 'Uncategorized');
            setMerchantName(existingTxn.merchant_name || '');
            setRemarks(existingTxn.remarks || '');
            setTags(existingTxn.tags || []);
            setIsSurety(existingTxn.is_surety);
            setAccountType(existingTxn.account_type === 'SAVINGS' ? 'ACCOUNT' : (existingTxn.credit_card_id ? 'CREDIT_CARD' : existingTxn.account_type));
            setCardId(existingTxn.credit_card_id || '');

            const txnDate = existingTxn.transaction_date ? parseISO(existingTxn.transaction_date) : (existingTxn.created_at ? parseISO(existingTxn.created_at) : new Date());
            setDate(format(txnDate, 'yyyy-MM-dd'));
            setTime(format(txnDate, 'HH:mm'));

            if (existingTxn.amount > 0) setType('INCOME');
            else setType('EXPENSE');
        }
    }, [existingTxn, id]);

    const mutation = useMutation({
        mutationFn: async () => {
            const finalAmount = type === 'EXPENSE' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
            const payload = {
                amount: finalAmount,
                merchant_name: merchantName || category || 'Unspecified',
                category: category || 'Uncategorized',
                sub_category: subCategory || 'Uncategorized',
                transaction_date: `${date}T${time}:00`,
                account_type: accountType === 'ACCOUNT' ? 'SAVINGS' : accountType,
                credit_card_id: (accountType === 'CREDIT_CARD' && cardId) ? cardId : null,
                remarks: remarks,
                tags: tags,
                is_manual: true,
                is_surety: isSurety
            };

            if (id) {
                await api.put(`/transactions/${id}`, payload);
            } else {
                await api.post('/transactions/', payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
            if (id) queryClient.invalidateQueries({ queryKey: ['transaction', id] });

        }
    });

    const handleSave = () => {
        mutation.mutate(undefined, {
            onSuccess: () => navigate(-1)
        });
    };

    const handleSaveAndNew = () => {
        mutation.mutate(undefined, {
            onSuccess: () => {
                setAmount('');
                setMerchantName('');
                setRemarks('');
                setTags([]);
                setCategory(null);
                setSubCategory(null);
                setIsSurety(false);
                setTempCategory(null);
                setView('CATEGORIES');
                // Keep Date, Time, Account Type, Card ID for faster entry
                // Maybe focus amount input?
                document.querySelector('input[type="number"]')?.focus();
            }
        });
    };

    const createCategoryMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/categories', data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setAddMode('NONE');
            setCategory(res.data.name);
            setSubCategory('Uncategorized');
            setCategoryOpen(false);
        }
    });

    const createSubCategoryMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/categories/sub-categories', data),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setAddMode('NONE');
            setSubCategory(res.data.name);
            setCategoryOpen(false);
        }
    });

    const handleCategorySelect = (cat: any) => {
        setTempCategory(cat);
        const subs = cat.sub_categories || [];
        if (subs && subs.length > 0) {
            setView('SUBCATEGORIES');
        } else {
            setCategory(cat.name);
            setSubCategory('Uncategorized');
            setCategoryOpen(false);
        }
    };

    const handleSubCategorySelect = (sub: any) => {
        setCategory(tempCategory.name);
        setSubCategory(sub.name);
        // Auto-set surety based on sub-category definition
        if (sub.is_surety) {
            setIsSurety(true);
        } else {
            // Keep existing state or reset? Generally safer to reset unless user manually set it?
            // User requested: "change toggle to ON... And disabled"
            // If sub-category says NO surety, we should probably allow manual usage.
            // If sub-category says YES surety, we force it ON.
            setIsSurety(false);
        }

        setCategoryOpen(false);
        setTimeout(() => {
            setView('CATEGORIES');
            setTempCategory(null);
        }, 300);
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const getSelectedCategory = () => categories?.find(c => c.name === category);
    const getSelectedSubCategory = () => getSelectedCategory()?.sub_categories?.find(s => s.name === subCategory);

    // Non-blocking loader for transaction editing
    if (id && isTxnLoading) return <Loader fullPage text="Retrieving Transaction..." />;

    return (
        <LayoutGroup id="add-entry">
            <div className="min-h-screen text-white flex flex-col pb-24 overflow-x-hidden">
                <header className="px-5 py-3.5 flex items-center justify-between sticky top-0 bg-[#050505]/60 backdrop-blur-3xl z-30 border-b border-white/[0.05]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                            <ArrowLeft size={16} />
                        </button>
                        <h1 className="text-sm font-black tracking-tight uppercase">
                            {existingTxn?.status === 'PENDING' ? 'Review Transaction' : (id ? 'Edit Entry' : 'New Entry')}
                        </h1>
                    </div>
                    {id && (
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this transaction?')) {
                                    deleteMutation.mutate(id, {
                                        onSuccess: () => navigate(-1)
                                    });
                                }
                            }}
                            className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 active:scale-90 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </header>

                {existingTxn?.status === 'PENDING' && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles size={16} className="text-amber-500" />
                            <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest">Action Required: Verify Intel</span>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm('Mark this transaction as incorrect and remove it?')) {
                                    verifyMutation.mutate({
                                        id: id!,
                                        data: {
                                            category: category || 'Uncategorized',
                                            sub_category: subCategory || 'Uncategorized',
                                            merchant_name: merchantName,
                                            approved: false
                                        }
                                    }, { onSuccess: () => navigate(-1) });
                                }
                            }}
                            className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-3 py-1.5 rounded-lg border border-rose-500/20"
                        >
                            Reject
                        </button>
                    </div>
                )}

                <div className="flex-1 space-y-6 animate-enter p-5">
                    {/* Magnitude & Mode */}
                    <div className="flex gap-2 p-1 bg-white/[0.02] rounded-2xl border border-white/[0.05] relative h-12">
                        {['EXPENSE', 'INCOME'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t as any)}
                                className={`
                                        relative flex-1 rounded-xl text-[9px] font-black uppercase tracking-[1.5px] transition-colors z-10
                                        ${type === t ? 'text-black font-extrabold' : 'text-gray-600 hover:text-gray-300'}
                                    `}
                            >
                                {t}
                                {type === t && (
                                    <motion.div
                                        layoutId="mode-indicator"
                                        className="absolute inset-0 bg-white rounded-xl -z-10 shadow-lg"
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[8px] text-gray-600 font-black uppercase tracking-[2px] ml-1 opacity-60">Magnitude</label>
                            <div className="flex items-center gap-3 group">
                                <span className="text-3xl text-gray-700 font-black tracking-tighter shrink-0">₹</span>
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0"
                                        className={`bg-transparent font-black w-full focus:outline-none placeholder-gray-900 tracking-tighter transition-all ${amount.length > 7 ? 'text-3xl' : amount.length > 5 ? 'text-4xl' : 'text-5xl'}`}
                                        autoFocus={!id}
                                    />
                                </div>
                                <button
                                    onClick={() => setCalculatorOpen(true)}
                                    className="w-10 h-10 bg-white/[0.03] border border-white/[0.08] rounded-lg flex items-center justify-center transition-all active:scale-90 text-gray-400"
                                >
                                    <Calculator size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Category Selector */}
                        <div className="space-y-2">
                            <label className="text-[8px] text-gray-600 font-black uppercase tracking-[2px] ml-1 opacity-60">Entity Type</label>
                            <div
                                className="flex items-center justify-between p-3.5 bg-white/[0.02] rounded-2xl border border-white/[0.05] cursor-pointer group active:scale-[0.98] transition-all"
                                onClick={() => { setView('CATEGORIES'); setCategoryOpen(true); }}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner border border-white/[0.08] transition-all"
                                        style={{
                                            backgroundColor: `${(getSelectedSubCategory()?.color || getSelectedCategory()?.color)}15` || 'rgba(255,255,255,0.03)',
                                            color: getSelectedSubCategory()?.color || getSelectedCategory()?.color || '#444'
                                        }}
                                    >
                                        <CategoryIcon
                                            name={getSelectedSubCategory()?.icon || getSelectedCategory()?.icon}
                                            size={20}
                                        />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-base font-black tracking-tight uppercase leading-tight ${category ? 'text-white' : 'text-gray-700'}`}>
                                            {category || 'Select Category'}
                                        </span>
                                        {subCategory && subCategory !== 'Uncategorized' && (
                                            <span className="text-[7px] text-cyan-500 font-black uppercase tracking-widest mt-0.5 opacity-80">{subCategory}</span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-800 transition-transform group-hover:translate-x-1" size={14} />
                            </div>
                        </div>

                        {/* Space-Time Row */}
                        <div className="space-y-2">
                            <label className="text-[8px] text-gray-600 font-black uppercase tracking-[2px] ml-1 opacity-60">Space-Time</label>
                            <div className="relative flex items-center justify-between p-3.5 bg-white/[0.02] rounded-2xl border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-all group active:scale-[0.98]">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-500">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-white/90 uppercase tracking-tighter leading-tight">
                                            {format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}
                                        </span>
                                        <span className="text-[7px] text-gray-600 font-bold uppercase tracking-[1px] mt-0.5 flex items-center gap-1.5 opacity-80">
                                            <Clock size={8} />
                                            {time}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-gray-800 group-hover:translate-x-1 transition-all" />
                                <div className="absolute inset-0 opacity-0">
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        className="absolute inset-0 w-full h-full cursor-pointer z-10"
                                        value={date}
                                        onChange={e => {
                                            setDate(e.target.value);
                                            setTimeout(() => timeInputRef.current?.showPicker(), 300);
                                        }}
                                    />
                                    <input
                                        ref={timeInputRef}
                                        type="time"
                                        className="absolute inset-0 w-full h-full cursor-pointer z-0"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Channel */}
                        <div className="space-y-2">
                            <label className="text-[8px] text-gray-600 font-black uppercase tracking-[2px] ml-1 opacity-60">Settlement Route</label>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                <button
                                    onClick={() => setAccountType('ACCOUNT')}
                                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all whitespace-nowrap min-w-[90px] justify-center ${accountType === 'ACCOUNT'
                                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                        : 'bg-white/[0.02] border-white/[0.05] text-gray-600'
                                        }`}
                                >
                                    <Landmark size={14} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Bank</span>
                                </button>
                                <button
                                    onClick={() => setAccountType('CASH')}
                                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all whitespace-nowrap min-w-[90px] justify-center ${accountType === 'CASH'
                                        ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                        : 'bg-white/[0.02] border-white/[0.05] text-gray-600'
                                        }`}
                                >
                                    <Banknote size={14} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Cash</span>
                                </button>
                                {creditCards?.map(card => (
                                    <button
                                        key={card.id}
                                        onClick={() => { setAccountType('CREDIT_CARD'); setCardId(card.id); }}
                                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all whitespace-nowrap min-w-[110px] justify-center ${accountType === 'CREDIT_CARD' && cardId === card.id
                                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                            : 'bg-white/[0.02] border-white/[0.05] text-gray-600'
                                            }`}
                                    >
                                        <CreditCard size={14} />
                                        <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[60px] text-left">{card.card_name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Merchant Name */}
                        <div className="space-y-2">
                            <label className="text-[8px] text-gray-600 font-black uppercase tracking-[2px] ml-1 opacity-60">Merchant / Counterparty</label>
                            <div className="flex items-center gap-3.5 p-3.5 bg-white/[0.02] rounded-2xl border border-white/[0.05] group">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-700 group-focus-within:text-white transition-colors">
                                    <Store size={16} />
                                </div>
                                <input
                                    placeholder="Where was this?"
                                    value={merchantName}
                                    onChange={e => setMerchantName(e.target.value)}
                                    className="bg-transparent flex-1 focus:outline-none text-white text-base font-bold placeholder-gray-800 uppercase tracking-tighter"
                                />
                            </div>
                        </div>


                        {/* Tags Section */}
                        <div className="space-y-2">
                            <label className="text-[8px] text-gray-600 font-black uppercase tracking-[2px] ml-1 opacity-60">Intelligence Tags</label>
                            <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/[0.05] space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 text-[9px] font-black uppercase tracking-wider">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                    {tags.length === 0 && <span className="text-[9px] text-gray-800 font-black uppercase tracking-widest py-1">No identifiers</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.05]">
                                        <TagIcon size={12} className="text-gray-700" />
                                        <input
                                            placeholder="Add label..."
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addTag()}
                                            className="bg-transparent flex-1 focus:outline-none text-[10px] text-white font-bold placeholder-gray-800 uppercase tracking-widest"
                                        />
                                    </div>
                                    <button
                                        onClick={addTag}
                                        className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center active:scale-90 transition-all"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Memoirs & Obligations */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[8px] text-gray-600 font-black uppercase tracking-[2px] ml-1 opacity-60">Memoirs</label>
                                <div className="flex items-center gap-3.5 p-3.5 bg-white/[0.02] rounded-2xl border border-white/[0.05] group">
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-700 group-focus-within:text-white transition-colors">
                                        <AlignLeft size={16} />
                                    </div>
                                    <textarea
                                        placeholder="Add remarks..."
                                        value={remarks}
                                        onChange={e => setRemarks(e.target.value)}
                                        rows={2}
                                        className="bg-transparent flex-1 focus:outline-none text-white text-sm font-bold placeholder-gray-800 uppercase tracking-tighter py-1"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                                <div className="flex items-center gap-3.5">
                                    <div className={`w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center transition-colors ${isSurety ? 'text-amber-500' : 'text-gray-800'}`}>
                                        <ToggleLeft size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-white/90 uppercase tracking-tight leading-tight">Fixed Obligation</span>
                                        <span className="text-[7px] text-gray-600 uppercase font-black tracking-[1px] mt-0.5">Surety / Bills</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        // Only toggle if not forced by sub-category
                                        if (getSelectedSubCategory()?.is_surety) return;
                                        setIsSurety(!isSurety);
                                    }}
                                    className={`p-1 transition-all active:scale-90 ${getSelectedSubCategory()?.is_surety ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!!getSelectedSubCategory()?.is_surety}
                                >
                                    {isSurety ? (
                                        <ToggleRight size={32} className="text-amber-500 opacity-80" />
                                    ) : (
                                        <ToggleLeft size={32} className="text-gray-900" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-3">
                    {existingTxn?.status === 'PENDING' ? (
                        <button
                            onClick={() => verifyMutation.mutate({
                                id: id!,
                                data: {
                                    category: category || 'Uncategorized',
                                    sub_category: subCategory || 'Uncategorized',
                                    merchant_name: merchantName,
                                    approved: true
                                }
                            }, { onSuccess: () => navigate(-1) })}
                            disabled={verifyMutation.isPending || !amount || !category}
                            className={`
                                h-14 px-8 rounded-full bg-white text-black flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all
                                ${verifyMutation.isPending || !amount || !category ? 'opacity-20' : 'hover:scale-105'}
                            `}
                        >
                            <span className="text-xs font-black uppercase tracking-widest">Approve</span>
                            <Check size={20} strokeWidth={3} />
                        </button>
                    ) : (
                        <>
                            {!id && (
                                <button
                                    onClick={handleSaveAndNew}
                                    disabled={mutation.isPending || !amount || !category}
                                    className={`
                                        w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all
                                        ${mutation.isPending || !amount || !category ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/20'}
                                    `}
                                    title="Save & Add Another"
                                >
                                    <Plus size={24} strokeWidth={2.5} />
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={mutation.isPending || !amount || !category}
                                className={`
                                    w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all
                                    ${mutation.isPending || !amount || !category ? 'opacity-20 cursor-not-allowed scale-90' : 'hover:scale-110 active:rotate-6'}
                                `}
                            >
                                <Save size={24} strokeWidth={2.5} />
                            </button>
                        </>
                    )}
                </div>

                <Drawer
                    isOpen={isCategoryOpen}
                    onClose={() => { setCategoryOpen(false); setAddMode('NONE'); setView('CATEGORIES'); }}
                    height="h-[92vh]"
                    noPadding
                    title={isAddMode !== 'NONE' ? `New ${isAddMode === 'CATEGORY' ? 'Entity' : 'Node'}` : (view === 'CATEGORIES' ? "Categories" : "Sub-Nodes")}
                >
                    <div className="flex-1 flex flex-col bg-[#121214] overflow-hidden">
                        {isAddMode === 'NONE' ? (
                            <div className="flex-1 flex flex-col min-h-0 relative">
                                <div className="p-6 pb-0">
                                    <div className="flex items-center gap-3 mb-6">
                                        {view === 'SUBCATEGORIES' && (
                                            <button
                                                onClick={() => setView('CATEGORIES')}
                                                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-cyan-500 active:scale-90 transition-all"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                        )}
                                        <div className="relative flex-1">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={14} />
                                            <input
                                                placeholder="Filter nodes..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full bg-white/[0.03] rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-800 focus:outline-none border border-white/[0.05] focus:border-white/[0.1] transition-all font-black uppercase text-[10px] tracking-widest"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 p-6 pt-0 pb-10 custom-scrollbar">
                                    {view === 'CATEGORIES' ? (
                                        categories?.filter(c => {
                                            const matchesType = type === 'EXPENSE'
                                                ? (c.type === 'EXPENSE' || c.type === 'INVESTMENT')
                                                : c.type === type;
                                            return matchesType && c.name.toLowerCase().includes(searchQuery.toLowerCase());
                                        }).map(cat => (
                                            <div
                                                key={cat.id}
                                                onClick={() => handleCategorySelect(cat)}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all cursor-pointer group active:scale-[0.98]"
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08]"
                                                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                                    >
                                                        <CategoryIcon name={cat.icon} size={18} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-white/90 text-sm uppercase tracking-tight">{cat.name}</span>
                                                        <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest leading-none mt-1">{cat.sub_categories.length} Nodes</span>
                                                    </div>
                                                </div>
                                                <ChevronRight size={14} className="text-gray-800 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/[0.03] border border-white/[0.08]">
                                                <div
                                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl border border-white/10 shadow-2xl"
                                                    style={{ backgroundColor: `${tempCategory?.color}20`, color: tempCategory?.color }}
                                                >
                                                    <CategoryIcon name={tempCategory?.icon} size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black text-white uppercase tracking-tight">{tempCategory?.name}</h4>
                                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[2px]">{type}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                {tempCategory?.sub_categories.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((sub: any) => (
                                                    <div
                                                        key={sub.id}
                                                        onClick={() => handleSubCategorySelect(sub)}
                                                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${subCategory === sub.name ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-white/[0.02] border-white/[0.05]'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/5"
                                                                style={{ backgroundColor: `${sub.color || tempCategory?.color}10`, color: sub.color || tempCategory?.color }}
                                                            >
                                                                <CategoryIcon name={sub.icon} size={14} fallback={<CategoryIcon name={tempCategory?.icon} size={14} />} />
                                                            </div>
                                                            <span className={`text-sm font-bold uppercase tracking-tight ${subCategory === sub.name ? 'text-cyan-400' : 'text-gray-400'}`}>{sub.name}</span>
                                                        </div>
                                                        {subCategory === sub.name && (
                                                            <Check size={14} className="text-cyan-500" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full space-y-10 p-6 pb-32 overflow-y-auto custom-scrollbar">
                                <div className="flex flex-col items-center gap-6 pt-6">
                                    <div
                                        className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-300 relative border border-white/10"
                                        style={{
                                            backgroundColor: `${newColor}15`,
                                            color: newColor,
                                            boxShadow: `0 20px 40px -10px ${newColor}30`
                                        }}
                                    >
                                        <CategoryIcon name={newIcon} size={32} />
                                    </div>
                                    <div className="flex flex-col items-center gap-1 w-full text-center px-4">
                                        <input
                                            placeholder="Identify..."
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            className="w-full bg-transparent border-none text-2xl font-black text-center focus:outline-none placeholder-gray-900 uppercase tracking-tighter"
                                            autoFocus
                                        />
                                        {isAddMode === 'SUB_CATEGORY' && (
                                            <p className="text-[8px] text-gray-700 font-black uppercase tracking-[5px] mt-2">
                                                Parent: {tempCategory?.name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 px-2">
                                    <h4 className="text-[10px] text-gray-700 font-black uppercase tracking-[4px] ml-1">Fluid Color</h4>
                                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                        {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b2d2', '#8b5cf6', '#ec4899'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setNewColor(c)}
                                                className={`w-10 h-10 rounded-full shrink-0 transition-all active:scale-75 ${newColor === c ? 'ring-2 ring-white ring-offset-4 ring-offset-[#050505] scale-110' : 'opacity-40'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto pt-10 sticky bottom-0 bg-[#050505] pb-10 z-[30]">
                                    <div className="flex gap-4 px-2">
                                        <button
                                            onClick={() => setAddMode('NONE')}
                                            className="flex-1 py-4 rounded-2xl bg-white/5 text-gray-600 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 border border-white/[0.05]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (isAddMode === 'CATEGORY') {
                                                    createCategoryMutation.mutate({ name: newName, icon: newIcon, color: newColor, type: type });
                                                } else {
                                                    createSubCategoryMutation.mutate({ name: newName, icon: newIcon, color: newColor, type: type, category_id: tempCategory.id });
                                                }
                                            }}
                                            disabled={!newName || createCategoryMutation.isPending || createSubCategoryMutation.isPending}
                                            className="flex-[2] py-4 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-[2px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 border-none"
                                        >
                                            <Save size={16} />
                                            {createCategoryMutation.isPending || createSubCategoryMutation.isPending ? 'Committing...' : 'Commit Node'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Drawer>

                <CalculatorDrawer
                    isOpen={isCalculatorOpen}
                    onClose={() => setCalculatorOpen(false)}
                    onConfirm={(val) => setAmount(val)}
                    initialValue={amount}
                />
            </div >
        </LayoutGroup >
    );
};

export default AddEntry;
