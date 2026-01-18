import React, { useState, useMemo } from 'react';
// Transactions Page
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTransactions } from '../features/transactions/hooks';
import { useCategories } from '../features/transactions/categoryHooks';
import {
    Receipt,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Filter,
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
    differenceInCalendarDays
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

    // Initialize Drawer State from URL Params
    const [drawerCategory, setDrawerCategory] = useState(searchParams.get('category') || '');
    const [drawerSubCategory, setDrawerSubCategory] = useState(searchParams.get('sub_category') || '');
    const [drawerDateRange, setDrawerDateRange] = useState<{ start: string; end: string }>({
        start: searchParams.get('start_date') || '',
        end: searchParams.get('end_date') || ''
    });

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
            filters.start_date = format(new Date(), 'yyyy-MM-dd');
            filters.end_date = format(new Date(), 'yyyy-MM-dd');
        } else if (view === 'month') {
            filters.start_date = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            filters.end_date = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
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

    const applyFilters = () => {
        const params: any = { view: 'custom' };
        if (drawerCategory) params.category = drawerCategory;
        if (drawerSubCategory) params.sub_category = drawerSubCategory;
        if (drawerDateRange.start) params.start_date = drawerDateRange.start;
        if (drawerDateRange.end) params.end_date = drawerDateRange.end;

        setSearchParams(params);
        setFilterOpen(false);
    };

    // Grouping Logic for Display
    const groupedTransactions = useMemo(() => {
        if (!transactions) return [];

        const groups: { label: string, items: any[] }[] = [];
        const now = startOfToday();

        const parseTxnDate = (t: any) => t.transaction_date ? parseISO(t.transaction_date) : new Date(t.created_at);

        transactions.forEach(txn => {
            const date = parseTxnDate(txn);
            let label = "";

            const daysDiff = differenceInCalendarDays(now, date);

            if (daysDiff === 0) {
                label = "Today";
            } else if (daysDiff === 1) {
                label = "Yesterday";
            } else if (daysDiff < 7) {
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
    }, [transactions]);

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

    // Helper to get subcategories for selected category in drawer
    const availableSubCategories = useMemo(() => {
        if (!drawerCategory || !categories) return [];
        const cat = categories.find(c => c.name === drawerCategory);
        return cat ? cat.sub_categories : [];
    }, [drawerCategory, categories]);

    if (isLoading && limit === 200) return <Loader fullPage text="Retrieving History" />;

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-20">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#050505]/80 backdrop-blur-3xl z-30 border-b border-white/[0.05]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            {view === 'day' ? "Today" :
                                view === 'month' ? "Calendar" :
                                    view === 'custom' ? "Filtered" :
                                        "Activity"}
                        </h1>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[2px] mt-0.5">
                            {view === 'month' ? format(currentMonth, 'MMMM yyyy') : `${transactions?.length || 0} records`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Filter Button - Active State Indication */}
                    <button
                        onClick={() => {
                            setFilterOpen(true);
                            // Do NOT change view or trigger fetch here, just open drawer
                        }}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${view === 'custom' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-white/[0.03] border-white/10 text-gray-400'}`}
                    >
                        <Filter size={18} />
                    </button>
                </div>
            </header>

            <div className="px-4 py-6 space-y-6 animate-enter">
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
                                    <div className="flex items-center gap-4 px-2">
                                        <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[4px] whitespace-nowrap">{group.label}</h3>
                                        <div className="h-px w-full bg-white/[0.05]" />
                                    </div>
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
                                    {view === 'day' ? "No activity today" : "No results found"}
                                </p>
                            </div>
                        ) : (
                            groupedTransactions.map((group) => (
                                <div key={group.label} className="space-y-4">
                                    <div className="flex items-center gap-4 px-2">
                                        <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[4px] whitespace-nowrap">{group.label}</h3>
                                        <div className="h-px w-full bg-white/[0.05]" />
                                    </div>
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
            </div>

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

                        {/* Category Selector */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] text-gray-600 font-bold uppercase tracking-[3px] ml-1">Category</label>
                            <select
                                value={drawerCategory}
                                onChange={(e) => {
                                    setDrawerCategory(e.target.value);
                                    setDrawerSubCategory(''); // Reset subcategory when category changes
                                }}
                                className="w-full bg-[#1A1A1A] border border-white/[0.05] rounded-3xl px-6 py-4 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/50 appearance-none"
                            >
                                <option value="">All Categories</option>
                                {categories?.map((cat) => (
                                    <option key={cat.id} value={cat.name}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sub-Category Selector */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] text-gray-600 font-bold uppercase tracking-[3px] ml-1">Sub Category</label>
                            <select
                                value={drawerSubCategory}
                                onChange={(e) => setDrawerSubCategory(e.target.value)}
                                disabled={!drawerCategory}
                                className={`w-full bg-[#1A1A1A] border border-white/[0.05] rounded-3xl px-6 py-4 text-xs font-bold text-white focus:outline-none focus:border-cyan-500/50 appearance-none ${!drawerCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                    <div className="pt-6">
                        <button
                            onClick={applyFilters}
                            className="w-full py-5 rounded-[2rem] bg-white text-black font-black text-lg shadow-2xl active:scale-95 transition-all"
                        >
                            Refine Activity
                        </button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

const TransactionItem = ({ txn, formatCurrency }: { txn: any, formatCurrency: any }) => {
    const navigate = useNavigate();
    const dateObj = txn.transaction_date ? parseISO(txn.transaction_date) : new Date(txn.created_at);

    return (
        <div
            onClick={() => navigate(`/transactions/${txn.id}`)}
            className="flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.04] transition-all border border-white/[0.05] group active:scale-[0.98] rounded-2xl cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border border-white/[0.08]"
                    style={{
                        backgroundColor: `${txn.sub_category_color || txn.category_color}15` || 'rgba(255,255,255,0.03)',
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
                </div>
            </div>

            <div className="text-right shrink-0">
                <p className="font-black text-white text-base leading-none tracking-tighter">
                    {formatCurrency(txn.amount)}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1.5">
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-tighter ${txn.is_manual ? 'border-amber-500/20 text-amber-500/80' : 'border-cyan-500/20 text-cyan-500/80'
                        }`}>
                        {txn.is_manual ? 'Manual' : 'Auto'}
                    </span>
                    {txn.sub_category === 'Credit Card Payment' && (
                        <span className="text-[7px] px-1.5 py-0.5 rounded-md font-black border border-purple-500/20 text-purple-400 bg-purple-500/10 uppercase tracking-tighter">
                            Offset
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Transactions;
