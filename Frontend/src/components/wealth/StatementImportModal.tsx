import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
// Dynamic import for xlsx will be handled in handleFileUpload

interface StatementImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Transaction {
    transaction_date: string;
    scheme_name: string;
    folio_number?: string;
    amount: number;
    units: number;
    nav: number;
    transaction_type: string;
}

type ImportSource = 'CAMS' | 'KFin' | 'MFCentral';

export const StatementImportModal: React.FC<StatementImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [importResult, setImportResult] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [source, setSource] = useState<ImportSource>('CAMS');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = event.target?.result;
                let parsed: Transaction[] = [];

                if (file.name.endsWith('.csv')) {
                    parsed = parseCSV(data as string);
                } else {
                    // Excel parsing - Dynamic Import
                    const XLSX = await import('xlsx');
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    parsed = parseExcel(jsonData as any[][]);
                }

                if (parsed.length === 0) {
                    setError(`No valid transactions found. Please check if matches ${source} format.`);
                } else {
                    setTransactions(parsed);
                    setError('');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to parse file. Please ensure it is a valid statement file.');
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };

    const parseExcel = (rows: any[][]): Transaction[] => {
        let headerRowIndex = -1;

        // Dynamic header detection based on source
        for (let i = 0; i < Math.min(rows.length, 25); i++) {
            const rowStr = rows[i].join(' ').toLowerCase();

            // Common keywords for all formats
            if (rowStr.includes('amount') && (rowStr.includes('units') || rowStr.includes('unit'))) {
                // Additional checks to filter out summary tables
                if (rowStr.includes('date') || rowStr.includes('scheme') || rowStr.includes('folio')) {
                    headerRowIndex = i;
                    break;
                }
            }
        }

        if (headerRowIndex === -1) return [];

        const headers = rows[headerRowIndex].map(h => String(h).toLowerCase().trim().replace(/_/g, ' '));
        const findCol = (aliases: string[]) => headers.findIndex(h => aliases.some(a => h.includes(a)));

        // Generalized Column Mappings
        const dateIdx = findCol(['date', 'trade date', 'txn date', 'transaction date']);
        // Scheme: CAMS=scheme, KFin=fund, desc
        const schemeIdx = findCol(['scheme', 'product code', 'fund name', 'description', 'security name']);
        const folioIdx = findCol(['folio', 'account no']);
        const typeIdx = findCol(['trasaction_type', 'transaction type', 'txn type', 'nature', 'description']);
        const amountIdx = findCol(['amount', 'value']);
        const unitsIdx = findCol(['unit', 'quantity']);
        const navIdx = findCol(['nav', 'price', 'rate']);

        if (dateIdx === -1 || amountIdx === -1) return [];

        const transactions: Transaction[] = [];

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[dateIdx] && !row[amountIdx]) continue;

            // Date Parsing
            let dateStr = row[dateIdx];
            if (typeof dateStr === 'number') {
                // Excel serial date
                const d = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
                dateStr = d.toISOString().split('T')[0];
            } else if (dateStr) {
                dateStr = parseDateString(String(dateStr));
            }

            if (!dateStr) continue;

            const parseNum = (val: any) => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                const cleaned = String(val).replace(/[^0-9.-]/g, '');
                const num = parseFloat(cleaned);
                return isNaN(num) ? 0 : num;
            };

            const amt = Math.abs(parseNum(row[amountIdx]));
            const units = Math.abs(parseNum(row[unitsIdx]));
            const nav = navIdx !== -1 ? parseNum(row[navIdx]) : 0;

            // Fallback for transaction type if missing, try to infer or default
            let txnType = 'Purchase';
            if (typeIdx !== -1 && row[typeIdx]) {
                txnType = String(row[typeIdx]);
            } else if (schemeIdx !== -1 && row[schemeIdx]) {
                // Sometimes type is mixed with scheme or description in some formats? 
                // Usually not, but let's stick to standard columns.
            }

            // MFCentral/KFin might combine strings differently
            const schemeName = schemeIdx !== -1 ? String(row[schemeIdx]).trim() : "Unknown Scheme";

            if (amt === 0 && units === 0) continue;

            transactions.push({
                transaction_date: dateStr,
                scheme_name: schemeName,
                folio_number: folioIdx !== -1 ? String(row[folioIdx]) : undefined,
                transaction_type: txnType,
                amount: amt,
                units: units,
                nav: nav
            });
        }
        return transactions;
    };

    const parseCSV = (csvText: string): Transaction[] => {
        const lines = csvText.split('\n');
        let headerIdx = -1;

        for (let i = 0; i < Math.min(lines.length, 20); i++) {
            const l = lines[i].toLowerCase();
            if (l.includes('amount') && (l.includes('units') || l.includes('unit'))) {
                headerIdx = i;
                break;
            }
        }

        if (headerIdx === -1) return [];

        const headers = lines[headerIdx].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        const find = (aliases: string[]) => headers.findIndex(h => aliases.some(a => h.includes(a)));

        const idx = {
            date: find(['date', 'txn date']),
            scheme: find(['scheme', 'fund', 'description']),
            folio: find(['folio', 'account']),
            type: find(['type', 'nature', 'trans']),
            amount: find(['amount']),
            units: find(['unit', 'quantity']),
            nav: find(['nav', 'price', 'rate'])
        };

        const transactions: Transaction[] = [];

        for (let i = headerIdx + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // CSV split handling quotes
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));

            if (cols.length < 3) continue;

            const cleanNum = (val: string) => {
                if (!val) return 0;
                return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
            };

            const amt = Math.abs(cleanNum(cols[idx.amount]));
            const units = Math.abs(cleanNum(cols[idx.units]));
            const nav = idx.nav !== -1 ? cleanNum(cols[idx.nav]) : 0;
            const dateStr = parseDateString(cols[idx.date]);

            if (!dateStr || (amt === 0 && units === 0)) continue;

            transactions.push({
                transaction_date: dateStr,
                scheme_name: idx.scheme !== -1 ? cols[idx.scheme] : "Unknown",
                folio_number: idx.folio !== -1 ? cols[idx.folio] : undefined,
                transaction_type: idx.type !== -1 ? cols[idx.type] : 'Purchase',
                amount: amt,
                units: units,
                nav: nav
            });
        }
        return transactions;
    };

    const parseDateString = (dateStr: string): string | null => {
        if (!dateStr) return null;
        const dStr = String(dateStr).trim();

        // 02-Jan-2025
        const mmmMatch = dStr.match(/^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})$/i);
        if (mmmMatch) {
            const months: any = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
            return `${mmmMatch[3]}-${months[mmmMatch[2].toLowerCase()]}-${mmmMatch[1].padStart(2, '0')}`;
        }

        // DD/MM/YYYY or DD-MM-YYYY
        const parts = dStr.split(/[-/]/);
        if (parts.length === 3) {
            // Check if year is first or last? Standard CAS is usually DD-MM-YYYY
            if (parts[0].length === 4) return `${parts[0]}-${parts[1]}-${parts[2]}`;
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }

        // Try ISO
        if (!isNaN(Date.parse(dateStr))) {
            return new Date(dateStr).toISOString().split('T')[0];
        }

        return null;
    };

    const handleImport = async () => {
        setLoading(true);
        setError('');
        try {
            // Using CAMS import endpoint as it has a compatible schema
            const response = await api.post('/wealth/import-cams', {
                transactions,
                auto_create_holdings: true,
                detect_sip_patterns: true
            });
            setImportResult(response.data);
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to import statement');
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
                            <h3 className="font-semibold text-lg">Import Investment Statement</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Upload consolidated account statements (CAS)</p>
                        </div>
                        <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto flex-1 p-6">
                        {!importResult ? (
                            <>
                                {/* Source Selector */}
                                <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit">
                                    {['CAMS', 'KFin', 'MFCentral'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => {
                                                setSource(s as ImportSource);
                                                setTransactions([]);
                                                setError('');
                                            }}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${source === s
                                                ? 'bg-emerald-600 text-white shadow-lg'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                {/* File Upload */}
                                <div className="mb-6">
                                    <label className="block w-full">
                                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors cursor-pointer bg-white/[0.02] group">
                                            <Upload size={48} className="mx-auto mb-4 text-gray-500 group-hover:text-emerald-500 transition-colors" />
                                            <p className="text-sm font-medium mb-1">Upload {source} Statement</p>
                                            <p className="text-xs text-gray-500">Supports CSV and Excel (.xlsx, .xls)</p>
                                            <input
                                                type="file"
                                                accept=".csv,.xlsx,.xls"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                key={source} // Reset input on source change
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

                                        <div className="bg-[#050505] rounded-xl border border-white/5 max-h-64 overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-xs">
                                                <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/5 z-10">
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
                                                            <td className="p-2 whitespace-nowrap">{txn.transaction_date}</td>
                                                            <td className="p-2 truncate max-w-[200px]" title={txn.scheme_name}>{txn.scheme_name}</td>
                                                            <td className="p-2">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] ${txn.transaction_type.toLowerCase().includes('purchase') || txn.transaction_type.toLowerCase().includes('sip')
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
                                    <p className="text-sm text-gray-500">Your statement has been processed</p>
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
                                            Import
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
