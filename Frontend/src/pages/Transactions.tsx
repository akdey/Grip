import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTransactions } from '../features/transactions/hooks';
import { Card } from '../components/ui/Card';
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
    parseISO
} from 'date-fns';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { Drawer } from '../components/ui/Drawer';
import { Loader } from '../components/ui/Loader';

const Transactions: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const view = searchParams.get('view') || 'all';
    const { data: transactions, isLoading } = useTransactions(200);

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isFilterOpen, setFilterOpen] = useState(false);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);

    const parseTxnDate = (t: any) => {
        if (t.transaction_date) return parseISO(t.transaction_date);
        return new Date(t.created_at);
    };

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];

        switch (view) {
            case 'day':
                return transactions.filter(t => isToday(parseTxnDate(t)));
            case 'month':
                return transactions.filter(t => isSameMonth(parseTxnDate(t), currentMonth));
            default:
                return transactions;
        }
    }, [transactions, view, currentMonth]);

    // Calendar Data
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const getDailyTotal = (date: Date) => {
        if (!transactions) return 0;
        return transactions
            .filter(t => isSameDay(parseTxnDate(t), date))
            .reduce((sum, t) => sum + Number(t.amount), 0);
    };

    if (isLoading) return <Loader fullPage text="Retrieving History" />;

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-20">
            {/* Liquid Header */}
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#050505]/60 backdrop-blur-3xl z-30 border-b border-white/[0.05]">
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
                            {view === 'month' ? format(currentMonth, 'MMMM yyyy') : `${filteredTransactions.length} records`}
                        </p>
                    </div>
                </div>
                {view === 'custom' && (
                    <button
                        onClick={() => setFilterOpen(true)}
                        className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-cyan-400 active:scale-90 transition-all"
                    >
                        <Filter size={18} />
                    </button>
                )}
            </header>

            <div className="px-4 space-y-6 animate-enter">
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
                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-[3px] ml-2">Breakdown</h3>
                            <div className="space-y-3">
                                {filteredTransactions.length === 0 ? (
                                    <div className="text-center py-10 opacity-20 italic text-xs uppercase tracking-widest">Quiet Month</div>
                                ) : (
                                    filteredTransactions.map(txn => (
                                        <TransactionItem key={txn.id} txn={txn} formatCurrency={formatCurrency} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-40 opacity-10 space-y-6">
                                <Receipt size={80} strokeWidth={1} />
                                <p className="font-black uppercase tracking-[4px] text-[10px] text-center px-10">
                                    {view === 'day' ? "No activity today" : "Vault Empty"}
                                </p>
                            </div>
                        ) : (
                            filteredTransactions.map((txn) => (
                                <TransactionItem key={txn.id} txn={txn} formatCurrency={formatCurrency} />
                            ))
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
                                    <input type="date" className="bg-transparent w-full text-white text-xs focus:outline-none font-bold" />
                                </div>
                                <div className="bg-white/[0.02] p-4 rounded-3xl border border-white/[0.05]">
                                    <span className="block text-[7px] text-gray-500 font-black uppercase mb-1.5 tracking-tighter">Terminal</span>
                                    <input type="date" className="bg-transparent w-full text-white text-xs focus:outline-none font-bold" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={() => setFilterOpen(false)}
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
                    <p className="font-bold text-white/90 truncate max-w-[140px] text-base leading-tight">
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
                </div>
            </div>
        </div>
    );
};

export default Transactions;
