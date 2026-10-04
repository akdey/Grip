
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Link as LinkIcon, Check } from 'lucide-react';
import { api } from '../../lib/api';

interface Transaction {
    id: string;
    merchant_name: string;
    amount: number;
    transaction_date: string;
    category: string;
    sub_category: string;
}

interface Holding {
    id: string;
    name: string;
    asset_type: string;
}

interface WealthLinkerProps {
    isOpen: boolean;
    onClose: () => void;
    holdings: Holding[];
    onLinkSuccess: () => void;
}

export const WealthLinker: React.FC<WealthLinkerProps> = ({ isOpen, onClose, holdings, onLinkSuccess }) => {
    const [step, setStep] = useState<'SELECT_TXN' | 'SELECT_HOLDING'>('SELECT_TXN');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [selectedTxn, setSelectedTxn] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [autoDetecting, setAutoDetecting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/wealth/unassigned-transactions');
            setTransactions(res.data || []);
        } catch (error) {
            console.error("Failed to fetch unassigned transactions", error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (isOpen && step === 'SELECT_TXN') {
            fetchTransactions();
        }
    }, [isOpen, step]);

    const handleLink = async (holdingId: string, txnId?: string) => {
        const targetId = txnId || selectedTxn?.id;
        if (!targetId) return;
        setLoading(true);
        try {
            await api.post('/wealth/map-transaction', {
                transaction_id: targetId,
                holding_id: holdingId,
                create_rule: false
            });
            onLinkSuccess();
            // Remove from local list
            setTransactions(prev => prev.filter(t => t.id !== targetId));
            if (selectedTxn?.id === targetId) {
                setStep('SELECT_TXN');
                setSelectedTxn(null);
            }
        } catch (error) {
            console.error("Linking failed", error);
            alert("Failed to link transaction");
        } finally {
            setLoading(false);
        }
    };

    const handleAutoDetect = async () => {
        setAutoDetecting(true);
        try {
            const res = await api.post('/wealth/auto-detect-portfolio');
            alert(`Auto-detected ${res.data.holdings_created} new assets and linked ${res.data.transactions_linked} transactions!`);
            onLinkSuccess();
            fetchTransactions();
        } catch (error) {
            console.error("Auto detect failed", error);
            alert("Auto detection encountered an issue");
        } finally {
            setAutoDetecting(false);
        }
    };

    if (!isOpen) return null;


    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex justify-center pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
                />
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[90vh] bg-page border-t border-border-subtle rounded-t-[3rem] flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto"
                >
                    {/* Header */}
                    <div className="p-6 sm:p-10 border-b border-border-subtle flex justify-between items-center bg-surface-subtle shrink-0">
                        <div>
                            <h3 className="text-2xl font-black text-primary tracking-tighter uppercase italic flex items-center gap-3">
                                <LinkIcon className="text-primary" size={28} />
                                Neural Linker
                            </h3>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-[4px] mt-1">Transaction-to-Asset Mapping Engine</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="w-14 h-14 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all shadow-xl group"
                            >
                                <ChevronDown size={28} className="group-hover:translate-y-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden p-6 sm:p-10 flex flex-col">

                        {step === 'SELECT_TXN' ? (
                            <>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                    <div>
                                        <p className="text-text-muted text-sm">
                                            {transactions.length} unassigned investment contribution{transactions.length === 1 ? '' : 's'}
                                        </p>
                                        <p className="text-[11px] text-text-muted opacity-70">
                                            Debits from Groww, RD, APY, PLI, Bank to map to your portfolio assets.
                                        </p>
                                    </div>
                                    {transactions.length > 0 && (
                                        <button
                                            onClick={handleAutoDetect}
                                            disabled={autoDetecting}
                                            className="px-3.5 py-2 rounded-xl bg-accent text-black font-semibold text-xs hover:bg-accent-hover transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                                        >
                                            {autoDetecting ? "Detecting..." : "⚡ Auto-Detect & Map All"}
                                        </button>
                                    )}
                                </div>

                                {loading && transactions.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="animate-spin w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full"></div>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-2">
                                        {transactions.map(txn => (
                                            <div
                                                key={txn.id}
                                                className="p-3.5 rounded-xl border border-border-subtle bg-surface-subtle hover:bg-surface-hover transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 group"
                                            >
                                                <div 
                                                    onClick={() => { setSelectedTxn(txn); setStep('SELECT_HOLDING'); }}
                                                    className="cursor-pointer flex-1"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-primary text-sm">{txn.merchant_name || "Investment"}</p>
                                                        {txn.sub_category && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border-subtle text-text-muted">
                                                                {txn.sub_category}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-xs text-text-muted">{txn.transaction_date ? new Date(txn.transaction_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ""}</p>
                                                        {txn.remarks && (
                                                            <span className="text-xs text-text-secondary italic">
                                                                • "{txn.remarks}"
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 self-end sm:self-center">
                                                    <p className="text-primary font-mono font-bold text-sm">₹{Math.abs(txn.amount).toLocaleString('en-IN')}</p>
                                                    
                                                    {txn.suggested_holding_id && (
                                                        <button
                                                            onClick={() => handleLink(txn.suggested_holding_id, txn.id)}
                                                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-1 active:scale-95"
                                                        >
                                                            <Check size={12} /> Map: {txn.suggested_holding_name}
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => { setSelectedTxn(txn); setStep('SELECT_HOLDING'); }}
                                                        className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle text-xs text-text-muted hover:text-primary transition-colors"
                                                    >
                                                        Choose Asset →
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {transactions.length === 0 && (
                                            <div className="text-center text-text-muted mt-12 py-8 bg-surface-subtle rounded-2xl border border-dashed border-border-subtle">
                                                <p className="font-medium text-sm text-primary">All caught up!</p>
                                                <p className="text-xs text-text-muted mt-1">No unassigned investment contributions found.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => setStep('SELECT_TXN')}
                                        className="text-xs text-text-muted hover:text-primary transition-colors"
                                    >
                                        ← Back to Transactions
                                    </button>
                                    <div className="px-3 py-1 bg-accent-subtle rounded-full border border-border-subtle">
                                        <span className="text-xs text-primary font-medium">
                                            Linking: {selectedTxn?.merchant_name} (₹{Math.abs(selectedTxn?.amount || 0)})
                                        </span>
                                    </div>
                                </div>

                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search holdings..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-surface-subtle border border-border-subtle text-primary rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-border-default placeholder:text-text-muted"
                                    />
                                </div>

                                <p className="text-text-muted text-xs mb-2">Select the Asset to link to:</p>

                                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                    {holdings
                                        .filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(h => (
                                            <div
                                                key={h.id}
                                                onClick={() => handleLink(h.id)}
                                                className="p-3 rounded-xl border border-border-subtle bg-surface-subtle hover:bg-surface-hover cursor-pointer transition-colors flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="font-medium text-primary">{h.name}</p>
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface text-text-muted">{h.asset_type}</span>
                                                </div>
                                                {loading ? (
                                                    <div className="animate-spin w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"></div>
                                                ) : (
                                                    <Check size={16} className="text-primary opacity-0 hover:opacity-100" />
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </>
                        )}

                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
