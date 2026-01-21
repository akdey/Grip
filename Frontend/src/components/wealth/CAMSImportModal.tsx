import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface CAMSImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface CAMSTransaction {
    transaction_date: string;
    scheme_name: string;
    folio_number?: string;
    amount: number;
    units: number;
    nav: number;
    transaction_type: string;
}

export const CAMSImportModal: React.FC<CAMSImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<CAMSTransaction[]>([]);
    const [importResult, setImportResult] = useState<any>(null);
    const [error, setError] = useState<string>('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const parsed = parseCAMSCSV(text);
                setTransactions(parsed);
                setError('');
            } catch (err) {
                setError('Failed to parse CSV file. Please ensure it\'s a valid CAMS statement.');
            }
        };
        reader.readAsText(file);
    };

    const parseCAMSCSV = (csvText: string): CAMSTransaction[] => {
        const lines = csvText.split('\n');
        const transactions: CAMSTransaction[] = [];

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = line.split(',');
            if (columns.length < 7) continue;

            // Typical CAMS CSV format: Date, Scheme, Folio, Type, Amount, Units, NAV
            transactions.push({
                transaction_date: columns[0].trim(),
                scheme_name: columns[1].trim(),
                folio_number: columns[2].trim(),
                transaction_type: columns[3].trim(),
                amount: parseFloat(columns[4].trim()),
                units: parseFloat(columns[5].trim()),
                nav: parseFloat(columns[6].trim())
            });
        }

        return transactions;
    };

    const handleImport = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/wealth/import-cams', {
                transactions,
                auto_create_holdings: true,
                detect_sip_patterns: true
            });
            setImportResult(response.data);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to import CAMS statement');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTransactions([]);
        setImportResult(null);
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0F0F0F] flex-shrink-0">
                        <div>
                            <h3 className="font-semibold text-lg">Import CAMS Statement</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Upload your consolidated account statement (CSV format)</p>
                        </div>
                        <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto flex-1 p-6">
                        {!importResult ? (
                            <>
                                {/* File Upload */}
                                <div className="mb-6">
                                    <label className="block w-full">
                                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors cursor-pointer bg-white/[0.02]">
                                            <Upload size={48} className="mx-auto mb-4 text-gray-500" />
                                            <p className="text-sm font-medium mb-1">Click to upload CAMS CSV file</p>
                                            <p className="text-xs text-gray-500">Supports CSV format only</p>
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                        </div>
                                    </label>
                                </div>

                                {/* Preview */}
                                {transactions.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <FileText size={18} className="text-emerald-500" />
                                                Preview ({transactions.length} transactions)
                                            </h4>
                                        </div>

                                        <div className="bg-[#050505] rounded-xl border border-white/5 max-h-64 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/5">
                                                    <tr className="text-left text-gray-500">
                                                        <th className="p-2">Date</th>
                                                        <th className="p-2">Scheme</th>
                                                        <th className="p-2">Type</th>
                                                        <th className="p-2 text-right">Amount</th>
                                                        <th className="p-2 text-right">Units</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transactions.slice(0, 50).map((txn, idx) => (
                                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02]">
                                                            <td className="p-2">{txn.transaction_date}</td>
                                                            <td className="p-2 truncate max-w-[200px]">{txn.scheme_name}</td>
                                                            <td className="p-2">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] ${txn.transaction_type.toLowerCase().includes('purchase')
                                                                        ? 'bg-emerald-500/10 text-emerald-500'
                                                                        : 'bg-red-500/10 text-red-500'
                                                                    }`}>
                                                                    {txn.transaction_type}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-right font-mono">₹{txn.amount.toLocaleString()}</td>
                                                            <td className="p-2 text-right font-mono">{txn.units.toFixed(3)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {transactions.length > 50 && (
                                            <p className="text-xs text-gray-500 text-center">
                                                Showing first 50 of {transactions.length} transactions
                                            </p>
                                        )}
                                    </div>
                                )}

                                {error && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                                        <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-red-400">{error}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Import Result */
                            <div className="space-y-4">
                                <div className="text-center py-6">
                                    <CheckCircle size={64} className="mx-auto mb-4 text-emerald-500" />
                                    <h4 className="text-xl font-bold mb-2">Import Successful!</h4>
                                    <p className="text-sm text-gray-500">Your CAMS statement has been processed</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">Holdings Created</p>
                                        <p className="text-2xl font-bold text-emerald-400">{importResult.holdings_created}</p>
                                    </div>
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">Holdings Updated</p>
                                        <p className="text-2xl font-bold text-blue-400">{importResult.holdings_updated}</p>
                                    </div>
                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">Transactions Processed</p>
                                        <p className="text-2xl font-bold text-purple-400">{importResult.transactions_processed}</p>
                                    </div>
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">SIP Patterns Detected</p>
                                        <p className="text-2xl font-bold text-yellow-400">{importResult.sip_patterns_detected}</p>
                                    </div>
                                </div>

                                {importResult.errors && importResult.errors.length > 0 && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                        <p className="text-xs font-medium text-red-400 mb-2">Errors:</p>
                                        <ul className="text-xs text-red-400 space-y-1">
                                            {importResult.errors.map((err: string, idx: number) => (
                                                <li key={idx}>• {err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-[#0F0F0F] flex-shrink-0 flex gap-3">
                        {!importResult ? (
                            <>
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={loading || transactions.length === 0}
                                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={18} />
                                            Import {transactions.length} Transactions
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleClose}
                                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
