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
        const map = new Map<string, { total: number; expense: number; income: number; investment: number; count: number }>();
        if (!transactions) return map;

        transactions.forEach(t => {
            if (t.status === 'PENDING') return;
            const dateStr = format(t.transaction_date ? parseISO(t.transaction_date) : new Date(t.created_at), 'yyyy-MM-dd');
            const amt = Number(t.amount || 0);
            const isInv = (t.category || '').toLowerCase() === 'investment';

            if (!map.has(dateStr)) {
                map.set(dateStr, { total: 0, expense: 0, income: 0, investment: 0, count: 0 });
            }
            const item = map.get(dateStr)!;

            if (isInv && amt < 0) {
                // Capital investment: track separately, do not pollute lifestyle expense
                item.investment += Math.abs(amt);
            } else if (amt < 0) {
                // True lifestyle expense
                item.expense += Math.abs(amt);
                item.total += amt;
            } else {
                // Income
                item.income += amt;
                item.total += amt;
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
        if (abs >= 100000) {
            const l = abs / 100000;
            return `₹${l >= 10 ? Math.round(l) : l.toFixed(1)}L`;
        }
        if (abs >= 10000) {
            return `₹${Math.round(abs / 1000)}k`;
        }
        if (abs >= 1000) {
            const k = abs / 1000;
            return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
        }
        return `₹${Math.round(abs)}`;
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

            <div className="glass-card rounded-[2.5rem] p-3.5 sm:p-6 border border-border-subtle relative overflow-hidden">
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
                {isLoading ? (
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2 animate-pulse">
                        {Array.from({ length: 35 }).map((_, i) => (
                            <div
                                key={i}
                                className="aspect-[3/4.2] sm:aspect-[3/3.8] min-h-[50px] p-1 border border-border-subtle/50 rounded-2xl bg-surface-subtle/40 flex flex-col items-center justify-between py-1.5"
                            >
                                <div className="w-4 h-3 rounded-md bg-border-subtle/60" />
                                <div className="w-8 h-3 rounded-md bg-border-subtle/40" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {calendarDays.map((day, i) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const daySummary = dailySummaryMap.get(dateKey);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const hasActivity = daySummary && daySummary.count > 0;
                        const hasExpense = daySummary && daySummary.expense > 0;
                        const hasIncome = daySummary && daySummary.income > 0;
                        const hasInvestment = daySummary && daySummary.investment > 0;

                        return (
                            <button
                                key={i}
                                type="button"
                                disabled={!isCurrentMonth || isLoading}
                                onClick={() => isCurrentMonth && handleDayClick(day)}
                                className={`
                                    aspect-[3/4.2] sm:aspect-[3/3.8] min-h-[50px] p-1 border rounded-2xl flex flex-col items-center justify-between py-1.5 transition-all text-center relative
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
                                        ? `${format(day, 'EEE, dd MMM yyyy')}${daySummary ? `${hasExpense ? ` | Expense: ₹${daySummary.expense}` : ''}${hasInvestment ? ` | Invested: ₹${daySummary.investment}` : ''}${hasIncome ? ` | Inflow: ₹${daySummary.income}` : ''}` : ': No activity'}`
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
                                    <div className="w-full relative">
                                        <div
                                            className={`w-full max-w-full min-w-0 px-0.5 py-1 rounded-lg text-[7.5px] font-bold leading-tight border text-center truncate tracking-tight ${
                                                hasExpense
                                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                    : hasInvestment
                                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                                    : hasIncome
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    : 'bg-surface-pill text-text-muted border-border-subtle'
                                            }`}
                                        >
                                            {showSensitive
                                                ? formatBadge(hasExpense ? daySummary.expense : hasInvestment ? daySummary.investment : daySummary.income)
                                                : '***'
                                            }
                                        </div>
                                        {/* If day has both lifestyle expense and investment, show indicator */}
                                        {hasExpense && hasInvestment && (
                                            <span className="absolute -top-1 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 ring-1 ring-page" title={`Invested: ₹${daySummary.investment}`} />
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-1 h-1 rounded-full bg-border-subtle/50 mb-1" />
                                )}
                            </button>
                        );
                    })}
                </div>
                )}

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 pt-3 pb-1 text-[9px] font-semibold text-text-muted border-t border-border-subtle/50">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2 rounded-xs bg-rose-500/20 border border-rose-500/40" />
                        <span>Lifestyle Expense</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 ring-1 ring-cyan-500/40" />
                        <span>Investment Dot (Wealth on Same Day)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2 rounded-xs bg-cyan-500/20 border border-cyan-500/40" />
                        <span>Pure Investment Day</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2 rounded-xs bg-emerald-500/20 border border-emerald-500/40" />
                        <span>Income Inflow</span>
                    </div>
                </div>

                {/* Monthly Velocity & Insights Strip */}
                <div className="mt-4 pt-3 border-t border-border-subtle grid grid-cols-3 gap-2 text-center">
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
