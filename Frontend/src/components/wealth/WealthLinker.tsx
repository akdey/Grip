
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Link as LinkIcon, Check } from 'lucide-react';
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
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch transactions (we'll filter for Investment category client-side)
    const fetchTransactions = async () => {
        setLoading(true);
        try {
            // Fetch all recent transactions
            const res = await api.get('/transactions', {
                params: { limit: 100 }
            });
            // Filter for Investment category client-side
            const investmentTxns = res.data.filter((txn: Transaction) =>
                txn.category?.toLowerCase().includes('invest') ||
                txn.sub_category?.toLowerCase().includes('invest') ||
                txn.merchant_name?.toLowerCase().includes('sip') ||
                txn.merchant_name?.toLowerCase().includes('mutual')
            );
            setTransactions(investmentTxns);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
            // Fallback: show all transactions if filtering fails
            try {
                const res = await api.get('/transactions');
                setTransactions(res.data || []);
            } catch (e) {
                console.error("Fallback fetch also failed", e);
            }
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (isOpen && step === 'SELECT_TXN') {
            fetchTransactions();
        }
    }, [isOpen, step]);

    const handleLink = async (holdingId: string) => {
        if (!selectedTxn) return;
        setLoading(true);
        try {
            await api.post('/wealth/map-transaction', {
                transaction_id: selectedTxn.id,
                holding_id: holdingId,
                create_rule: true
            });
            onLinkSuccess();
            setStep('SELECT_TXN');
            setSelectedTxn(null);
            onClose();
        } catch (error) {
            console.error("Linking failed", error);
            alert("Failed to link transaction");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0F0F0F]">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <LinkIcon size={18} className="text-emerald-500" />
                            Link Transaction to Asset
                        </h3>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 h-[500px] flex flex-col">

                        {step === 'SELECT_TXN' ? (
                            <>
                                <p className="text-gray-400 text-sm mb-4">
                                    Select an investment transaction to map to your portfolio.
                                </p>

                                {loading && transactions.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                        {transactions.map(txn => (
                                            <div
                                                key={txn.id}
                                                onClick={() => { setSelectedTxn(txn); setStep('SELECT_HOLDING'); }}
                                                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-colors flex justify-between items-center group"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-200">{txn.merchant_name}</p>
                                                    <p className="text-xs text-gray-500">{new Date(txn.transaction_date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-emerald-400 font-mono font-medium">₹{Math.abs(txn.amount)}</p>
                                                    <p className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Select →</p>
                                                </div>
                                            </div>
                                        ))}
                                        {transactions.length === 0 && (
                                            <div className="text-center text-gray-600 mt-10">
                                                No 'Investment' transactions found.
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
                                        className="text-xs text-gray-500 hover:text-white transition-colors"
                                    >
                                        ← Back to Transactions
                                    </button>
                                    <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                        <span className="text-xs text-emerald-500">
                                            Linking: {selectedTxn?.merchant_name} (₹{Math.abs(selectedTxn?.amount || 0)})
                                        </span>
                                    </div>
                                </div>

                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search holdings..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-[#151515] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>

                                <p className="text-gray-400 text-xs mb-2">Select the Asset to link to:</p>

                                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                    {holdings
                                        .filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(h => (
                                            <div
                                                key={h.id}
                                                onClick={() => handleLink(h.id)}
                                                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/30 cursor-pointer transition-colors flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-200">{h.name}</p>
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-400">{h.asset_type}</span>
                                                </div>
                                                {loading ? (
                                                    <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                                ) : (
                                                    <Check size={16} className="text-emerald-500 opacity-0 hover:opacity-100" />
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
