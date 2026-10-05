import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard as CardIcon, CheckCircle2, Circle } from 'lucide-react';
import { useCreditCards } from './hooks';
import { useTransactions, useToggleSettledStatus } from '../transactions/hooks';
import { Loader } from '../../components/ui/Loader';
import { format, parseISO } from 'date-fns';

const CreditCardDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Get Card Details
    const { data: cards } = useCreditCards();
    const card = cards?.find(c => c.id === id);

    // Get Transactions for this card
    const { data: transactions, isLoading: isTxnLoading } = useTransactions({
        credit_card_id: id,
        limit: 100 // Maybe increase or implement pagination later
    });

    const toggleSettledMutation = useToggleSettledStatus();

    const sortedTransactions = useMemo(() => {
        if (!transactions) return [];
        // Sort by date desc
        return [...transactions].sort((a, b) => {
            const dateA = new Date(a.transaction_date || a.created_at).getTime();
            const dateB = new Date(b.transaction_date || b.created_at).getTime();
            return dateB - dateA;
        });
    }, [transactions]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);

    if (!card) return <Loader fullPage text="Retrieving Matrix" />;

    const unsettledAmount = transactions
        ?.filter(t => !t.is_settled)
        .reduce((sum, t) => sum + Number(t.amount), 0); // Amount is negative for expense

    // Debt is positive value of negative expenses
    const currentDebt = Math.abs(unsettledAmount || 0);

    return (
        <div className="min-h-screen text-primary pb-20">
            <header className="px-6 py-6 flex items-center gap-4 sticky top-0 bg-page/80 backdrop-blur-3xl z-30 border-b border-border-subtle">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-black tracking-tight uppercase text-primary">{card.card_name}</h1>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-[2px]">
                        •••• {card.last_four_digits}
                    </p>
                </div>
            </header>

            <div className="p-6 space-y-8 animate-enter">
                {/* Summary Card */}
                <div className="glass-card p-6 rounded-[2.5rem] border border-border-subtle relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <CardIcon size={120} />
                    </div>
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">Current Unsettled Debt</p>
                    <h2 className="text-3xl font-black text-primary tracking-tighter mb-4">{formatCurrency(currentDebt)}</h2>

                    <div className="flex gap-4">
                        <div className="px-4 py-2 bg-surface-subtle rounded-xl border border-border-subtle">
                            <p className="text-[7px] text-text-muted uppercase font-bold mb-0.5">Limit</p>
                            <p className="text-xs font-black text-primary">{formatCurrency(card.credit_limit)}</p>
                        </div>
                        <div className="px-4 py-2 bg-surface-subtle rounded-xl border border-border-subtle">
                            <p className="text-[7px] text-text-muted uppercase font-bold mb-0.5">Due Date</p>
                            <p className="text-xs font-black text-primary">{card.payment_due_date}th</p>
                        </div>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[3px] px-2">Transactions</h3>

                    {isTxnLoading ? (
                        <div className="py-10 flex justify-center"><Loader /></div>
                    ) : sortedTransactions.length === 0 ? (
                        <p className="text-center text-text-muted text-xs py-10 uppercase tracking-widest">No Transactions Found</p>
                    ) : (
                        sortedTransactions.map(txn => {
                            const dateObj = txn.transaction_date ? parseISO(txn.transaction_date) : new Date(txn.created_at);
                            return (
                                <div
                                    key={txn.id}
                                    className={`
                                        flex items-center justify-between p-4 rounded-3xl border transition-all
                                        ${txn.is_settled
                                            ? 'bg-surface-subtle/50 border-border-subtle opacity-50'
                                            : 'bg-surface-subtle border-border-subtle hover:bg-surface-hover'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSettledMutation.mutate(txn.id);
                                            }}
                                            disabled={toggleSettledMutation.isPending}
                                            className={`
                                                w-6 h-6 rounded-full flex items-center justify-center transition-all
                                                ${txn.is_settled
                                                    ? 'bg-primary text-text-inverse'
                                                    : 'bg-surface-pill text-text-muted hover:text-primary'
                                                }
                                                ${toggleSettledMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                            `}
                                        >
                                            {txn.is_settled ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                        </button>

                                        <div>
                                            <p className={`font-bold text-sm ${txn.is_settled ? 'line-through text-text-muted' : 'text-primary'}`}>
                                                {txn.merchant_name || txn.category}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] text-text-muted font-black uppercase tracking-wider">{format(dateObj, 'MMM d')}</span>
                                                <span className="text-[9px] text-text-muted/60">•</span>
                                                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">{txn.category}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className={`font-black tracking-tighter ${txn.is_settled ? 'text-text-muted' : 'text-primary'}`}>
                                            {formatCurrency(txn.amount)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreditCardDetailsPage;
