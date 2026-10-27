import React, { useState, useMemo, useEffect } from 'react';
import {
    ArrowLeft,
    Plus,
    ArrowDownLeft,
    ArrowUpRight,
    Info,
    Trash2,
    Calendar,
    Search,
    Check,
    Pencil,
    User,
    Clock,
    CheckCircle2,
    Loader2,
    Sparkles,
    Filter,
    X,
    Handshake,
    ChevronRight,
    ChevronLeft,
    FileText,
    Link2,
    ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    usePeerBalances,
    usePeerHistory,
    useAddLedgerEntry,
    useUpdateSettleUpEntry,
    useDeleteSettleUpEntry,
    type PeerBalance,
    type LedgerEntry
} from '../features/settle-up/hooks';
import { Loader } from '../components/ui/Loader';
import { Drawer } from '../components/ui/Drawer';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { haptics } from '../lib/haptics';

const formatDateSafe = (dateStr?: string | null) => {
    if (!dateStr) return { full: 'No date recorded', short: 'No date', relative: '' };
    try {
        const parsed = parseISO(dateStr);
        if (!isValid(parsed)) return { full: dateStr, short: dateStr, relative: '' };
        return {
            full: format(parsed, 'EEE, dd MMM yyyy'),
            short: format(parsed, 'dd MMM yyyy'),
            relative: formatDistanceToNow(parsed, { addSuffix: true })
        };
    } catch {
        return { full: dateStr, short: dateStr, relative: '' };
    }
};

const SettleUp: React.FC = () => {
    const navigate = useNavigate();
    const { data: balances, isLoading } = usePeerBalances();
    const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Filter & Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState<'active' | 'all' | 'collect' | 'pay' | 'settled'>('active');

    // Add/Edit Entry State
    const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
    const [newPeerName, setNewPeerName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newDate, setNewDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [newRemarks, setNewRemarks] = useState('');
    const [newType, setNewType] = useState<'lent' | 'received'>('lent');

    const addMutation = useAddLedgerEntry();
    const updateMutation = useUpdateSettleUpEntry();
    const deleteMutation = useDeleteSettleUpEntry();

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(Math.abs(amount));

    // Calculate High-level KPIs
    const { totalToCollect, totalToPay, collectCount, payCount, settledCount, activeCount } = useMemo(() => {
        let collect = 0;
        let pay = 0;
        let cCount = 0;
        let pCount = 0;
        let sCount = 0;
        balances?.forEach(p => {
            const val = Number(p.net_balance);
            if (val > 0) {
                collect += val;
                cCount++;
            } else if (val < 0) {
                pay += Math.abs(val);
                pCount++;
            } else {
                sCount++;
            }
        });
        return {
            totalToCollect: collect,
            totalToPay: pay,
            collectCount: cCount,
            payCount: pCount,
            settledCount: sCount,
            activeCount: cCount + pCount
        };
    }, [balances]);

    // Filtered Balances List
    const filteredBalances = useMemo(() => {
        if (!balances) return [];
        return balances
            .filter(p => {
                const matchesSearch = p.peer_name.toLowerCase().includes(searchTerm.toLowerCase());
                if (!matchesSearch) return false;
                if (filterMode === 'active') return Number(p.net_balance) !== 0;
                if (filterMode === 'collect') return Number(p.net_balance) > 0;
                if (filterMode === 'pay') return Number(p.net_balance) < 0;
                if (filterMode === 'settled') return Number(p.net_balance) === 0;
                return true; // 'all'
            })
            .sort((a, b) => {
                // In 'all' view, keep active non-zero balances at top
                const aActive = Math.abs(Number(a.net_balance)) > 0 ? 1 : 0;
                const bActive = Math.abs(Number(b.net_balance)) > 0 ? 1 : 0;
                if (aActive !== bActive) return bActive - aActive;
                return new Date(b.last_activity_date || 0).getTime() - new Date(a.last_activity_date || 0).getTime();
            });
    }, [balances, searchTerm, filterMode]);

    const handleSaveEntry = () => {
        if (!newPeerName.trim() || !newAmount.trim()) return;

        const amount = parseFloat(newAmount);
        if (isNaN(amount) || amount <= 0) return;

        haptics.impact('medium');
        // Backend: Positive = They owe you (You lent), Negative = You owe them (You borrowed / received)
        const finalAmount = newType === 'lent' ? amount : -amount;

        if (editingEntry) {
            updateMutation.mutate({
                id: editingEntry.id,
                peer_name: newPeerName.trim(),
                amount: finalAmount,
                date: newDate || format(new Date(), 'yyyy-MM-dd'),
                remarks: newRemarks.trim() || undefined,
            }, {
                onSuccess: () => {
                    haptics.notification('success');
                    resetForm();
                },
                onError: () => haptics.notification('error')
            });
        } else {
            addMutation.mutate({
                peer_name: newPeerName.trim(),
                amount: finalAmount,
                date: newDate || format(new Date(), 'yyyy-MM-dd'),
                remarks: newRemarks.trim() || undefined,
            }, {
                onSuccess: () => {
                    haptics.notification('success');
                    resetForm();
                },
                onError: () => haptics.notification('error')
            });
        }
    };

    const resetForm = () => {
        setNewPeerName('');
        setNewAmount('');
        setNewDate(format(new Date(), 'yyyy-MM-dd'));
        setNewRemarks('');
        setNewType('lent');
        setEditingEntry(null);
        setShowAddForm(false);
    };

    const handleEdit = (entry: LedgerEntry) => {
        haptics.selection();
        setEditingEntry(entry);
        setNewPeerName(entry.peer_name);
        setNewAmount(Math.abs(entry.amount).toString());
        setNewDate(entry.date ? entry.date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
        // Positive = Lent, Negative = Received
        setNewType(entry.amount >= 0 ? 'lent' : 'received');
        setNewRemarks(entry.remarks || '');
        setShowAddForm(true);
    };

    const handleDelete = (id: string) => {
        haptics.impact('medium');
        if (confirm('Are you sure you want to delete this record?')) {
            deleteMutation.mutate(id, {
                onSuccess: () => haptics.notification('success'),
                onError: () => haptics.notification('error')
            });
        }
    };

    const handleQuickSettle = (peerName: string, netBalance: number) => {
        haptics.impact('medium');
        setNewPeerName(peerName);
        setNewAmount(Math.abs(netBalance).toString());
        setNewDate(format(new Date(), 'yyyy-MM-dd'));
        setNewRemarks('Settlement payment');
        // If they owe you (netBalance > 0), to settle you record "received" (-)
        // If you owe them (netBalance < 0), to settle you record "lent/paid" (+)
        setNewType(netBalance > 0 ? 'received' : 'lent');
        setShowAddForm(true);
    };

    if (isLoading) return <Loader fullPage text="Loading balances" />;

    return (
        <div className="min-h-screen text-primary pb-28">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-page/85 backdrop-blur-3xl z-30 border-b border-border-subtle">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            haptics.selection();
                            navigate(-1);
                        }}
                        className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all shadow-sm"
                        title="Go back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-primary flex items-center gap-2">
                            Settle Up
                        </h1>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-[2px] mt-0.5">
                            {activeCount} active • {settledCount} settled
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        haptics.selection();
                        resetForm();
                        setShowAddForm(true);
                    }}
                    className="h-10 px-4 rounded-full bg-primary text-text-inverse font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shadow-md"
                >
                    <Plus size={16} />
                    <span>Add Record</span>
                </button>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-5 space-y-6">
                {/* Redesigned 2-Card KPI Strip: Full readability without truncation */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* To Collect Card */}
                    <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                                <ArrowUpRight size={15} className="shrink-0 stroke-[2.5]" />
                                <span>To Collect</span>
                            </span>
                            <span className="text-[8.5px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
                                {collectCount} {collectCount === 1 ? 'contact' : 'contacts'}
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-500 tracking-tight mt-2.5 break-words">
                            {formatCurrency(totalToCollect)}
                        </p>
                        <span className="text-[10px] font-semibold text-text-muted mt-1 block">
                            They owe you
                        </span>
                    </div>

                    {/* To Pay Card */}
                    <div className="bg-surface-subtle border border-border-subtle rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-rose-500/30 transition-all">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                                <ArrowDownLeft size={15} className="shrink-0 stroke-[2.5]" />
                                <span>To Pay</span>
                            </span>
                            <span className="text-[8.5px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
                                {payCount} {payCount === 1 ? 'contact' : 'contacts'}
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl md:text-3xl font-black text-rose-500 tracking-tight mt-2.5 break-words">
                            {formatCurrency(totalToPay)}
                        </p>
                        <span className="text-[10px] font-semibold text-text-muted mt-1 block">
                            You owe them
                        </span>
                    </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search person or merchant..."
                            className="w-full bg-surface-subtle border border-border-subtle rounded-2xl pl-10 pr-10 py-3 text-xs font-semibold text-primary focus:outline-none focus:border-border-default placeholder:text-text-muted/60 transition-colors"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary p-1"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills with Settled & All options */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                        <button
                            onClick={() => { haptics.selection(); setFilterMode('active'); }}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                                filterMode === 'active'
                                    ? 'bg-primary text-text-inverse border-primary shadow-sm'
                                    : 'bg-surface-subtle text-text-muted border-border-subtle hover:text-primary hover:bg-surface-hover'
                            }`}
                        >
                            Active ({activeCount})
                        </button>
                        <button
                            onClick={() => { haptics.selection(); setFilterMode('collect'); }}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                                filterMode === 'collect'
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                    : 'bg-surface-subtle text-emerald-500/80 border-border-subtle hover:text-emerald-500 hover:bg-surface-hover'
                            }`}
                        >
                            To Collect ({collectCount})
                        </button>
                        <button
                            onClick={() => { haptics.selection(); setFilterMode('pay'); }}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                                filterMode === 'pay'
                                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                    : 'bg-surface-subtle text-rose-500/80 border-border-subtle hover:text-rose-500 hover:bg-surface-hover'
                            }`}
                        >
                            To Pay ({payCount})
                        </button>
                        <button
                            onClick={() => { haptics.selection(); setFilterMode('settled'); }}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                                filterMode === 'settled'
                                    ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
                                    : 'bg-surface-subtle text-text-muted border-border-subtle hover:text-primary hover:bg-surface-hover'
                            }`}
                        >
                            Settled ({settledCount})
                        </button>
                        <button
                            onClick={() => { haptics.selection(); setFilterMode('all'); }}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                                filterMode === 'all'
                                    ? 'bg-surface border-border-default text-primary shadow-sm'
                                    : 'bg-surface-subtle text-text-muted border-border-subtle hover:text-primary hover:bg-surface-hover'
                            }`}
                        >
                            All ({balances?.length || 0})
                        </button>
                    </div>
                </div>

                {/* Balances List */}
                <div className="space-y-3">
                    {filteredBalances.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-surface-subtle/40 border border-border-subtle rounded-3xl p-6 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted/40">
                                <Handshake size={32} />
                            </div>
                            <div>
                                <p className="font-black uppercase tracking-[3px] text-xs text-primary">
                                    {searchTerm ? 'No Matching Contacts' : filterMode === 'settled' ? 'No Settled Contacts' : 'All Settled Up'}
                                </p>
                                <p className="text-[11px] text-text-muted mt-1 max-w-xs">
                                    {searchTerm
                                        ? `No records found matching "${searchTerm}". Try another name.`
                                        : filterMode === 'settled'
                                        ? 'No settled contact ledgers found in this view.'
                                        : 'You have no outstanding debts or receivables with friends or merchants.'}
                                </p>
                            </div>
                            {!searchTerm && (
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setShowAddForm(true);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-primary text-text-inverse font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                                >
                                    <Plus size={14} /> Add First Record
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredBalances.map((peer) => {
                            const net = Number(peer.net_balance);
                            const isOwed = net > 0;
                            const isDebt = net < 0;
                            const isSettled = net === 0;
                            const initial = peer.peer_name ? peer.peer_name.trim().charAt(0).toUpperCase() : '?';

                            return (
                                <div
                                    key={peer.peer_name}
                                    onClick={() => {
                                        haptics.selection();
                                        setSelectedPeer(peer.peer_name);
                                    }}
                                    className="p-3.5 sm:p-4 bg-surface-subtle hover:bg-surface-hover transition-all border border-border-subtle hover:border-border-default/60 rounded-2xl cursor-pointer active:scale-[0.985] group shadow-none hover:shadow-sm"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            {/* Avatar Initial */}
                                            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border shadow-inner ${
                                                isOwed
                                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                                                    : isDebt
                                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                                                    : 'bg-surface border-border-subtle text-text-muted'
                                            }`}>
                                                {initial}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="font-bold text-primary text-sm sm:text-base truncate group-hover:text-accent-text transition-colors">
                                                    {peer.peer_name}
                                                </p>
                                                {peer.last_activity_date && (
                                                    <p className="text-[10px] text-text-muted font-medium mt-0.5">
                                                        Active {formatDateSafe(peer.last_activity_date).short}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className={`font-black text-base tracking-tight ${
                                                isOwed
                                                    ? 'text-emerald-500'
                                                    : isDebt
                                                    ? 'text-rose-500'
                                                    : 'text-text-muted font-bold'
                                            }`}>
                                                {isOwed
                                                    ? `+${formatCurrency(net)}`
                                                    : isDebt
                                                    ? `-${formatCurrency(net)}`
                                                    : '₹0'}
                                            </p>
                                            <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 border ${
                                                isOwed
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                                    : isDebt
                                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                                    : 'bg-surface border-border-subtle text-text-muted/80'
                                            }`}>
                                                {isSettled && <CheckCircle2 size={10} />}
                                                {isOwed ? 'They owe you' : isDebt ? 'You owe them' : 'Settled'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Peer History Drawer */}
            <PeerHistoryDrawer
                peerName={selectedPeer}
                peerBalance={balances?.find(b => b.peer_name === selectedPeer)?.net_balance || 0}
                isOpen={!!selectedPeer}
                onClose={() => setSelectedPeer(null)}
                formatCurrency={formatCurrency}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onQuickSettle={handleQuickSettle}
            />

            {/* Add / Edit Entry Drawer */}
            <Drawer
                isOpen={showAddForm}
                onClose={resetForm}
                title={editingEntry ? "Edit Transaction Record" : "Add Settle Up Record"}
                height="max-h-[90vh] h-auto"
            >
                <div className="space-y-5 pb-4 w-full max-w-lg mx-auto overflow-x-hidden">
                    {/* Info Note */}
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-accent-subtle/50 border border-accent-border/60">
                        <Info size={16} className="text-accent-text mt-0.5 shrink-0" />
                        <p className="text-[11px] text-text-muted leading-relaxed">
                            Peer debt ledger entries track obligations between you and contacts/merchants.
                        </p>
                    </div>

                    {/* Direction Toggle with Clear Labels and Visual Indicators */}
                    <div className="space-y-2">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-[2px] ml-1">
                            Transaction Direction
                        </label>
                        <div className="grid grid-cols-2 gap-2 p-1.5 bg-surface-subtle border border-border-subtle rounded-2xl">
                            <button
                                type="button"
                                onClick={() => { haptics.selection(); setNewType('lent'); }}
                                className={`py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${
                                    newType === 'lent'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'text-text-muted hover:text-primary hover:bg-surface-hover'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <ArrowUpRight size={15} />
                                    <span>I Lent / Paid</span>
                                </span>
                                <span className={`text-[8.5px] font-semibold lowercase tracking-normal ${
                                    newType === 'lent' ? 'text-white/90' : 'text-text-muted/70'
                                }`}>
                                    they owe me (+)
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { haptics.selection(); setNewType('received'); }}
                                className={`py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${
                                    newType === 'received'
                                        ? 'bg-rose-500 text-white shadow-sm'
                                        : 'text-text-muted hover:text-primary hover:bg-surface-hover'
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <ArrowDownLeft size={15} />
                                    <span>Received / Borrowed</span>
                                </span>
                                <span className={`text-[8.5px] font-semibold lowercase tracking-normal ${
                                    newType === 'received' ? 'text-white/90' : 'text-text-muted/70'
                                }`}>
                                    repayment / I owe (-)
                                </span>
                            </button>
                        </div>

                        {/* Live Sign Preview Box */}
                        <div className={`p-2.5 rounded-xl border text-[11px] font-medium flex items-center justify-between ${
                            newType === 'lent'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        }`}>
                            <span>
                                {newType === 'lent'
                                    ? '✓ Increases what they owe you (+ balance)'
                                    : '✓ Decreases what they owe you or increases your debt (- balance)'}
                            </span>
                            {newAmount && !isNaN(parseFloat(newAmount)) && (
                                <span className="font-black text-xs shrink-0 ml-2">
                                    {newType === 'lent' ? `+₹${newAmount}` : `-₹${newAmount}`}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Person / Merchant Name */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-[2px] ml-1">
                            Person / Merchant Name
                        </label>
                        <input
                            type="text"
                            value={newPeerName}
                            onChange={(e) => setNewPeerName(e.target.value)}
                            placeholder="e.g. Rahul Sharma, Swiggy, Landlord"
                            className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-4 py-3 text-sm font-semibold text-primary focus:outline-none focus:border-border-default placeholder:text-text-muted/50 transition-colors"
                        />
                    </div>

                    {/* Date Picker Input (Requested by user) */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-[2px] ml-1 flex items-center gap-1">
                            <Calendar size={12} /> Transaction Date
                        </label>
                        <input
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-4 py-3 text-sm font-semibold text-primary focus:outline-none focus:border-border-default transition-colors"
                        />
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-[2px] ml-1">
                            Amount (₹)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-base">₹</span>
                            <input
                                type="number"
                                step="any"
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                                placeholder="0"
                                className="w-full bg-surface-subtle border border-border-subtle rounded-2xl pl-9 pr-4 py-3 text-base font-black text-primary focus:outline-none focus:border-border-default placeholder:text-text-muted/50 transition-colors"
                            />
                        </div>

                        {/* Quick Amount Chips */}
                        <div className="flex gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                            {[100, 500, 1000, 2000, 5000].map(amt => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => {
                                        haptics.selection();
                                        setNewAmount(amt.toString());
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-surface border border-border-subtle text-[10px] font-bold text-text-muted hover:text-primary hover:border-border-default transition-all whitespace-nowrap"
                                >
                                    +₹{amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note / Remarks */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-[2px] ml-1">
                            Remarks & Details (Optional)
                        </label>
                        <input
                            type="text"
                            value={newRemarks}
                            onChange={(e) => setNewRemarks(e.target.value)}
                            placeholder="e.g. Dinner bill, Trip cab, Advance payment"
                            className="w-full bg-surface-subtle border border-border-subtle rounded-2xl px-4 py-3 text-sm font-semibold text-primary focus:outline-none focus:border-border-default placeholder:text-text-muted/50 transition-colors"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSaveEntry}
                        disabled={addMutation.isPending || updateMutation.isPending || !newPeerName.trim() || !newAmount.trim()}
                        className="w-full py-4 mt-2 rounded-2xl bg-primary text-text-inverse font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {(addMutation.isPending || updateMutation.isPending) ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Saving Record...</span>
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                <span>{editingEntry ? 'Update Record' : 'Save Record'}</span>
                            </>
                        )}
                    </button>
                </div>
            </Drawer>
        </div>
    );
};

// Sub-component: Peer History Drawer
interface PeerHistoryDrawerProps {
    peerName: string | null;
    peerBalance: number;
    isOpen: boolean;
    onClose: () => void;
    formatCurrency: (n: number) => string;
    onEdit: (entry: LedgerEntry) => void;
    onDelete: (id: string) => void;
    onQuickSettle: (peerName: string, balance: number) => void;
}

const PeerHistoryDrawer: React.FC<PeerHistoryDrawerProps> = ({
    peerName,
    peerBalance,
    isOpen,
    onClose,
    formatCurrency,
    onEdit,
    onDelete,
    onQuickSettle
}) => {
    const navigate = useNavigate();
    const { data: history, isLoading } = usePeerHistory(peerName || '');
    const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

    // Reset selected entry when drawer closes or peer changes
    useEffect(() => {
        if (!isOpen) {
            setSelectedEntry(null);
        }
    }, [isOpen, peerName]);

    const handleClose = () => {
        setSelectedEntry(null);
        onClose();
    };

    const isDetailLent = selectedEntry ? selectedEntry.amount >= 0 : false;
    const detailDateInfo = selectedEntry ? formatDateSafe(selectedEntry.date || selectedEntry.created_at) : null;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={handleClose}
            title={selectedEntry ? 'Transaction Details' : (peerName || 'Ledger History')}
            height={selectedEntry ? "max-h-[85vh] h-auto" : "max-h-[88vh] h-auto"}
        >
            <div className="w-full max-w-lg mx-auto space-y-4 pb-2 sm:pb-4 overflow-x-hidden">
                {selectedEntry && detailDateInfo ? (
                    /* Detailed Transaction View */
                    <div className="space-y-4 animate-fadeIn">
                        {/* Back to Peer Ledger Navigation */}
                        <button
                            onClick={() => {
                                haptics.selection();
                                setSelectedEntry(null);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-text hover:text-primary transition-colors py-1 active:scale-95"
                        >
                            <ChevronLeft size={16} />
                            <span>Back to {peerName || 'Ledger'}</span>
                        </button>

                        {/* Hero Amount & Direction Banner */}
                        <div className="w-full p-5 rounded-2xl bg-surface-subtle border border-border-subtle text-center space-y-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                isDetailLent
                                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                                    : 'bg-rose-500/10 border-rose-500/25 text-rose-500'
                            }`}>
                                {isDetailLent ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                                {isDetailLent ? 'You Lent / Paid' : 'You Received / Borrowed'}
                            </span>

                            <p className={`text-3xl font-black tracking-tight ${
                                isDetailLent ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                                {isDetailLent ? `+${formatCurrency(selectedEntry.amount)}` : `-${formatCurrency(selectedEntry.amount)}`}
                            </p>

                            <p className="text-[11px] text-text-muted font-medium">
                                {isDetailLent
                                    ? `Added to what ${peerName || 'they'} owes you`
                                    : `Deducted from what ${peerName || 'they'} owes you`}
                            </p>
                        </div>

                        {/* Details Breakdown */}
                        <div className="space-y-2.5">
                            {/* Date Item */}
                            <div className="p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted shrink-0 mt-0.5">
                                    <Calendar size={15} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Transaction Date
                                    </span>
                                    <p className="text-xs font-bold text-primary mt-0.5">
                                        {detailDateInfo.full}
                                    </p>
                                    {detailDateInfo.relative && (
                                        <p className="text-[10px] text-text-muted font-medium mt-0.5">
                                            {detailDateInfo.relative}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Contact Item */}
                            <div className="p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted shrink-0 mt-0.5">
                                    <User size={15} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Merchant / Contact
                                    </span>
                                    <p className="text-xs font-bold text-primary mt-0.5">
                                        {selectedEntry.peer_name}
                                    </p>
                                </div>
                            </div>

                            {/* Remarks / Notes */}
                            <div className="p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted shrink-0 mt-0.5">
                                    <FileText size={15} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Remarks & Notes
                                    </span>
                                    {selectedEntry.remarks ? (
                                        <p className="text-xs font-semibold text-primary mt-1 break-words leading-relaxed bg-surface/60 px-3 py-2 rounded-xl border border-border-subtle/50">
                                            "{selectedEntry.remarks}"
                                        </p>
                                    ) : (
                                        <p className="text-xs text-text-muted/60 italic mt-0.5">
                                            No remarks provided
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Bank Sync Status & Direct Navigation */}
                            <div className="p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-text-muted shrink-0 mt-0.5">
                                    <Link2 size={15} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Source & Bank Link
                                    </span>
                                    {selectedEntry.transaction_id ? (
                                        <div className="mt-1 space-y-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-accent-text">
                                                    Linked to Bank Transaction
                                                </span>
                                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-accent-subtle border border-accent-border text-accent-text font-black uppercase">
                                                    Synced
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    haptics.impact('medium');
                                                    navigate(`/transactions/${selectedEntry.transaction_id}`);
                                                }}
                                                className="w-full py-2.5 px-3 rounded-xl bg-primary text-text-inverse hover:opacity-95 font-bold text-xs flex items-center justify-between active:scale-[0.98] transition-all shadow-sm group"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                    <span>Open Bank Transaction</span>
                                                </span>
                                                <ChevronRight size={14} className="opacity-70" />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xs font-medium text-text-muted mt-0.5">
                                            Manual ledger entry
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex items-center gap-3">
                            <button
                                onClick={() => {
                                    const entry = selectedEntry;
                                    setSelectedEntry(null);
                                    onEdit(entry);
                                }}
                                className="flex-1 py-3.5 rounded-2xl bg-primary text-text-inverse font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                            >
                                <Pencil size={15} />
                                <span>Edit Record</span>
                            </button>
                            <button
                                onClick={() => {
                                    const id = selectedEntry.id;
                                    setSelectedEntry(null);
                                    onDelete(id);
                                }}
                                className="px-4 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-rose-500/20 active:scale-95 transition-all"
                            >
                                <Trash2 size={15} />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Main Merchant Ledger List */
                    <>
                        {/* Balance & Quick Settle Banner */}
                        {peerName && (
                            <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted block">
                                        Current Standing
                                    </span>
                                    <p className={`text-lg sm:text-xl font-black tracking-tight mt-0.5 truncate ${
                                        peerBalance > 0 ? 'text-emerald-500' : peerBalance < 0 ? 'text-rose-500' : 'text-primary'
                                    }`}>
                                        {peerBalance > 0 ? `+${formatCurrency(peerBalance)}` : peerBalance < 0 ? `-${formatCurrency(peerBalance)}` : '₹0'}
                                    </p>
                                    <span className="text-[9px] font-semibold text-text-muted block mt-0.5 truncate">
                                        {peerBalance > 0 ? 'They owe you' : peerBalance < 0 ? 'You owe them' : 'Settled balance'}
                                    </span>
                                </div>

                                {peerBalance !== 0 && (
                                    <button
                                        onClick={() => onQuickSettle(peerName, peerBalance)}
                                        className="shrink-0 px-3.5 py-2 rounded-xl bg-accent-subtle border border-accent-border text-accent-text font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                                    >
                                        <CheckCircle2 size={14} />
                                        <span>Settle</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Transaction History Heading */}
                        <div className="flex items-center justify-between px-1 pt-1">
                            <p className="text-[10px] font-black uppercase tracking-[2px] text-text-muted flex items-center gap-1.5">
                                <Clock size={13} />
                                <span>Transaction Ledger ({history?.length || 0})</span>
                            </p>
                            <span className="text-[9px] text-text-muted font-semibold">
                                Tap row for details
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader text="Loading ledger history..." />
                            </div>
                        ) : (!history || history.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-60">
                                <Handshake size={40} className="text-text-muted stroke-[1.5]" />
                                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                                    No ledger records found
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((entry) => {
                                    const isLent = entry.amount >= 0; // Positive = Lent / Paid for them
                                    const dateInfo = formatDateSafe(entry.date || entry.created_at);

                                    return (
                                        <div
                                            key={entry.id}
                                            onClick={() => {
                                                haptics.selection();
                                                setSelectedEntry(entry);
                                            }}
                                            className="w-full p-3 bg-surface-subtle border border-border-subtle hover:border-border-default/60 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-hover active:scale-[0.99] transition-all"
                                        >
                                            {/* Direction Icon + Type & Short Date */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border shadow-inner ${
                                                    isLent
                                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                                                        : 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                                                }`}>
                                                    {isLent ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-xs font-bold text-primary truncate">
                                                            {isLent ? 'Lent / Paid' : 'Received / Borrowed'}
                                                        </p>
                                                        {entry.transaction_id && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    haptics.impact('light');
                                                                    navigate(`/transactions/${entry.transaction_id}`);
                                                                }}
                                                                className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded bg-accent-subtle hover:bg-accent-subtle/80 border border-accent-border text-accent-text font-black uppercase tracking-tighter shrink-0 active:scale-95 transition-all cursor-pointer"
                                                                title="Open Bank Transaction"
                                                            >
                                                                <span>Synced</span>
                                                                <ExternalLink size={9} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-semibold text-text-muted mt-0.5 truncate">
                                                        {dateInfo.short} {dateInfo.relative ? `• ${dateInfo.relative}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Amount & Chevron */}
                                            <div className="flex items-center gap-1.5 shrink-0 text-right">
                                                <span className={`font-black text-xs sm:text-sm tracking-tight ${
                                                    isLent ? 'text-emerald-500' : 'text-rose-500'
                                                }`}>
                                                    {isLent ? `+${formatCurrency(entry.amount)}` : `-${formatCurrency(entry.amount)}`}
                                                </span>
                                                <ChevronRight size={14} className="text-text-muted/50 shrink-0" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Drawer>
    );
};

export default SettleUp;
