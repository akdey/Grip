import React, { useState } from 'react';
import { ArrowLeft, Plus, ArrowDownLeft, ArrowUpRight, Info, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePeerBalances, usePeerHistory, useAddLedgerEntry, useUpdateSettleUpEntry, useDeleteSettleUpEntry } from '../features/settle-up/hooks';
import { Loader } from '../components/ui/Loader';
import { Drawer } from '../components/ui/Drawer';
import { formatDistanceToNow, parseISO } from 'date-fns';

const SettleUp: React.FC = () => {
    const navigate = useNavigate();
    const { data: balances, isLoading } = usePeerBalances();
    const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Add/Edit Entry State
    const [editingEntry, setEditingEntry] = useState<any | null>(null);
    const [newPeerName, setNewPeerName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newRemarks, setNewRemarks] = useState('');
    const [newType, setNewType] = useState<'expense' | 'income'>('expense');

    const addMutation = useAddLedgerEntry();
    const updateMutation = useUpdateSettleUpEntry();
    const deleteMutation = useDeleteSettleUpEntry();

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(Math.abs(amount));

    const handleSaveEntry = () => {
        if (!newPeerName.trim() || !newAmount.trim()) return;

        const amount = parseFloat(newAmount);
        if (isNaN(amount) || amount <= 0) return;

        const finalAmount = newType === 'expense' ? -amount : amount;

        if (editingEntry) {
            updateMutation.mutate({
                id: editingEntry.id,
                peer_name: newPeerName.trim(),
                amount: finalAmount,
                remarks: newRemarks.trim() || undefined,
            }, {
                onSuccess: () => resetForm()
            });
        } else {
            addMutation.mutate({
                peer_name: newPeerName.trim(),
                amount: finalAmount,
                remarks: newRemarks.trim() || undefined,
            }, {
                onSuccess: () => resetForm()
            });
        }
    };

    const resetForm = () => {
        setNewPeerName('');
        setNewAmount('');
        setNewRemarks('');
        setNewType('expense');
        setEditingEntry(null);
        setShowAddForm(false);
    };

    const handleEdit = (entry: any) => {
        setEditingEntry(entry);
        setNewPeerName(entry.peer_name);
        setNewAmount(Math.abs(entry.amount).toString());
        setNewType(entry.amount < 0 ? 'expense' : 'income');
        setNewRemarks(entry.remarks || '');
        setShowAddForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this record?')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <Loader fullPage text="Loading balances" />;

    return (
        <div className="min-h-screen text-primary pb-24">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-page/80 backdrop-blur-3xl z-30 border-b border-border-subtle">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-primary">Settle Up</h1>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5">
                            {balances?.length || 0} active peers
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="w-10 h-10 rounded-full bg-primary text-background flex items-center justify-center active:scale-90 transition-all shadow-md"
                >
                    <Plus size={20} />
                </button>
            </header>

            {/* Balances List */}
            <div className="px-4 py-6 space-y-3">
                {(!balances || balances.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-40 opacity-10 space-y-6">
                        <ArrowUpRight size={80} strokeWidth={1} />
                        <p className="font-black uppercase tracking-[4px] text-[10px] text-center px-10">
                            No active balances
                        </p>
                    </div>
                ) : (
                    balances.map((peer) => {
                        const isOwed = peer.net_balance < 0; // Negative = they owe you
                        return (
                            <div
                                key={peer.peer_name}
                                onClick={() => setSelectedPeer(peer.peer_name)}
                                className="flex items-center justify-between p-4 bg-surface-subtle hover:bg-surface-hover transition-all border border-border-subtle rounded-2xl cursor-pointer active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border border-border-subtle ${isOwed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {isOwed ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-primary text-sm">{peer.peer_name}</p>
                                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1">
                                            {peer.last_activity_date
                                                ? formatDistanceToNow(parseISO(peer.last_activity_date), { addSuffix: true })
                                                : 'No activity'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black text-base tracking-tighter ${isOwed ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatCurrency(peer.net_balance)}
                                    </p>
                                    <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isOwed ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                                        {isOwed ? 'They owe you' : 'You owe them'}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Peer History Drawer */}
            <PeerHistoryDrawer
                peerName={selectedPeer}
                isOpen={!!selectedPeer}
                onClose={() => setSelectedPeer(null)}
                formatCurrency={formatCurrency}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* Add/Edit Entry Drawer */}
            <Drawer
                isOpen={showAddForm}
                onClose={resetForm}
                title={editingEntry ? "Edit Record" : "Add Record"}
                height="h-[90vh]"
            >
                <div className="space-y-6 px-2 pb-10">
                    {/* Info Note */}
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-accent-subtle border border-accent-border">
                        <Info size={16} className="text-accent-text mt-0.5 shrink-0" />
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                            Manual entries added here only update peer balances and <strong className="text-accent-text">will not affect your main expense tracking</strong>.
                        </p>
                    </div>

                    {/* Type Toggle */}
                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-surface-subtle border border-border-subtle rounded-2xl">
                        <button
                            onClick={() => setNewType('expense')}
                            className={`py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${newType === 'expense'
                                ? 'bg-status-success-bg text-status-success-text border border-status-success-border shadow-sm'
                                : 'text-text-muted hover:text-primary'
                                }`}
                        >
                            I Lent
                        </button>
                        <button
                            onClick={() => setNewType('income')}
                            className={`py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${newType === 'income'
                                ? 'bg-status-danger-bg text-status-danger-text border border-status-danger-border shadow-sm'
                                : 'text-text-muted hover:text-primary'
                                }`}
                        >
                            I Borrowed
                        </button>
                    </div>

                    {/* Peer Name */}
                    <div className="space-y-2">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-[3px] ml-1">Person</label>
                        <input
                            type="text"
                            value={newPeerName}
                            onChange={(e) => setNewPeerName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:outline-none focus:border-border-default placeholder-text-muted/50"
                        />
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-[3px] ml-1">Amount</label>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted font-bold">₹</span>
                            <input
                                type="number"
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                                placeholder="0"
                                className="w-full bg-surface-subtle border border-border-subtle rounded-2xl pl-10 pr-5 py-4 text-sm font-bold text-primary focus:outline-none focus:border-border-default placeholder-text-muted/50"
                            />
                        </div>
                    </div>

                    {/* Remarks */}
                    <div className="space-y-2">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-[3px] ml-1">Note (Optional)</label>
                        <input
                            type="text"
                            value={newRemarks}
                            onChange={(e) => setNewRemarks(e.target.value)}
                            placeholder="e.g. Dinner split"
                            className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:outline-none focus:border-border-default placeholder-text-muted/50"
                        />
                    </div>

                    <button
                        onClick={handleSaveEntry}
                        disabled={addMutation.isPending || updateMutation.isPending || !newPeerName.trim() || !newAmount.trim()}
                        className="w-full py-5 rounded-[2rem] bg-primary text-background font-black text-lg shadow-2xl active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                    >
                        {addMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingEntry ? 'Update Record' : 'Add Record')}
                    </button>
                </div>
            </Drawer>
        </div>
    );
};

// Sub-component: Peer History Drawer
const PeerHistoryDrawer = ({
    peerName,
    isOpen,
    onClose,
    formatCurrency,
    onEdit,
    onDelete
}: {
    peerName: string | null;
    isOpen: boolean;
    onClose: () => void;
    formatCurrency: (n: number) => string;
    onEdit: (entry: any) => void;
    onDelete: (id: string) => void;
}) => {
    const { data: history, isLoading } = usePeerHistory(peerName || '');

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title={peerName || ''} height="h-[90vh]">
            <div className="space-y-4 px-2 pb-10">
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-[3px] ml-1">Transaction History</p>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader text="Loading history" />
                    </div>
                ) : (!history || history.length === 0) ? (
                    <div className="flex flex-col items-center py-20 opacity-20 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[4px]">No records yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((entry) => {
                            const isDebit = entry.amount < 0; // You gave money
                            return (
                                <div
                                    key={entry.id}
                                    onClick={() => onEdit(entry)}
                                    className="group flex items-center justify-between p-3.5 bg-surface-subtle border border-border-subtle rounded-2xl relative overflow-hidden cursor-pointer hover:bg-surface-hover active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${isDebit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {isDebit ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-primary">
                                                {isDebit ? 'You lent' : 'You received'}
                                            </p>
                                            {entry.remarks && (
                                                <p className="text-[9px] text-text-muted mt-0.5 truncate">{entry.remarks}</p>
                                            )}
                                            <p className="text-[8px] text-text-muted/70 mt-0.5">
                                                {formatDistanceToNow(parseISO(entry.date), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 ml-3 flex-shrink-0">
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-1 mb-0.5">
                                                {entry.transaction_id && (
                                                    <span className="text-[6px] px-1 py-0 rounded bg-accent-subtle border border-accent-border text-accent-text font-black uppercase tracking-tighter">
                                                        Synced
                                                    </span>
                                                )}
                                                <p className={`font-black text-sm tracking-tighter ${isDebit ? 'text-primary' : 'text-emerald-500'}`}>
                                                    {isDebit ? '-' : '+'}{formatCurrency(entry.amount)}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation(); // Prevent trigger onEdit
                                                onDelete(entry.id);
                                            }}
                                            className="w-8 h-8 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500/40 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 active:scale-90 transition-all"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Drawer>
    );
};

export default SettleUp;
