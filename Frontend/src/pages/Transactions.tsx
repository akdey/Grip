import React, { useState, useMemo, useEffect } from 'react';
// Transactions Page
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTransactions, usePendingTransactions, useVerifyTransaction, useDeleteTransaction } from '../features/transactions/hooks';
import { useCategories } from '../features/transactions/categoryHooks';
import {
    Receipt,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Filter,
    Check,
    Trash2,
    ArrowUpDown,
    Layers,
    Calendar,
    X
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    isSameYear,
    parseISO,
    startOfToday,
    differenceInCalendarDays,
    startOfYear,
    endOfYear,
    addYears,
    subYears,
    addDays,
    subDays
} from 'date-fns';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { Drawer } from '../components/ui/Drawer';
import { Loader } from '../components/ui/Loader';

const Transactions: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const view = searchParams.get('view') || 'all';

    // Data Hooks
    const { data: categories } = useCategories();

    // Filter State
    const [limit, setLimit] = useState(200);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isFilterOpen, setFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    // Sorting & Grouping State
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'category_asc' | 'merchant_asc'>('date_desc');
    const [groupBy, setGroupBy] = useState<'date' | 'category'>('date');

    // Initialize Drawer State from URL Params
    const [drawerCategories, setDrawerCategories] = useState<string[]>(() => {
        const cat = searchParams.get('category');
        return cat ? cat.split(',').filter(Boolean) : [];
    });
    const [drawerSubCategory, setDrawerSubCategory] = useState(searchParams.get('sub_category') || '');
    const [drawerDateRange, setDrawerDateRange] = useState<{ start: string; end: string }>({
        start: searchParams.get('start_date') || '',
        end: searchParams.get('end_date') || ''
    });

    // Synchronize drawer fields whenever searchParams or filter modal open changes
    useEffect(() => {
        const cat = searchParams.get('category');
        setDrawerCategories(cat ? cat.split(',').filter(Boolean) : []);
        setDrawerSubCategory(searchParams.get('sub_category') || '');
        setDrawerDateRange({
            start: searchParams.get('start_date') || '',
            end: searchParams.get('end_date') || ''
        });
    }, [searchParams, isFilterOpen]);

    const toggleCategory = (catName: string) => {
        setDrawerCategories(prev =>
            prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
        );
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);

    // Derive filters for the API Hook from URL Params directly
    const queryFilters = useMemo(() => {
        const filters: any = { limit };

        if (view === 'day') {
            filters.start_date = format(currentMonth, 'yyyy-MM-dd');
            filters.end_date = format(currentMonth, 'yyyy-MM-dd');
        } else if (view === 'month') {
            filters.start_date = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            filters.end_date = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
        } else if (view === 'year') {
            filters.start_date = format(startOfYear(currentMonth), 'yyyy-MM-dd');
            filters.end_date = format(endOfYear(currentMonth), 'yyyy-MM-dd');
        } else if (view === 'custom') {
            const start = searchParams.get('start_date');
            const end = searchParams.get('end_date');
            const cat = searchParams.get('category');
            const sub = searchParams.get('sub_category');

            if (start) filters.start_date = start;
            if (end) filters.end_date = end;
            if (cat) filters.category = cat;
            if (sub) filters.sub_category = sub;
        }

        return filters;
    }, [view, currentMonth, searchParams, limit]);

    // Fetch Data
    const { data: transactions, isLoading } = useTransactions(queryFilters);
    const { data: pendingTransactions } = usePendingTransactions();

    // Filter Status & Helpers
    const hasActiveFilters = Boolean(
        (view && view !== 'all') ||
        searchParams.get('category') ||
        searchParams.get('sub_category') ||
        searchParams.get('start_date') ||
        searchParams.get('end_date')
    );

    const verifiedCount = useMemo(() => {
        if (!transactions) return 0;
        return transactions.filter(t => t.status !== 'PENDING').length;
    }, [transactions]);

    const clearFilters = () => {
        setSearchParams({});
        setDrawerCategories([]);
        setDrawerSubCategory('');
        setDrawerDateRange({ start: '', end: '' });
        setFilterOpen(false);
    };

    const applyFilters = () => {
        const params: any = { view: 'custom' };
        if (drawerCategories.length > 0) params.category = drawerCategories.join(',');
        if (drawerSubCategory) params.sub_category = drawerSubCategory;
        if (drawerDateRange.start) params.start_date = drawerDateRange.start;
        if (drawerDateRange.end) params.end_date = drawerDateRange.end;

        setSearchParams(params);
        setFilterOpen(false);
    };

    // Grouping & Sorting Logic for Display
    const groupedTransactions = useMemo(() => {
        if (!transactions) return [];

        const parseTxnDate = (t: any) => t.transaction_date ? parseISO(t.transaction_date) : new Date(t.created_at);
        const verifiedOnly = transactions.filter(txn => txn.status !== 'PENDING');

        // 1. Sort verified transactions
        const sorted = [...verifiedOnly].sort((a, b) => {
            if (sortBy === 'date_desc') {
                return parseTxnDate(b).getTime() - parseTxnDate(a).getTime();
            }
            if (sortBy === 'date_asc') {
                return parseTxnDate(a).getTime() - parseTxnDate(b).getTime();
            }
            if (sortBy === 'amount_desc') {
                return Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0));
            }
            if (sortBy === 'amount_asc') {
                return Math.abs(Number(a.amount || 0)) - Math.abs(Number(b.amount || 0));
            }
            if (sortBy === 'category_asc') {
                return (a.category || '').localeCompare(b.category || '');
            }
            if (sortBy === 'merchant_asc') {
                const mA = (a.merchant_name || a.category || '').trim();
                const mB = (b.merchant_name || b.category || '').trim();
                return mA.localeCompare(mB);
            }
            return 0;
        });

        // 2. Group by Category
        if (groupBy === 'category') {
            const categoryMap = new Map<string, { label: string, items: any[], total: number, icon?: string, color?: string }>();
            sorted.forEach(txn => {
                const catName = txn.category || 'Uncategorized';
                if (!categoryMap.has(catName)) {
                    categoryMap.set(catName, {
                        label: catName,
                        items: [],
                        total: 0,
                        icon: txn.category_icon,
                        color: txn.category_color
                    });
                }
                const entry = categoryMap.get(catName)!;
                entry.items.push(txn);
                entry.total += Number(txn.amount || 0);
            });

            return Array.from(categoryMap.values()).sort((a, b) => {
                if (sortBy === 'category_asc') {
                    return a.label.localeCompare(b.label);
                }
                return Math.abs(b.total) - Math.abs(a.total);
            });
        }

        // 3. Group by Date
        const groups: { label: string, items: any[], total?: number, icon?: string, color?: string }[] = [];
        const now = startOfToday();

        sorted.forEach(txn => {
            const date = parseTxnDate(txn);
            let label = "";
            const daysDiff = differenceInCalendarDays(now, date);

            if (daysDiff === 0) {
                label = "Today";
            } else if (daysDiff === 1) {
                label = "Yesterday";
            } else if (daysDiff < 7 && daysDiff > 0) {
                label = format(date, 'EEEE');
            } else if (isSameMonth(date, now)) {
                label = "Earlier this Month";
            } else if (isSameYear(date, now)) {
                label = format(date, 'MMMM');
            } else {
                label = format(date, 'MMMM yyyy');
            }

            const existingGroup = groups.find(g => g.label === label);
            if (existingGroup) {
                existingGroup.items.push(txn);
            } else {
                groups.push({ label, items: [txn] });
            }
        });

        return groups;
    }, [transactions, sortBy, groupBy]);

    // Calendar Data
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const getDailyTotal = (date: Date) => {
        if (!transactions) return 0;
        return transactions
            .filter(t => isSameDay(t.transaction_date ? parseISO(t.transaction_date) : new Date(t.created_at), date))
            .reduce((sum, t) => sum + Number(t.amount), 0);
    };

    // Helper to get subcategories for selected categories in drawer
    const availableSubCategories = useMemo(() => {
        if (drawerCategories.length === 0 || !categories) return [];
        const selectedCats = categories.filter(c => drawerCategories.includes(c.name));
        return selectedCats.flatMap(c => c.sub_categories || []);
    }, [drawerCategories, categories]);

    if (isLoading && limit === 200) return <Loader fullPage text="Retrieving History" />;

    return (
        <div className="min-h-screen text-white pb-20">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#050505]/80 backdrop-blur-3xl z-30 border-b border-white/[0.05]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            {view === 'day' ? "Today" :
                                view === 'month' ? "Month View" :
                                    view === 'year' ? "Year View" :
                                        view === 'pending' ? "Action Center" :
                                            view === 'custom' ? "Filtered" :
                                                "History"}
                        </h1>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[2px] mt-0.5">
                            {view === 'day' ? format(currentMonth, 'EEE, dd MMM yyyy') :
                                view === 'month' ? format(currentMonth, 'MMMM yyyy') :
                                    view === 'year' ? format(currentMonth, 'yyyy') :
                                        `${verifiedCount} records`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Sort & Group Button */}
                    <button
                        onClick={() => setIsSortOpen(true)}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                            sortBy !== 'date_desc' || groupBy !== 'date'
                                ? 'bg-white/15 border-white/30 text-white shadow-sm'
                                : 'bg-white/[0.03] border-white/10 text-gray-400'
                        }`}
                        title="Sort & Group Ledger"
                    >
                        <ArrowUpDown size={18} />
                    </button>

                    {/* Filter Button - Active State Indication */}
                    <button
                        onClick={() => setFilterOpen(true)}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${hasActiveFilters ? 'bg-white/15 border-white/30 text-white shadow-sm' : 'bg-white/[0.03] border-white/10 text-gray-400'}`}
                        title="Filter Discovery"
                    >
                        <Filter size={18} />
                    </button>
                </div>
            </header>

            {/* Active Filter Banner with 1-click Clear Filter */}
            {hasActiveFilters && (
                <div className="mx-4 mt-3 px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between animate-enter">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider truncate">
                            {view === 'day' ? `Day: ${format(currentMonth, 'dd MMM yyyy')}` :
                             view === 'month' ? `Month: ${format(currentMonth, 'MMMM yyyy')}` :
                             view === 'year' ? `Year: ${format(currentMonth, 'yyyy')}` :
                             view === 'pending' ? 'Action Center' :
                             searchParams.get('category') ? (
                                 searchParams.get('category')!.includes(',')
                                     ? `${searchParams.get('category')!.split(',').length} Categories`
                                     : `Category: ${searchParams.get('category')}`
                             ) :
                             'Filtered Activity'}
                        </span>
                    </div>
                    <button
                        onClick={clearFilters}
                        className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[9px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
                        title="Remove filters and show all activity"
                    >
                        <X size={12} />
                        <span>Clear</span>
                    </button>
                </div>
            )}

            {pendingTransactions && pendingTransactions.length > 0 && (
                <div className="px-4 pt-6 pb-2 animate-enter space-y-4">
                    <div className="px-2 flex items-center justify-between">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Pending Review
                        </p>
                        <span className="text-[9px] font-bold text-amber-500/60 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/10">
                            {pendingTransactions.length} ITEMS
                        </span>
                    </div>
                    <div className="space-y-3">
                        {pendingTransactions.map(txn => (
                            <TransactionItem key={txn.id} txn={{ ...txn, status: 'PENDING' }} formatCurrency={formatCurrency} />
                        ))}
                    </div>
                    <div className="h-px w-full bg-white/[0.05] mx-2" />
                </div>
            )}

            {view !== 'pending' && <div className="px-4 py-6 space-y-6 animate-enter">
                {/* Day Navigator */}
                {view === 'day' && (
                    <div className="flex items-center justify-between bg-white/[0.03] p-2 rounded-[2rem] border border-white/[0.05] mb-6">
                        <button onClick={() => setCurrentMonth(subDays(currentMonth, 1))} className="p-3 rounded-2xl hover:bg-white/5 text-gray-500">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-sm uppercase tracking-widest">{format(currentMonth, 'EEE, dd MMM yyyy')}</span>
                        <button onClick={() => setCurrentMonth(addDays(currentMonth, 1))} className="p-3 rounded-2xl hover:bg-white/5 text-gray-500">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* Year Navigator */}
                {view === 'year' && (
                    <div className="flex items-center justify-between bg-white/[0.03] p-2 rounded-[2rem] border border-white/[0.05] mb-6">
                        <button onClick={() => setCurrentMonth(subYears(currentMonth, 1))} className="p-3 rounded-2xl hover:bg-white/5 text-gray-500">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-sm uppercase tracking-widest">{format(currentMonth, 'yyyy')}</span>
                        <button onClick={() => setCurrentMonth(addYears(currentMonth, 1))} className="p-3 rounded-2xl hover:bg-white/5 text-gray-500">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {view === 'month' ? (
                    <div className="space-y-8">
                        {/* Compact Month Selector */}
                        <div className="flex items-center justify-between bg-white/[0.03] p-2 rounded-[2rem] border border-white/[0.05]">
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-3 rounded-2xl hover:bg-white/5 text-gray-500">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="font-bold text-sm uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy')}</span>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-3 rounded-2xl hover:bg-white/5 text-gray-500">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Liquid Calendar Grid */}
                        <div className="glass-card rounded-[2.5rem] p-4">
                            <div className="grid grid-cols-7 mb-4">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                    <div key={d} className="text-center text-[9px] font-black text-gray-600 uppercase py-2">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1.5">
                                {calendarDays.map((day, i) => {
                                    const dailyTotal = getDailyTotal(day);
                                    const isCurrentMonth = isSameMonth(day, currentMonth);

                                    return (
                                        <div
                                            key={i}
                                            className={`
                                                aspect-[3/4.5] p-1 border border-white/[0.02] flex flex-col items-center justify-between py-2 rounded-2xl transition-all
                                                ${!isCurrentMonth ? 'opacity-10' : ''}
                                                ${isToday(day) ? 'bg-white/10 border-white/20' : 'bg-white/[0.01]'}
                                            `}
                                        >
                                            <span className={`text-[10px] font-black ${isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}`}>
                                                {format(day, 'd')}
                                            </span>
                                            {dailyTotal !== 0 && (
                                                <div className={`w-full ${dailyTotal > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 'bg-red-500/10 text-red-500 border-red-500/10'} px-0 py-1.5 rounded-lg text-[8px] font-black leading-tight border text-center`}>
                                                    ₹{Math.abs(dailyTotal) >= 1000 ? `${(Math.abs(dailyTotal) / 1000).toFixed(1)}k` : Math.abs(dailyTotal).toFixed(0)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* List View below Calendar */}
                        <div className="space-y-8">
                            {groupedTransactions.map(group => (
                                <div key={group.label} className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-2">
                                            {groupBy === 'category' && (
                                                <div
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0"
                                                    style={{
                                                        backgroundColor: `${group.color || '#fff'}20`,
                                                        color: group.color || '#fff'
                                                    }}
                                                >
                                                    <CategoryIcon name={group.icon || 'tag'} size={14} />
                                                </div>
                                            )}
                                            <h3 className="text-[10px] font-black text-white/70 uppercase tracking-[3px] whitespace-nowrap">
                                                {group.label}
                                            </h3>
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                                ({group.items.length})
                                            </span>
                                        </div>
                                        {groupBy === 'category' && group.total !== undefined && (
                                            <span className={`text-xs font-black tracking-tight ${group.total >= 0 ? 'text-emerald-400' : 'text-white'}`}>
                                                {formatCurrency(group.total)}
                                            </span>
                                        )}
                                    </div>
                                    {groupBy !== 'category' && <div className="h-px w-full bg-white/[0.05]" />}
                                    <div className="space-y-3">
                                        {group.items.map(txn => (
                                            <TransactionItem key={txn.id} txn={txn} formatCurrency={formatCurrency} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groupedTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-40 opacity-10 space-y-6">
                                <Receipt size={80} strokeWidth={1} />
                                <p className="font-black uppercase tracking-[4px] text-[10px] text-center px-10">
                                    {view === 'day' ? "No activity on this date" : "No results found"}
                                </p>
                            </div>
                        ) : (
                            groupedTransactions.map((group) => (
                                <div key={group.label} className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-2">
                                            {groupBy === 'category' && (
                                                <div
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0"
                                                    style={{
                                                        backgroundColor: `${group.color || '#fff'}20`,
                                                        color: group.color || '#fff'
                                                    }}
                                                >
                                                    <CategoryIcon name={group.icon || 'tag'} size={14} />
                                                </div>
                                            )}
                                            <h3 className="text-[10px] font-black text-white/70 uppercase tracking-[3px] whitespace-nowrap">
                                                {group.label}
                                            </h3>
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                                ({group.items.length})
                                            </span>
                                        </div>
                                        {groupBy === 'category' && group.total !== undefined && (
                                            <span className={`text-xs font-black tracking-tight ${group.total >= 0 ? 'text-emerald-400' : 'text-white'}`}>
                                                {formatCurrency(group.total)}
                                            </span>
                                        )}
                                    </div>
                                    {groupBy !== 'category' && <div className="h-px w-full bg-white/[0.05]" />}
                                    <div className="space-y-3">
                                        {group.items.map((txn) => (
                                            <TransactionItem key={txn.id} txn={txn} formatCurrency={formatCurrency} />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Load More Button */}
                        {transactions && transactions.length >= limit && (
                            <button
                                onClick={() => setLimit(prev => prev + 100)}
                                className="w-full py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-white/[0.05] transition-all"
                            >
                                Load More History
                            </button>
                        )}
                    </div>
                )}
            </div>}
            {view === 'pending' && (!pendingTransactions || pendingTransactions.length === 0) && (
                <div className="flex flex-col items-center justify-center py-40 opacity-10 space-y-6">
                    <Check size={80} strokeWidth={1} />
                    <p className="font-black uppercase tracking-[4px] text-[10px] text-center px-10">
                        All Caught Up
                    </p>
                </div>
            )}

            <Drawer isOpen={isFilterOpen} onClose={() => setFilterOpen(false)} title="Discovery Filter">
                <div className="space-y-10 px-2 pb-10">
                    <p className="text-gray-500 text-xs leading-relaxed uppercase font-bold tracking-widest px-1">Narrow down your insights</p>

                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] text-gray-600 font-bold uppercase tracking-[3px] ml-1">Time Horizon</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/[0.02] p-4 rounded-3xl border border-white/[0.05]">
                                    <span className="block text-[7px] text-gray-500 font-black uppercase mb-1.5 tracking-tighter">Genesis</span>
                                    <input
                                        type="date"
                                        value={drawerDateRange.start}
                                        onChange={(e) => setDrawerDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="bg-transparent w-full text-white text-xs focus:outline-none font-bold"
                                    />
                                </div>
                                <div className="bg-white/[0.02] p-4 rounded-3xl border border-white/[0.05]">
                                    <span className="block text-[7px] text-gray-500 font-black uppercase mb-1.5 tracking-tighter">Terminal</span>
                                    <input
                                        type="date"
                                        value={drawerDateRange.end}
                                        onChange={(e) => setDrawerDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="bg-transparent w-full text-white text-xs focus:outline-none font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category Checkbox Multi-Selector */}
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[9px] text-gray-400 font-bold uppercase tracking-[3px]">
                                    Categories {drawerCategories.length > 0 && `(${drawerCategories.length} selected)`}
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDrawerCategories(categories ? categories.map(c => c.name) : [])}
                                        className="text-[9px] text-white hover:text-gray-300 font-bold uppercase tracking-wider transition-colors"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-gray-600 text-[9px]">•</span>
                                    <button
                                        type="button"
                                        onClick={() => setDrawerCategories([])}
                                        className="text-[9px] text-gray-500 hover:text-white font-bold uppercase tracking-wider transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-60 overflow-y-auto no-scrollbar space-y-1.5 p-1 bg-white/[0.01] rounded-3xl border border-white/[0.05]">
                                {categories?.map((cat) => {
                                    const isSelected = drawerCategories.includes(cat.name);
                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.name)}
                                            className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer select-none active:scale-[0.99] ${
                                                isSelected
                                                    ? 'bg-white/10 border-white/20'
                                                    : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{
                                                        backgroundColor: `${cat.color || '#fff'}20`,
                                                        color: cat.color || '#fff'
                                                    }}
                                                >
                                                    <CategoryIcon name={cat.icon || 'tag'} size={16} />
                                                </div>
                                                <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                    {cat.name}
                                                </span>
                                            </div>

                                            {/* Checkbox */}
                                            <div
                                                className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                                                    isSelected
                                                        ? 'bg-white border-white text-black shadow-sm'
                                                        : 'border-white/20 bg-white/[0.03]'
                                                }`}
                                            >
                                                {isSelected && <Check size={13} strokeWidth={3} />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sub-Category Selector */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] text-gray-600 font-bold uppercase tracking-[3px] ml-1">Sub Category</label>
                            <select
                                value={drawerSubCategory}
                                onChange={(e) => setDrawerSubCategory(e.target.value)}
                                disabled={drawerCategories.length === 0}
                                className={`w-full bg-[#1A1A1A] border border-white/[0.05] rounded-3xl px-6 py-4 text-xs font-bold text-white focus:outline-none focus:border-white/30 appearance-none ${drawerCategories.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <option value="">All Sub-Categories</option>
                                {availableSubCategories.map((sub) => (
                                    <option key={sub.id} value={sub.name}>
                                        {sub.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 flex items-center gap-3">
                        <button
                            onClick={clearFilters}
                            className="flex-1 py-4 rounded-[2rem] bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                        >
                            Remove Filter
                        </button>
                        <button
                            onClick={applyFilters}
                            className="flex-1 py-4 rounded-[2rem] bg-white text-black font-black text-sm uppercase tracking-wider shadow-2xl active:scale-95 transition-all"
                        >
                            Apply Filter
                        </button>
                    </div>
                </div>
            </Drawer>

            {/* Sort & Group Drawer */}
            <Drawer isOpen={isSortOpen} onClose={() => setIsSortOpen(false)} title="Sort & Group">
                <div className="space-y-8 px-2 pb-10">
                    <p className="text-gray-500 text-xs leading-relaxed uppercase font-bold tracking-widest px-1">
                        Organize your financial ledger
                    </p>

                    {/* Grouping Section */}
                    <div className="space-y-3">
                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-[3px] ml-1">
                            Group Transactions By
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={() => setGroupBy('date')}
                                className={`p-4 rounded-3xl border flex flex-col items-start gap-2 transition-all ${
                                    groupBy === 'date'
                                        ? 'bg-white/10 border-white/20 text-white'
                                        : 'bg-white/[0.02] border-white/[0.05] text-gray-400 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <Calendar size={18} />
                                    {groupBy === 'date' && <Check size={16} className="text-white" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">Daily Timeline</p>
                                    <p className="text-[9px] text-gray-500 mt-0.5">Chronological day groups</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setGroupBy('category')}
                                className={`p-4 rounded-3xl border flex flex-col items-start gap-2 transition-all ${
                                    groupBy === 'category'
                                        ? 'bg-white/10 border-white/20 text-white'
                                        : 'bg-white/[0.02] border-white/[0.05] text-gray-400 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <Layers size={18} />
                                    {groupBy === 'category' && <Check size={16} className="text-white" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">By Category</p>
                                    <p className="text-[9px] text-gray-500 mt-0.5">Subtotals & spend by tag</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Sorting Section */}
                    <div className="space-y-3">
                        <label className="text-[9px] text-gray-500 font-black uppercase tracking-[3px] ml-1">
                            Sort Order
                        </label>
                        <div className="space-y-2">
                            {[
                                { id: 'date_desc', label: 'Date: Newest First', desc: 'Latest activity first' },
                                { id: 'date_asc', label: 'Date: Oldest First', desc: 'Earliest records first' },
                                { id: 'amount_desc', label: 'Amount: Highest to Lowest', desc: 'Biggest spends at top' },
                                { id: 'amount_asc', label: 'Amount: Lowest to Highest', desc: 'Smallest transactions first' },
                                { id: 'category_asc', label: 'Category: A to Z', desc: 'Alphabetical by category' },
                                { id: 'merchant_asc', label: 'Merchant: A to Z', desc: 'Alphabetical by merchant' },
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setSortBy(option.id as any)}
                                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                                        sortBy === option.id
                                            ? 'bg-white/10 border-white/20 text-white'
                                            : 'bg-white/[0.02] border-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-white">{option.label}</p>
                                        <p className="text-[9px] text-gray-500">{option.desc}</p>
                                    </div>
                                    {sortBy === option.id && <Check size={16} className="text-white shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-3">
                        <button
                            onClick={() => {
                                setSortBy('date_desc');
                                setGroupBy('date');
                            }}
                            className="flex-1 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => setIsSortOpen(false)}
                            className="flex-1 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

const TransactionItem = ({ txn, formatCurrency }: { txn: any, formatCurrency: any }) => {
    const navigate = useNavigate();
    const deleteMutation = useDeleteTransaction();
    const verifyMutation = useVerifyTransaction();
    const dateObj = txn.transaction_date ? parseISO(txn.transaction_date) : new Date(txn.created_at);

    const today = startOfToday();
    const daysDiff = differenceInCalendarDays(dateObj, today);
    const absDaysDiff = Math.abs(daysDiff);
    const isDateOutside3Days = absDaysDiff > 3;

    const hasValidSource = Boolean(
        txn.account_type === 'SAVINGS' ||
        txn.account_type === 'ACCOUNT' ||
        txn.account_type === 'CASH' ||
        (txn.account_type === 'CREDIT_CARD' && txn.credit_card_id) ||
        txn.credit_card_id
    );

    if (txn.amount === 0) return null;

    const handleApprove = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!hasValidSource) {
            alert(
                'Validation Error: Payment source (Bank, Cash, or Credit Card) is not assigned to this transaction.\n\n' +
                'Please open and review the transaction to assign a source.'
            );
            navigate(`/transactions/${txn.id}`);
            return;
        }

        if (isDateOutside3Days) {
            const direction = daysDiff < 0 ? `${absDaysDiff} days in the past` : `${absDaysDiff} days in the future`;
            const proceed = window.confirm(
                `⚠️ Date Verification Warning:\n\n` +
                `The transaction date (${format(dateObj, 'dd MMM yyyy')}) is ${direction} relative to today.\n\n` +
                `Sometimes parsers or LLMs pick the wrong date from messages.\n\n` +
                `Do you want to proceed and approve with this date?`
            );
            if (!proceed) return;
        }

        verifyMutation.mutate({
            id: txn.id,
            data: {
                approved: true,
                category: txn.category,
                sub_category: txn.sub_category || 'Uncategorized',
                merchant_name: (txn.merchant_name || 'Unknown').trim()
            }
        });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            deleteMutation.mutate(txn.id);
        }
    };


    return (
        <div
            onClick={() => navigate(`/transactions/${txn.id}`)}
            className="flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.04] transition-all border border-white/[0.05] group active:scale-[0.98] rounded-2xl cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border border-white/[0.08]"
                    style={{
                        backgroundColor: (txn.sub_category_color || txn.category_color) ? `${txn.sub_category_color || txn.category_color}15` : 'rgba(255,255,255,0.03)',
                        color: txn.sub_category_color || txn.category_color || '#fff'
                    }}
                >
                    <CategoryIcon name={txn.sub_category_icon || txn.category_icon} size={22} />
                </div>
                <div className="flex flex-col min-w-0">
                    <p className="font-semibold text-white/90 truncate max-w-[150px] text-sm leading-tight">
                        {txn.merchant_name || txn.category}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest truncate max-w-[80px]">
                            {txn.sub_category}
                        </span>
                        <span className="text-[8px] text-gray-700">•</span>
                        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest whitespace-nowrap">
                            {format(dateObj, 'MMM d')}
                        </span>
                    </div>
                    {txn.tags && txn.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {txn.tags.map((tag: string) => (
                                <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-gray-500 font-black uppercase tracking-tighter">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="text-right shrink-0">
                <p className="font-black text-white text-base leading-none tracking-tighter">
                    {formatCurrency(txn.amount)}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1.5">
                    {txn.status === 'PENDING' ? (
                        <span className="text-[7px] px-1.5 py-0.5 rounded-md font-black border border-amber-500/40 text-amber-500 bg-amber-500/10 uppercase tracking-tighter">
                            Review
                        </span>
                    ) : (
                        <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-tighter ${txn.is_manual ? 'border-amber-500/20 text-amber-500/80' : 'border-white/10 text-white/70 bg-white/[0.04]'
                            }`}>
                            {txn.is_manual ? 'Manual' : 'Sync'}
                        </span>
                    )}
                    {txn.sub_category === 'Credit Card Payment' && (
                        <span className="text-[7px] px-1.5 py-0.5 rounded-md font-black border border-white/10 text-white/70 bg-white/[0.04] uppercase tracking-tighter">
                            Offset
                        </span>
                    )}
                    {txn.status === 'PENDING' && (
                        <div className="flex items-center gap-1 ml-2">
                            <button
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending}
                                className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all active:scale-95"
                                title="Discard"
                            >
                                <Trash2 size={12} />
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={verifyMutation.isPending}
                                className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 hover:bg-green-500/20 transition-all active:scale-95"
                                title="Approve"
                            >
                                <Check size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Transactions;
