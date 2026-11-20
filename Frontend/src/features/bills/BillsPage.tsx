import React, { useState, useMemo } from 'react';
import {
    Plus,
    CheckCircle2,
    Calendar,
    ArrowLeft,
    ShieldAlert,
    Clock,
    Search,
    Trash2,
    Edit3,
    Repeat,
    Zap,
    Home,
    Smartphone,
    CreditCard,
    Shield,
    Landmark,
    Receipt,
    Wifi,
    ExternalLink,
    AlertCircle,
    RotateCcw,
    X,
    Filter,
    Loader2
} from 'lucide-react';
import { useBills, useMarkBillPaid, useAddBill, useUpdateBill, useDeleteBill, type Bill } from './hooks';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../../components/ui/Loader';
import { Drawer } from '../../components/ui/Drawer';
import { formatCurrency } from '../../lib/formatters';
import { haptics } from '../../lib/haptics';
import {
    format,
    isPast,
    isToday,
    isTomorrow,
    differenceInCalendarDays,
    addDays,
    startOfMonth,
    endOfMonth,
    addMonths
} from 'date-fns';

type TabFilter = 'PENDING' | 'PAID' | 'RECURRING' | 'ALL';

const BILL_CATEGORIES = [
    { id: 'Utilities', label: 'Utilities', icon: Zap },
    { id: 'Housing', label: 'Housing & Rent', icon: Home },
    { id: 'Subscriptions', label: 'Subscriptions', icon: Smartphone },
    { id: 'Credit Card', label: 'Credit Card', icon: CreditCard },
    { id: 'Insurance', label: 'Insurance', icon: Shield },
    { id: 'Loans & EMI', label: 'Loans & EMI', icon: Landmark },
    { id: 'Internet & Mobile', label: 'Internet / Mobile', icon: Wifi },
    { id: 'Other', label: 'Other', icon: Receipt },
];

const getCategoryMeta = (category: string) => {
    const catLower = (category || '').toLowerCase();
    if (catLower.includes('util') || catLower.includes('electr') || catLower.includes('power') || catLower.includes('gas') || catLower.includes('water')) {
        return { label: 'Utilities', icon: Zap };
    }
    if (catLower.includes('house') || catLower.includes('rent') || catLower.includes('societ') || catLower.includes('mainten')) {
        return { label: 'Housing', icon: Home };
    }
    if (catLower.includes('subscri') || catLower.includes('ott') || catLower.includes('stream') || catLower.includes('media') || catLower.includes('gym')) {
        return { label: 'Subscriptions', icon: Smartphone };
    }
    if (catLower.includes('card') || catLower.includes('credit')) {
        return { label: 'Credit Card', icon: CreditCard };
    }
    if (catLower.includes('insur') || catLower.includes('polic') || catLower.includes('health') || catLower.includes('lic')) {
        return { label: 'Insurance', icon: Shield };
    }
    if (catLower.includes('loan') || catLower.includes('emi') || catLower.includes('mortgage') || catLower.includes('bank')) {
        return { label: 'Loans & EMI', icon: Landmark };
    }
    if (catLower.includes('wifi') || catLower.includes('broadband') || catLower.includes('mobile') || catLower.includes('recharg') || catLower.includes('fiber')) {
        return { label: 'Internet & Mobile', icon: Wifi };
    }
    return { label: category || 'Other', icon: Receipt };
};

const BillsPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: allBills, isLoading } = useBills(); // Fetches all bills (paid & unpaid)
    const markPaid = useMarkBillPaid();
    const addBill = useAddBill();
    const updateBill = useUpdateBill();
    const deleteBill = useDeleteBill();

    // Filters & Search
    const [activeTab, setActiveTab] = useState<TabFilter>('PENDING');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    // Drawer State (Add / Edit)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);

    // Delete Confirmation
    const [billToDelete, setBillToDelete] = useState<Bill | null>(null);

    // Form State
    const [formTitle, setFormTitle] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formDueDate, setFormDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [formCategory, setFormCategory] = useState('Utilities');
    const [formSubCategory, setFormSubCategory] = useState('General');
    const [formIsRecurring, setFormIsRecurring] = useState(true);
    const [formRecurrenceDay, setFormRecurrenceDay] = useState<number>(new Date().getDate());

    const openCreateDrawer = () => {
        haptics.selection();
        setEditingBill(null);
        setFormTitle('');
        setFormAmount('');
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        setFormDueDate(todayStr);
        setFormCategory('Utilities');
        setFormSubCategory('General');
        setFormIsRecurring(true);
        setFormRecurrenceDay(new Date().getDate());
        setIsDrawerOpen(true);
    };

    const openEditDrawer = (bill: Bill) => {
        haptics.selection();
        setEditingBill(bill);
        setFormTitle(bill.title);
        setFormAmount(String(bill.amount));
        setFormDueDate(bill.due_date ? format(new Date(bill.due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
        setFormCategory(bill.category || 'Utilities');
        setFormSubCategory(bill.sub_category || 'General');
        setFormIsRecurring(bill.is_recurring ?? false);
        setFormRecurrenceDay(bill.recurrence_day || (bill.due_date ? new Date(bill.due_date).getDate() : 1));
        setIsDrawerOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(formAmount);
        if (!formTitle.trim() || isNaN(numAmount) || numAmount <= 0) return;

        haptics.selection();

        const payload = {
            title: formTitle.trim(),
            amount: numAmount,
            due_date: formDueDate,
            category: formCategory,
            sub_category: formSubCategory || 'General',
            is_recurring: formIsRecurring,
            recurrence_day: formIsRecurring ? (formRecurrenceDay || new Date(formDueDate).getDate()) : undefined,
        };

        if (editingBill) {
            await updateBill.mutateAsync({
                id: editingBill.id,
                data: payload,
            });
        } else {
            await addBill.mutateAsync({
                ...payload,
                is_paid: false,
            });
        }

        setIsDrawerOpen(false);
        setEditingBill(null);
    };

    const handleDeleteConfirm = async () => {
        if (!billToDelete) return;
        haptics.selection();
        await deleteBill.mutateAsync(billToDelete.id);
        setBillToDelete(null);
    };

    // Calculate Summary Metrics
    const stats = useMemo(() => {
        if (!allBills || allBills.length === 0) {
            return {
                unpaidTotal: 0,
                unpaidCount: 0,
                overdueTotal: 0,
                overdueCount: 0,
                dueSoonTotal: 0,
                dueSoonCount: 0,
                dueTodayTotal: 0,
                dueTodayCount: 0,
                paidTotal: 0,
                paidCount: 0,
                recurringCount: 0,
            };
        }

        const now = new Date();

        return allBills.reduce(
            (acc, bill) => {
                const amount = Number(bill.amount) || 0;
                const dueDate = new Date(bill.due_date);

                if (bill.is_recurring) {
                    acc.recurringCount += 1;
                }

                if (bill.is_paid) {
                    acc.paidTotal += amount;
                    acc.paidCount += 1;
                } else {
                    acc.unpaidTotal += amount;
                    acc.unpaidCount += 1;

                    if (isToday(dueDate)) {
                        acc.dueTodayTotal += amount;
                        acc.dueTodayCount += 1;
                    } else if (isPast(dueDate)) {
                        acc.overdueTotal += amount;
                        acc.overdueCount += 1;
                    } else {
                        const daysAway = differenceInCalendarDays(dueDate, now);
                        if (daysAway > 0 && daysAway <= 7) {
                            acc.dueSoonTotal += amount;
                            acc.dueSoonCount += 1;
                        }
                    }
                }
                return acc;
            },
            {
                unpaidTotal: 0,
                unpaidCount: 0,
                overdueTotal: 0,
                overdueCount: 0,
                dueSoonTotal: 0,
                dueSoonCount: 0,
                dueTodayTotal: 0,
                dueTodayCount: 0,
                paidTotal: 0,
                paidCount: 0,
                recurringCount: 0,
            }
        );
    }, [allBills]);

    // Filter & Sort Bills
    const displayedBills = useMemo(() => {
        if (!allBills) return [];

        return allBills
            .filter((bill) => {
                // Tab filter
                if (activeTab === 'PENDING' && bill.is_paid) return false;
                if (activeTab === 'PAID' && !bill.is_paid) return false;
                if (activeTab === 'RECURRING' && !bill.is_recurring) return false;

                // Category filter
                if (selectedCategory !== 'ALL' && bill.category !== selectedCategory) {
                    const meta = getCategoryMeta(bill.category);
                    if (meta.label !== selectedCategory) return false;
                }

                // Search query
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const titleMatch = bill.title.toLowerCase().includes(q);
                    const catMatch = (bill.category || '').toLowerCase().includes(q);
                    const subMatch = (bill.sub_category || '').toLowerCase().includes(q);
                    const amountMatch = String(bill.amount).includes(q);
                    if (!titleMatch && !catMatch && !subMatch && !amountMatch) return false;
                }

                return true;
            })
            .sort((a, b) => {
                // For pending: overdue & soonest due first
                if (activeTab === 'PENDING') {
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                }
                // For paid: latest paid / latest due first
                if (activeTab === 'PAID') {
                    return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
                }
                // Default: chronological
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            });
    }, [allBills, activeTab, selectedCategory, searchQuery]);

    if (isLoading) return <Loader fullPage text="Scanning Scheduled Commitments" />;

    return (
        <div className="min-h-screen text-text-primary pb-28 overflow-x-hidden">
            {/* Header */}
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
                            Scheduled Bills
                        </h1>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5">
                            Obligations & Recurring Schedules
                        </p>
                    </div>
                </div>

                <button
                    onClick={openCreateDrawer}
                    className="px-4 py-2.5 rounded-full bg-primary text-text-inverse font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md touch-manipulation"
                >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Add Bill</span>
                </button>
            </header>

            <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
                {/* Visual Financial Burden Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Active Unpaid Burden Hero Card */}
                    <div className="bg-surface border border-border-subtle p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[2px]">
                                Active Burden
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md badge-neutral">
                                {stats.unpaidCount} Pending
                            </span>
                        </div>
                        <div>
                            <p className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight tabular-nums">
                                {formatCurrency(stats.unpaidTotal)}
                            </p>
                            <p className="text-xs text-text-muted mt-1 font-medium">
                                Total unresolved commitment
                            </p>
                        </div>
                    </div>

                    {/* Overdue / Urgency Card */}
                    <div className={`p-5 rounded-3xl border relative overflow-hidden flex flex-col justify-between transition-all ${
                        stats.overdueCount > 0
                            ? 'bg-status-danger-bg/40 border-status-danger-border'
                            : 'bg-surface border-border-subtle'
                    }`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className={`text-[10px] font-extrabold uppercase tracking-[2px] ${
                                stats.overdueCount > 0 ? 'text-status-danger-text' : 'text-text-muted'
                            }`}>
                                Overdue
                            </span>
                            {stats.overdueCount > 0 ? (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md badge-danger">
                                    {stats.overdueCount} Overdue
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md badge-success">
                                    Zero Overdue
                                </span>
                            )}
                        </div>
                        <div>
                            <p className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
                                stats.overdueCount > 0 ? 'text-status-danger-text' : 'text-text-primary'
                            }`}>
                                {formatCurrency(stats.overdueTotal)}
                            </p>
                            <p className="text-xs text-text-muted mt-1 font-medium">
                                {stats.overdueCount > 0 ? 'Immediate action required' : 'All obligations on schedule'}
                            </p>
                        </div>
                    </div>

                    {/* Due in 7 Days / Cleared Card */}
                    <div className="bg-surface border border-border-subtle p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[2px]">
                                Next 7 Days
                            </span>
                            {stats.dueSoonCount > 0 ? (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md badge-warning">
                                    {stats.dueSoonCount} Due Soon
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md badge-neutral">
                                    None Due 7d
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight tabular-nums">
                                {formatCurrency(stats.dueSoonTotal)}
                            </p>
                            <p className="text-xs text-text-muted mt-1 font-medium flex items-center justify-between">
                                <span>Upcoming this week</span>
                                <span className="text-text-secondary font-semibold">
                                    Paid: {formatCurrency(stats.paidTotal)}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Surety Cross-Link Pill */}
                <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-surface-pill border border-border-subtle flex items-center justify-center shrink-0 text-text-muted">
                            <Repeat size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">
                                Looking for automated recurring obligations?
                            </p>
                            <p className="text-[11px] text-text-muted truncate">
                                Grip also scans transaction patterns for recurring Surety commitments.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            haptics.selection();
                            navigate('/sureties');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle text-xs font-semibold text-text-primary shrink-0 flex items-center gap-1 active:scale-95 transition-all touch-manipulation"
                    >
                        <span>View Sureties</span>
                        <ExternalLink size={12} className="text-text-muted" />
                    </button>
                </div>

                {/* Controls Bar: Tabs, Search & Filters */}
                <div className="space-y-3">
                    {/* Status Tabs */}
                    <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
                        <div className="flex items-center gap-1.5 bg-surface-subtle p-1 rounded-2xl border border-border-subtle">
                            {(
                                [
                                    { id: 'PENDING', label: 'Pending', count: stats.unpaidCount },
                                    { id: 'PAID', label: 'Paid', count: stats.paidCount },
                                    { id: 'RECURRING', label: 'Recurring', count: stats.recurringCount },
                                    { id: 'ALL', label: 'All', count: allBills?.length || 0 },
                                ] as const
                            ).map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            haptics.selection();
                                            setActiveTab(tab.id);
                                        }}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 touch-manipulation whitespace-nowrap ${
                                            isActive
                                                ? 'bg-surface text-text-primary shadow-xs border border-border-subtle'
                                                : 'text-text-muted hover:text-text-primary'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-extrabold ${
                                                isActive
                                                    ? 'bg-surface-pill text-text-primary'
                                                    : 'text-text-muted opacity-60'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[180px] sm:min-w-[220px]">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search bills..."
                                className="w-full bg-surface-subtle border border-border-subtle rounded-2xl pl-8 pr-7 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus font-medium transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                                    aria-label="Clear search"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        <button
                            onClick={() => {
                                haptics.selection();
                                setSelectedCategory('ALL');
                            }}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap border touch-manipulation ${
                                selectedCategory === 'ALL'
                                    ? 'bg-surface-pill border-border-default text-text-primary'
                                    : 'bg-transparent border-transparent text-text-muted hover:text-text-primary'
                            }`}
                        >
                            All Categories
                        </button>
                        {BILL_CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            const IconComp = cat.icon;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        haptics.selection();
                                        setSelectedCategory(isSelected ? 'ALL' : cat.id);
                                    }}
                                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap border touch-manipulation ${
                                        isSelected
                                            ? 'bg-surface-pill border-border-default text-text-primary'
                                            : 'bg-surface-subtle border-border-subtle text-text-muted hover:text-text-primary'
                                    }`}
                                >
                                    <IconComp size={12} />
                                    <span>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Bills List */}
                <div className="space-y-3">
                    {displayedBills.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-surface-subtle/50 border border-dashed border-border-subtle rounded-3xl">
                            <div className="w-14 h-14 rounded-2xl bg-surface-pill border border-border-subtle flex items-center justify-center mb-4 text-text-muted">
                                {activeTab === 'PAID' ? (
                                    <CheckCircle2 size={24} />
                                ) : activeTab === 'PENDING' ? (
                                    <Clock size={24} />
                                ) : (
                                    <Receipt size={24} />
                                )}
                            </div>
                            <h3 className="text-sm font-bold text-text-primary">
                                {searchQuery || selectedCategory !== 'ALL'
                                    ? 'No bills match your criteria'
                                    : activeTab === 'PENDING'
                                    ? 'All commitments cleared!'
                                    : activeTab === 'PAID'
                                    ? 'No paid bills recorded'
                                    : 'No scheduled bills found'}
                            </h3>
                            <p className="text-xs text-text-muted mt-1 max-w-sm">
                                {searchQuery || selectedCategory !== 'ALL'
                                    ? 'Try clearing the search or category filters to see more results.'
                                    : activeTab === 'PENDING'
                                    ? 'You have zero pending bills due. Your discretionary spending capacity is safely preserved.'
                                    : 'Add recurring or one-time obligations to track and protect your financial runway.'}
                            </p>
                            <button
                                onClick={openCreateDrawer}
                                className="mt-5 px-4 py-2 rounded-full bg-primary text-text-inverse font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-xs touch-manipulation"
                            >
                                <Plus size={14} strokeWidth={2.5} />
                                <span>Add New Bill</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {displayedBills.map((bill) => {
                                const dueDate = new Date(bill.due_date);
                                const isOverdue = !bill.is_paid && isPast(dueDate) && !isToday(dueDate);
                                const dueToday = !bill.is_paid && isToday(dueDate);
                                const dueTomorrow = !bill.is_paid && isTomorrow(dueDate);
                                const daysRemaining = differenceInCalendarDays(dueDate, new Date());
                                const categoryMeta = getCategoryMeta(bill.category);
                                const IconComponent = categoryMeta.icon;

                                return (
                                    <div
                                        key={bill.id}
                                        className={`p-4 rounded-3xl bg-surface border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-border-default ${
                                            isOverdue
                                                ? 'border-status-danger-border/70 bg-status-danger-bg/20'
                                                : dueToday
                                                ? 'border-status-warning-border/70 bg-status-warning-bg/20'
                                                : bill.is_paid
                                                ? 'border-border-subtle opacity-75 hover:opacity-100'
                                                : 'border-border-subtle'
                                        }`}
                                    >
                                        {/* Left Side: Category Icon & Bill Info */}
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div
                                                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                                                    isOverdue
                                                        ? 'bg-status-danger-bg text-status-danger-text border-status-danger-border'
                                                        : dueToday
                                                        ? 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
                                                        : bill.is_paid
                                                        ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                                                        : 'bg-surface-pill text-text-secondary border-border-subtle'
                                                }`}
                                            >
                                                <IconComponent size={20} />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-sm text-text-primary truncate">
                                                        {bill.title}
                                                    </p>
                                                    {bill.is_recurring && (
                                                        <span
                                                            className="text-[10px] font-semibold text-text-muted px-2 py-0.5 rounded-full bg-surface-subtle border border-border-subtle shrink-0 flex items-center gap-1"
                                                            title={`Recurring monthly on the ${bill.recurrence_day || dueDate.getDate()}th`}
                                                        >
                                                            <Repeat size={10} />
                                                            <span>Monthly ({bill.recurrence_day || dueDate.getDate()}th)</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md badge-neutral">
                                                        {bill.category || 'Utilities'}
                                                    </span>

                                                    {/* Due Date & Urgency Badge */}
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <Calendar size={12} className="text-text-muted" />
                                                        <span className="text-text-muted font-medium">
                                                            {format(dueDate, 'MMM d, yyyy')}
                                                        </span>
                                                    </div>

                                                    {isOverdue && (
                                                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md badge-danger flex items-center gap-1">
                                                            <AlertCircle size={10} />
                                                            <span>
                                                                {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'day' : 'days'} overdue
                                                            </span>
                                                        </span>
                                                    )}

                                                    {dueToday && (
                                                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md badge-warning">
                                                            Due Today
                                                        </span>
                                                    )}

                                                    {dueTomorrow && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md badge-neutral text-text-secondary">
                                                            Due Tomorrow
                                                        </span>
                                                    )}

                                                    {!isOverdue && !dueToday && !dueTomorrow && !bill.is_paid && daysRemaining > 0 && daysRemaining <= 7 && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md badge-warning">
                                                            Due in {daysRemaining} days
                                                        </span>
                                                    )}

                                                    {bill.is_paid && (
                                                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md badge-success flex items-center gap-1">
                                                            <CheckCircle2 size={10} />
                                                            <span>Cleared / Paid</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Amount & Actions */}
                                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
                                            <div className="sm:text-right">
                                                <p className="text-base sm:text-lg font-black text-text-primary tracking-tight tabular-nums">
                                                    {formatCurrency(Number(bill.amount))}
                                                </p>
                                                <p className="text-[10px] text-text-muted font-medium">
                                                    {bill.sub_category || 'Scheduled'}
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1.5">
                                                {bill.is_paid ? (
                                                    <button
                                                        onClick={() => {
                                                            haptics.selection();
                                                            markPaid.mutate({ id: bill.id, paid: false });
                                                        }}
                                                        disabled={markPaid.isPending}
                                                        className="px-3 py-1.5 rounded-full bg-surface-subtle hover:bg-surface border border-border-subtle text-text-muted hover:text-text-primary text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all touch-manipulation"
                                                        title="Mark as unpaid"
                                                    >
                                                        {markPaid.isPending && markPaid.variables?.id === bill.id ? (
                                                            <Loader2 size={12} className="animate-spin text-accent-text" />
                                                        ) : (
                                                            <RotateCcw size={12} />
                                                        )}
                                                        <span>{markPaid.isPending && markPaid.variables?.id === bill.id ? 'Updating...' : 'Undo'}</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            haptics.selection();
                                                            markPaid.mutate({ id: bill.id, paid: true });
                                                        }}
                                                        disabled={markPaid.isPending}
                                                        className="px-3.5 py-1.5 rounded-full bg-status-success-solid hover:bg-status-success-solid-hover text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs touch-manipulation"
                                                    >
                                                        {markPaid.isPending && markPaid.variables?.id === bill.id ? (
                                                            <Loader2 size={13} className="animate-spin text-white" />
                                                        ) : (
                                                            <CheckCircle2 size={13} />
                                                        )}
                                                        <span>{markPaid.isPending && markPaid.variables?.id === bill.id ? 'Updating...' : 'Mark Paid'}</span>
                                                    </button>
                                                )}

                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => openEditDrawer(bill)}
                                                    className="w-8 h-8 rounded-full bg-surface-subtle hover:bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all touch-manipulation"
                                                    aria-label="Edit bill"
                                                    title="Edit bill"
                                                >
                                                    <Edit3 size={14} />
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => {
                                                        haptics.selection();
                                                        setBillToDelete(bill);
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-surface-subtle hover:bg-status-danger-bg border border-border-subtle hover:border-status-danger-border flex items-center justify-center text-text-muted hover:text-status-danger-text active:scale-90 transition-all touch-manipulation"
                                                    aria-label="Delete bill"
                                                    title="Delete bill"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Add / Edit Bill Fluid Drawer */}
            <Drawer
                isOpen={isDrawerOpen}
                onClose={() => {
                    haptics.selection();
                    setIsDrawerOpen(false);
                    setEditingBill(null);
                }}
                title={editingBill ? 'Edit Scheduled Bill' : 'New Scheduled Bill'}
            >
                <form onSubmit={handleFormSubmit} className="space-y-5 p-1">
                    {/* Bill Title */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                            Bill Title / Obligation Name
                        </label>
                        <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="e.g. Airtel Fiber, House Rent, Netflix, Electricity"
                            required
                            className="w-full bg-surface-subtle border border-border-default rounded-2xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus font-medium"
                        />
                    </div>

                    {/* Amount & Quick Increments */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                            Amount (₹)
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
                                onChange={(e) => setFormAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                className="w-full bg-surface-subtle border border-border-default rounded-2xl pl-9 pr-4 py-3 text-lg font-black text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus tabular-nums"
                            />
                        </div>
                        {/* Quick preset amount pills */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {[500, 1000, 2500, 5000, 10000].map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => {
                                        haptics.selection();
                                        setFormAmount(String(amt));
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary hover:bg-surface-hover active:scale-95 transition-all tabular-nums"
                                >
                                    +₹{amt.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Due Date & Presets */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                            Next Due Date
                        </label>
                        <input
                            type="date"
                            value={formDueDate}
                            onChange={(e) => {
                                setFormDueDate(e.target.value);
                                const d = new Date(e.target.value);
                                if (!isNaN(d.getTime())) {
                                    setFormRecurrenceDay(d.getDate());
                                }
                            }}
                            required
                            className="w-full bg-surface-subtle border border-border-default rounded-2xl px-4 py-3 text-sm font-semibold text-text-primary focus:outline-none focus:border-border-focus"
                        />
                        {/* Quick date preset pills */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    const d = new Date();
                                    setFormDueDate(format(d, 'yyyy-MM-dd'));
                                    setFormRecurrenceDay(d.getDate());
                                }}
                                className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    const d = addDays(new Date(), 1);
                                    setFormDueDate(format(d, 'yyyy-MM-dd'));
                                    setFormRecurrenceDay(d.getDate());
                                }}
                                className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                Tomorrow
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    const d = addDays(new Date(), 7);
                                    setFormDueDate(format(d, 'yyyy-MM-dd'));
                                    setFormRecurrenceDay(d.getDate());
                                }}
                                className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                In 7 Days
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    const nextMonth = addMonths(new Date(), 1);
                                    const d = startOfMonth(nextMonth);
                                    setFormDueDate(format(d, 'yyyy-MM-dd'));
                                    setFormRecurrenceDay(1);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-semibold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                1st of Next Month
                            </button>
                        </div>
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted">
                            Category
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {BILL_CATEGORIES.map((cat) => {
                                const isSelected = formCategory === cat.id;
                                const IconComp = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            haptics.selection();
                                            setFormCategory(cat.id);
                                        }}
                                        className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all active:scale-95 ${
                                            isSelected
                                                ? 'bg-surface-pill border-border-default text-text-primary font-bold shadow-xs'
                                                : 'bg-surface-subtle border-border-subtle text-text-muted hover:text-text-primary'
                                        }`}
                                    >
                                        <IconComp size={16} />
                                        <span className="text-xs truncate">{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recurring Switch & Recurrence Day */}
                    <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-text-primary">
                                    Recurring Obligation
                                </p>
                                <p className="text-xs text-text-muted">
                                    Advances to next month automatically when paid
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    setFormIsRecurring(!formIsRecurring);
                                }}
                                className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                                    formIsRecurring ? 'bg-primary' : 'bg-surface-pill border border-border-subtle'
                                }`}
                                role="switch"
                                aria-checked={formIsRecurring}
                            >
                                <div
                                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                        formIsRecurring ? 'translate-x-6' : 'translate-x-0.5'
                                    }`}
                                />
                            </button>
                        </div>

                        {formIsRecurring && (
                            <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                                <label className="text-xs font-semibold text-text-muted">
                                    Day of Month
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formRecurrenceDay}
                                        onChange={(e) => setFormRecurrenceDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                                        className="w-16 bg-surface border border-border-default rounded-xl px-2.5 py-1.5 text-center text-xs font-bold text-text-primary focus:outline-none tabular-nums"
                                    />
                                    <span className="text-xs text-text-muted font-medium">of every month</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                haptics.selection();
                                setIsDrawerOpen(false);
                                setEditingBill(null);
                            }}
                            className="flex-1 py-3.5 rounded-2xl bg-surface-subtle hover:bg-surface border border-border-subtle text-text-muted hover:text-text-primary font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={addBill.isPending || updateBill.isPending}
                            className="flex-2 py-3.5 rounded-2xl bg-primary text-text-inverse font-bold text-xs uppercase tracking-wider active:scale-95 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {(addBill.isPending || updateBill.isPending) && (
                                <Loader2 size={14} className="animate-spin text-text-inverse" />
                            )}
                            {addBill.isPending || updateBill.isPending
                                ? 'Saving...'
                                : editingBill
                                ? 'Save Changes'
                                : 'Create Bill'}
                        </button>
                    </div>
                </form>
            </Drawer>

            {/* Delete Confirmation Modal */}
            {billToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-overlay backdrop-blur-sm"
                        onClick={() => setBillToDelete(null)}
                    />
                    <div className="relative bg-surface border border-border-default rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-status-danger-bg text-status-danger-text border border-status-danger-border flex items-center justify-center">
                            <Trash2 size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-text-primary">
                                Delete "{billToDelete.title}"?
                            </h3>
                            <p className="text-xs text-text-muted">
                                This will remove this scheduled bill ({formatCurrency(Number(billToDelete.amount))}) from your obligations ledger and unfreeze its allocated funds.
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setBillToDelete(null)}
                                className="flex-1 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface border border-border-subtle text-xs font-bold text-text-muted hover:text-text-primary active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={deleteBill.isPending}
                                className="flex-1 py-2.5 rounded-xl bg-status-danger-solid hover:bg-status-danger-solid-hover text-white text-xs font-bold active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5"
                            >
                                {deleteBill.isPending && (
                                    <Loader2 size={13} className="animate-spin text-white" />
                                )}
                                <span>{deleteBill.isPending ? 'Deleting...' : 'Delete'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillsPage;
