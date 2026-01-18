import React from 'react';
import { CreditCard as CardIcon, Calendar, TrendingUp, AlertTriangle, ShieldCheck, Pencil } from 'lucide-react';
import { useCardCycleInfo, type CreditCard } from './hooks';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../../components/ui/Loader';

interface Props {
    cardId: string;
    initialData: CreditCard;
    onEdit?: (card: CreditCard) => void;
}

export const CycleInfoCard: React.FC<Props> = ({ cardId, initialData, onEdit }) => {
    const navigate = useNavigate();
    const { data } = useCardCycleInfo(cardId);

    const card = initialData;
    const isDetailed = !!data;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    const availableLimit = (data?.credit_limit || 0) - (data?.unbilled_amount || 0);

    return (
        <div
            onClick={() => navigate(`/credit-cards/${cardId}`)}
            className="glass-card p-6 rounded-[2.5rem] relative overflow-hidden group border border-white/[0.05] active:scale-[0.99] transition-all cursor-pointer"
        >
            {/* Background Gradient Pulse */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />

            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-inner">
                            <CardIcon className="text-white/60" size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-tight text-white/90">{card.card_name}</h3>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-0.5">
                                •••• {card.last_four_digits || '0000'}
                            </p>
                        </div>
                    </div>
                    {isDetailed && data.days_until_statement <= 5 ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-500 text-[8px] font-black uppercase tracking-widest">
                            <AlertTriangle size={10} strokeWidth={3} />
                            {data.days_until_statement}d Left
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-[8px] font-black uppercase tracking-widest">
                            <ShieldCheck size={10} strokeWidth={3} />
                            Safe
                        </div>
                    )}
                    {onEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(card);
                            }}
                            className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <Pencil size={12} />
                        </button>
                    )}
                </div>

                {isDetailed ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-[3px] mb-1.5 ml-1">Spent</p>
                                <div className="text-xl font-black text-white tracking-tighter">
                                    {formatCurrency(data.unbilled_amount)}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-[3px] mb-1.5 mr-1">Available</p>
                                <div className="text-xl font-black text-emerald-400 tracking-tighter">
                                    {formatCurrency(availableLimit)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="w-full h-1.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${data.utilization_percentage > 70 ? 'bg-rose-500' :
                                        data.utilization_percentage > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`}
                                    style={{ width: `${Math.min(data.utilization_percentage, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Limit: {formatCurrency(data.credit_limit || 0)}</p>
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                    {(data.utilization_percentage ?? 0).toFixed(1)}% Used
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <Calendar size={10} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Cycle End</span>
                                </div>
                                <p className="text-[10px] font-black text-white/80 uppercase">{formatDate(data.cycle_end)}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <TrendingUp size={10} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Due Day</span>
                                </div>
                                <p className="text-[10px] font-black text-white/80 uppercase">
                                    {card.payment_due_date}th <span className="text-[8px] text-gray-700 font-bold ml-1">MONTHLY</span>
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-24 flex flex-col items-center justify-center text-gray-700">
                        <Loader />
                        <span className="text-[8px] font-black uppercase tracking-[3px] mt-4">Synchronizing</span>
                    </div>
                )}
            </div>
        </div>
    );
};
