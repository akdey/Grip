import React, { memo } from 'react';
import { format } from 'date-fns';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronRight, Banknote, Receipt } from 'lucide-react';
import { CategoryIcon } from '../../../components/ui/CategoryIcon';

interface Transaction {
    id: string;
    amount: number;
    category: string;
    category_icon?: string;
    category_color?: string;
    sub_category?: string;
    sub_category_icon?: string;
    sub_category_color?: string;
    merchant_name?: string;
    transaction_date?: string;
    created_at?: string;
    account_type: string;
    is_manual: boolean;
}

interface RecentActivityProps {
    transactions: Transaction[] | undefined;
    formatCurrency: (amount: number) => string;
}

const RecentActivityItem = memo(({ t, formatCurrency, onClick }: { t: Transaction, formatCurrency: (v: number) => string, onClick: (id: string) => void }) => {
    return (
        <div
            onClick={() => onClick(t.id)}
            className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-[1.8rem] group active:scale-[0.98] transition-all cursor-pointer hover:bg-white/[0.04]"
        >
            <div className="flex items-center gap-4">
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border border-white/[0.08]"
                    style={{
                        backgroundColor: `${t.sub_category_color || t.category_color}15` || 'rgba(255,255,255,0.03)',
                        color: t.sub_category_color || t.category_color || '#fff'
                    }}
                >
                    <CategoryIcon
                        name={t.sub_category_icon || t.category_icon}
                        size={22}
                        fallback={t.account_type === 'CASH' ? <Banknote size={18} /> : <Receipt size={18} />}
                    />
                </div>
                <div className="flex flex-col min-w-0">
                    <p className="font-semibold text-white/90 truncate max-w-[150px] text-sm leading-tight">
                        {t.merchant_name || t.category}
                    </p>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">
                        {format(new Date(t.transaction_date || t.created_at || new Date()), 'MMM d, yyyy')}
                    </p>
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="font-black text-white text-base leading-none tracking-tighter">
                    {formatCurrency(t.amount)}
                </p>
                <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-black border uppercase tracking-tighter mt-1.5 inline-block ${t.is_manual ? 'border-amber-500/20 text-amber-500/80' : 'border-cyan-500/20 text-cyan-500/80'
                    }`}>
                    {t.is_manual ? 'Manual' : 'System'}
                </span>
            </div>
        </div>
    );
});

const RecentActivity: React.FC<RecentActivityProps> = memo(({ transactions, formatCurrency }) => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Recents</h3>
                <NavLink to="/transactions" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/10">
                    All <ChevronRight size={10} />
                </NavLink>
            </div>

            <div className="space-y-3">
                {transactions?.map((t) => (
                    <RecentActivityItem
                        key={t.id}
                        t={t}
                        formatCurrency={formatCurrency}
                        onClick={(id) => navigate(`/transactions/${id}`)}
                    />
                ))}
            </div>
        </div>
    );
});

export default RecentActivity;
