import React, { useState } from 'react';
import { Plus, CreditCard as CardIcon, ArrowLeft } from 'lucide-react';
import { useCreditCards, useAddCreditCard, useUpdateCreditCard, type CreditCard } from './hooks';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../../components/ui/Loader';
import { CycleInfoCard } from './CycleInfoCard';

const CreditCardsPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: cards, isLoading } = useCreditCards();
    const addCardMutation = useAddCreditCard();
    const updateCardMutation = useUpdateCreditCard();
    const [showForm, setShowForm] = useState(false);
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        card_name: '',
        last_four_digits: '',
        statement_date: 1,
        payment_due_date: 20,
        credit_limit: 0
    });

    const handleEdit = (card: CreditCard) => {
        setFormData({
            card_name: card.card_name,
            last_four_digits: card.last_four_digits,
            statement_date: card.statement_date,
            payment_due_date: card.payment_due_date,
            credit_limit: card.credit_limit,
        });
        setEditingCardId(card.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingCardId(null);
        setFormData({ card_name: '', last_four_digits: '', statement_date: 1, payment_due_date: 20, credit_limit: 0 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCardId) {
                await updateCardMutation.mutateAsync({ id: editingCardId, ...formData });
            } else {
                await addCardMutation.mutateAsync(formData);
            }
            handleCancel();
        } catch (error) {
            console.error('Failed to save card:', error);
        }
    };

    if (isLoading) return <Loader fullPage text="Initializing Vault" />;

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-24 overflow-x-hidden">
            <header className="px-6 py-8 flex items-center justify-between sticky top-0 bg-[#050505]/60 backdrop-blur-3xl z-30 border-b border-white/[0.05]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight uppercase">Credit</h1>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[2px] mt-0.5">Matrix Cards</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (showForm) {
                            handleCancel();
                        } else {
                            setShowForm(true);
                        }
                    }}
                    className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center active:scale-90 transition-all shadow-xl"
                >
                    <Plus size={20} strokeWidth={3} />
                </button>
            </header>

            <div className="p-6 space-y-10 animate-enter">
                {showForm && (
                    <div className="glass-card p-6 rounded-[2.5rem] border-white/10 space-y-6">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[4px] ml-1">
                            {editingCardId ? 'Update Matrix' : 'New Card Matrix'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <input
                                placeholder="Identity Card Name"
                                value={formData.card_name}
                                onChange={e => setFormData({ ...formData, card_name: e.target.value })}
                                className="glass-input uppercase tracking-tight font-bold"
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="Last 4"
                                    value={formData.last_four_digits}
                                    onChange={e => setFormData({ ...formData, last_four_digits: e.target.value })}
                                    className="glass-input font-black"
                                    maxLength={4}
                                />
                                <input
                                    placeholder="Limit"
                                    type="number"
                                    value={formData.credit_limit}
                                    onChange={e => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                                    className="glass-input font-black"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-3xl flex flex-col justify-center">
                                    <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest pl-2 mb-1">Statement Day</span>
                                    <input
                                        type="number"
                                        min="1" max="31"
                                        value={formData.statement_date}
                                        onChange={e => setFormData({ ...formData, statement_date: Number(e.target.value) })}
                                        className="bg-transparent text-sm text-white focus:outline-none font-black"
                                    />
                                </div>
                                <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-3xl flex flex-col justify-center">
                                    <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest pl-2 mb-1">Terminal Day</span>
                                    <input
                                        type="number"
                                        min="1" max="31"
                                        value={formData.payment_due_date}
                                        onChange={e => setFormData({ ...formData, payment_due_date: Number(e.target.value) })}
                                        className="bg-transparent text-sm text-white focus:outline-none font-black"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="flex-1 py-4.5 rounded-[1.5rem] bg-white text-black font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
                                    {addCardMutation.isPending || updateCardMutation.isPending ? 'Syncing...' : (editingCardId ? 'Update' : 'Commit')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-6 py-4.5 rounded-[1.5rem] bg-white/5 border border-white/5 text-gray-500 font-bold text-xs uppercase active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid gap-6">
                    {cards?.map((card) => (
                        <CycleInfoCard
                            key={card.id}
                            cardId={card.id}
                            initialData={card}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>

                {cards?.length === 0 && !showForm && (
                    <div className="py-20 flex flex-col items-center justify-center opacity-10 space-y-6">
                        <CardIcon size={80} strokeWidth={1} />
                        <p className="font-black uppercase tracking-[4px] text-[10px] text-center px-10">Vault Empty</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreditCardsPage;
