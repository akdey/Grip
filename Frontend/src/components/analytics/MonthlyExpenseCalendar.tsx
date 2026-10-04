import React, { useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    parseISO
} from 'date-fns';
import { Calendar, ChevronRight, TrendingDown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../../features/transactions/hooks';

interface MonthlyExpenseCalendarProps {
    currentMonth: Date;
    onSelectDate?: (date: Date) => void;
    showSensitive?: boolean;
}

export const MonthlyExpenseCalendar: React.FC<MonthlyExpenseCalendarProps> = ({
    currentMonth,
    onSelectDate,
    showSensitive = true
}) => {
    const navigate = useNavigate();

    const startDateStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDateStr = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const { data: transactions, isLoading } = useTransactions({
        start_date: startDateStr,
        end_date: endDateStr,
        limit: 1000
    });

    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const dailySummaryMap = useMemo(() => {
        const map = new Map<string, { total: number; expense: number; income: number; count: number }>();
        if (!transactions) return map;

        transactions.forEach(t => {
            if (t.status === 'PENDING') return;
            const dateStr = format(t.transaction_date ? parseISO(t.transaction_date) : new Date(t.created_at), 'yyyy-MM-dd');
            const amt = Number(t.amount || 0);

            if (!map.has(dateStr)) {
                map.set(dateStr, { total: 0, expense: 0, income: 0, count: 0 });
            }
            const item = map.get(dateStr)!;
            item.total += amt;
            if (amt < 0) {
                item.expense += Math.abs(amt);
            } else {
                item.income += amt;
            }
            item.count += 1;
        });

        return map;
    }, [transactions]);

    const insights = useMemo(() => {
        let maxExpense = 0;
        let maxExpenseDate: Date | null = null;
        let totalExpense = 0;
        let activeSpendDays = 0;
        const daysInMonth = eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
        });

        daysInMonth.forEach(d => {
            const key = format(d, 'yyyy-MM-dd');
            const dayData = dailySummaryMap.get(key);
            if (dayData && dayData.expense > 0) {
                activeSpendDays += 1;
                totalExpense += dayData.expense;
                if (dayData.expense > maxExpense) {
                    maxExpense = dayData.expense;
                    maxExpenseDate = d;
                }
            }
        });

        const avgDaily = activeSpendDays > 0 ? Math.round(totalExpense / activeSpendDays) : 0;
        const zeroSpendDays = daysInMonth.length - activeSpendDays;

        return {
            maxExpense,
            maxExpenseDate,
            avgDaily,
            activeSpendDays,
            zeroSpendDays,
            totalDays: daysInMonth.length
        };
    }, [dailySummaryMap, currentMonth]);

    const formatBadge = (amount: number) => {
        const abs = Math.abs(amount);
        if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
        if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}k`;
        return `₹${abs.toFixed(0)}`;
    };

    const handleDayClick = (day: Date) => {
        if (onSelectDate) {
            onSelectDate(day);
        } else {
            const dateStr = format(day, 'yyyy-MM-dd');
            navigate(`/transactions?view=day&date=${dateStr}`);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-subtle text-accent-text flex items-center justify-center border border-accent-border">
                        <Calendar size={16} />
                    </div>
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-text-muted">
                            Expense Calendar
                        </h2>
                        <p className="text-[9px] text-text-muted/80 font-bold uppercase tracking-wider">
                            Daily Outflow & Activity Matrix
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-surface-subtle border border-border-subtle text-secondary">
                        {insights.activeSpendDays} Active Days
                    </span>
                </div>
            </div>

            <div className="glass-card rounded-[2.5rem] p-5 sm:p-6 border border-border-subtle relative overflow-hidden">
                {/* 7-column Weekday Headers */}
                <div className="grid grid-cols-7 mb-3">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, idx) => (
                        <div
                            key={idx}
                            className="text-center text-[9px] font-black text-text-muted uppercase py-1.5"
                        >
                            {dayName}
                        </div>
                    ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {calendarDays.map((day, i) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const daySummary = dailySummaryMap.get(dateKey);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const hasActivity = daySummary && daySummary.count > 0;
                        const isNetExpense = daySummary && daySummary.total < 0;
                        const isNetIncome = daySummary && daySummary.total > 0;

                        return (
                            <button
                                key={i}
                                type="button"
                                disabled={!isCurrentMonth || isLoading}
                                onClick={() => isCurrentMonth && handleDayClick(day)}
                                className={`
                                    aspect-[3/4.2] sm:aspect-[3/3.8] p-1 border rounded-2xl flex flex-col items-center justify-between py-2 transition-all text-center
                                    ${!isCurrentMonth
                                        ? 'opacity-20 border-border-subtle/40 bg-surface-subtle/30 cursor-default'
                                        : 'border-border-subtle cursor-pointer hover:border-accent-border hover:bg-surface-hover active:scale-95'
                                    }
                                    ${isToday(day)
                                        ? 'bg-accent-subtle border-accent-border text-accent-text font-black ring-1 ring-accent-border shadow-sm'
                                        : 'bg-surface-subtle'
                                    }
                                `}
                                title={
                                    isCurrentMonth
                                        ? `${format(day, 'EEE, dd MMM yyyy')}${daySummary ? `: Out ₹${daySummary.expense}, In ₹${daySummary.income}` : ': No activity'}`
                                        : undefined
                                }
                            >
                                <span className={`text-[10px] font-black leading-none ${
                                    isCurrentMonth
                                        ? (isToday(day) ? 'text-accent-text' : 'text-primary')
                                        : 'text-text-disabled'
                                }`}>
                                    {format(day, 'd')}
                                </span>

                                {hasActivity ? (
                                    <div
                                        className={`w-full px-0.5 py-1 rounded-lg text-[8px] font-black leading-tight border text-center font-mono tracking-tight truncate ${
                                            isNetIncome
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                : isNetExpense
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                : 'bg-surface-pill text-text-muted border-border-subtle'
                                        }`}
                                    >
                                        {showSensitive
                                            ? (isNetIncome
                                                ? `+${formatBadge(daySummary.total)}`
                                                : `-${formatBadge(daySummary.expense || Math.abs(daySummary.total))}`)
                                            : '***'
                                        }
                                    </div>
                                ) : (
                                    <div className="w-1 h-1 rounded-full bg-border-subtle/50 mb-1" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Monthly Velocity & Insights Strip */}
                <div className="mt-5 pt-4 border-t border-border-subtle grid grid-cols-3 gap-2 text-center">
                    <div className="bg-surface-subtle/60 p-2.5 rounded-2xl border border-border-subtle">
                        <span className="block text-[7px] text-text-muted font-black uppercase tracking-wider">
                            Peak Spend Day
                        </span>
                        <span className="text-[11px] font-black text-primary tracking-tight mt-0.5 block truncate">
                            {insights.maxExpenseDate
                                ? `${format(insights.maxExpenseDate, 'MMM d')} (${showSensitive ? formatBadge(insights.maxExpense) : '***'})`
                                : 'None'
                            }
                        </span>
                    </div>

                    <div className="bg-surface-subtle/60 p-2.5 rounded-2xl border border-border-subtle">
                        <span className="block text-[7px] text-text-muted font-black uppercase tracking-wider">
                            Daily Velocity
                        </span>
                        <span className="text-[11px] font-black text-rose-400 tracking-tight mt-0.5 block truncate">
                            {showSensitive ? `${formatBadge(insights.avgDaily)} / day` : '***'}
                        </span>
                    </div>

                    <div className="bg-surface-subtle/60 p-2.5 rounded-2xl border border-border-subtle">
                        <span className="block text-[7px] text-text-muted font-black uppercase tracking-wider">
                            Zero Spend Days
                        </span>
                        <span className="text-[11px] font-black text-emerald-400 tracking-tight mt-0.5 block truncate">
                            {insights.zeroSpendDays} Days
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
