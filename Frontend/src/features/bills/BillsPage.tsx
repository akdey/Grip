import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle, Smartphone, Home, Zap, Calendar as CalendarIcon, ArrowLeft, ShieldAlert, TrendingDown } from 'lucide-react';
import { useBills, useMarkBillPaid, useAddBill } from './hooks';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../../components/ui/Loader';
import { format, isWithinInterval, addDays, isPast } from 'date-fns';

const BillsPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: unpaidBills, isLoading } = useBills(false);
    const markPaid = useMarkBillPaid();
    const addBill = useAddBill();

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        category: 'Utilities',
        is_recurring: true
    });

    const stats = useMemo(() => {
        if (!unpaidBills) return { total: 0, overdue: 0, dueSoon: 0 };
        const now = new Date();
        const nextWeek = addDays(now, 7);

        return unpaidBills.reduce((acc, bill) => {
            const dueDate = new Date(bill.due_date);
            const amount = Number(bill.amount);
            acc.total += amount;
            if (isPast(dueDate)) {
                acc.overdue += amount;
            } else if (isWithinInterval(dueDate, { start: now, end: nextWeek })) {
                acc.dueSoon += amount;
            }
            return acc;
        }, { total: 0, overdue: 0, dueSoon: 0 });
    }, [unpaidBills]);

    const getIcon = (cat: string) => {
        switch (cat.toLowerCase()) {
            case 'utilities': return <Zap size={18} className="text-yellow-400" />;
            case 'housing': return <Home size={18} className="text-sky-400" />;
            default: return <Smartphone size={18} className="text-indigo-400" />;
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        await addBill.mutateAsync({
            ...formData,
            amount: Number(formData.amount),
            is_paid: false,
            is_recurring: formData.is_recurring
        });
        setShowForm(false);
        setFormData({ title: '', amount: '', due_date: new Date().toISOString().split('T')[0], category: 'Utilities', is_recurring: true });
    };

    if (isLoading) return <Loader fullPage text="Scanning Obligations" />;

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-24 overflow-x-hidden">
            <header className="px-6 py-8 flex items-center justify-between sticky top-0 bg-[#050505]/60 backdrop-blur-3xl z-30 border-b border-white/[0.05]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight uppercase">Surety</h1>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[2px] mt-0.5">Bills & Obligations</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center active:scale-90 transition-all shadow-xl"
                >
                    <Plus size={20} strokeWidth={3} />
                </button>
            </header>

            <div className="p-6 space-y-10 animate-enter">
                {/* Visual Summary */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-rose-500/20 to-rose-900/20 border border-rose-500/20 p-6 rounded-[2.5rem] relative overflow-hidden">
                        <ShieldAlert className="absolute -right-4 -bottom-4 text-rose-500/10" size={80} />
                        <div>
                            <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">Overdue</p>
                            <p className="text-2xl font-black text-white leading-none">₹{stats.overdue >= 1000 ? `${(stats.overdue / 1000).toFixed(1)}k` : stats.overdue}</p>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2.5rem] relative overflow-hidden">
                        <TrendingDown className="absolute -right-4 -bottom-4 text-white/5" size={80} />
                        <div>
                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Due 7d</p>
                            <p className="text-2xl font-black text-white/80 leading-none">₹{stats.dueSoon >= 1000 ? `${(stats.dueSoon / 1000).toFixed(1)}k` : stats.dueSoon}</p>
                        </div>
                    </div>
                </div>

                {showForm && (
                    <div className="glass-card p-6 rounded-[2.5rem] border-white/10 space-y-6">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[4px] ml-1">New Obligation</h3>
                        <form onSubmit={handleCreate} className="space-y-5">
                            <input
                                placeholder="Identify Title"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="glass-input uppercase tracking-tight font-bold"
                                required
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="Magnitude"
                                    type="number"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="glass-input font-black"
                                    required
                                />
                                <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-3xl flex flex-col justify-center">
                                    <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest pl-2 mb-1">Terminal Date</span>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                        className="bg-transparent text-xs text-white focus:outline-none font-bold uppercase"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="flex-1 py-4.5 rounded-[1.5rem] bg-white text-black font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
                                    {addBill.isPending ? 'Syncing...' : 'Commit'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-4.5 rounded-[1.5rem] bg-white/5 border border-white/5 text-gray-500 font-bold text-xs uppercase active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-4">
                    <h2 className="text-[9px] font-black text-gray-600 uppercase tracking-[4px] ml-2">Pending Nodes</h2>
                    {unpaidBills?.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center opacity-10 space-y-6">
                            <CheckCircle size={80} strokeWidth={1} />
                            <p className="font-black uppercase tracking-[4px] text-[10px] text-center px-10">Clearance achieved</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {unpaidBills?.map((bill) => {
                                const isOverdue = isPast(new Date(bill.due_date));
                                return (
                                    <div key={bill.id} className={`bg-white/[0.02] border ${isOverdue ? 'border-rose-500/30' : 'border-white/[0.05]'} p-5 rounded-[2rem] flex items-center justify-between group active:scale-[0.99] transition-all`}>
                                        <div className="flex items-center gap-5">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isOverdue ? 'bg-rose-500/10 border-rose-500/10' : 'bg-white/[0.03] border-white/[0.08]'}`}>
                                                {getIcon(bill.category)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-white/90 text-sm uppercase tracking-tight">{bill.title}</p>
                                                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest mt-1">
                                                    <CalendarIcon size={10} className={isOverdue ? 'text-rose-500' : 'text-gray-600'} />
                                                    <span className={isOverdue ? 'text-rose-500/80' : 'text-gray-600'}>Due: {format(new Date(bill.due_date), 'MMM d, yyyy')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-black tracking-tighter text-white">₹{Number(bill.amount).toLocaleString()}</p>
                                            <button
                                                className="mt-2 text-[8px] font-black uppercase tracking-widest py-1.5 px-3 rounded-full bg-emerald-500/10 text-emerald-500/80 border border-emerald-500/20 active:scale-90 transition-all"
                                                onClick={() => markPaid.mutate({ id: bill.id, paid: true })}
                                                disabled={markPaid.isPending}
                                            >
                                                {markPaid.isPending ? 'Syncing' : 'Clear'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillsPage;
