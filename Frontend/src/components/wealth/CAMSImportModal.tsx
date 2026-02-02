import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import * as XLSX from 'xlsx';

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
                const data = event.target?.result;
                let parsed: CAMSTransaction[] = [];

                if (file.name.endsWith('.csv')) {
                    parsed = parseCAMSCSV(data as string);
                } else {
                    // Excel parsing
                    const workbook = XLSX.read(data, { type: 'binary' });
                    // Usually transactions are in the first sheet or named "Transaction Details"
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    parsed = parseCAMSExcel(jsonData as any[][]);
                }

                if (parsed.length === 0) {
                    setError('No valid transactions found. Please check if you uploaded the "Transaction Details" report.');
                } else {
                    setTransactions(parsed);
                    setError('');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to parse file. Please ensure it\'s a valid CAMS "Transaction Details" Excel/CSV.');
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };

    const parseCAMSExcel = (rows: any[][]): CAMSTransaction[] => {
        const transactions: CAMSTransaction[] = [];
        let headerRowIndex = -1;

        // Dynamic header detection - look for specific columns mentioned by user
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const rowStr = rows[i].join(' ').toLowerCase();
            // User provided: SCHEME_NAME, AMOUNT, UNITS, TRADE_DATE (or similar)
            if (
                (rowStr.includes('scheme') && rowStr.includes('amount')) ||
                (rowStr.includes('mf_name') && rowStr.includes('amount'))
            ) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) return [];

        const headers = rows[headerRowIndex].map(h => String(h).toLowerCase().trim().replace(/_/g, ' '));

        // Helper to find column index by multiple potential aliases
        const findCol = (aliases: string[]) => headers.findIndex(h => aliases.some(a => h.includes(a)));

        const dateIdx = findCol(['date', 'trade date', 'transaction date']);
        const schemeIdx = findCol(['scheme', 'product code']); // prioritize scheme name if multiple
        // Refined scheme logic: prefer "scheme" over "product code"
        const schemeNameIdx = findCol(['scheme']);

        const folioIdx = findCol(['folio']);
        // Fix: Removed 'type' to avoid matching asset class column (e.g. "Equity")
        const typeIdx = findCol(['trasaction_type', 'transaction type', 'transaction_type', 'nature', 'description']);
        const amountIdx = findCol(['amount']);
        const unitsIdx = findCol(['unit']);
        const navIdx = findCol(['nav', 'price']);

        if (dateIdx === -1 || amountIdx === -1) return [];

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            // Skip empty rows
            if (!row[dateIdx] && !row[amountIdx]) continue;

            // Date parsing
            let dateStr = row[dateIdx];
            if (typeof dateStr === 'number') {
                const d = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
                dateStr = d.toISOString().split('T')[0];
            } else if (dateStr) {
                const dStr = String(dateStr).trim();
                // Handle 02-Jan-2025
                const mmmMatch = dStr.match(/^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})$/i);
                if (mmmMatch) {
                    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
                    dateStr = `${mmmMatch[3]}-${months[mmmMatch[2].toLowerCase() as keyof typeof months]}-${mmmMatch[1].padStart(2, '0')}`;
                } else {
                    // Try parsing DD/MM/YYYY or DD-MM-YYYY
                    const parts = dStr.split(/[-/]/);
                    if (parts.length === 3) {
                        // Fallback: DD-MM-YYYY
                        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
            }

            // Number Parsing (Handle "1,00,000.00" or "₹ 1,00,000")
            const parseNum = (val: any) => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                // Robust cleaning: remove currency symbols, commas, spaces
                const cleaned = String(val).replace(/[^0-9.-]/g, '');
                const num = parseFloat(cleaned);
                return isNaN(num) ? 0 : num;
            };

            const amt = Math.abs(parseNum(row[amountIdx]));
            const units = Math.abs(parseNum(row[unitsIdx]));

            // Scheme Name preference
            const schemeName = schemeNameIdx !== -1 ? row[schemeNameIdx] : (schemeIdx !== -1 ? row[schemeIdx] : "Unknown Scheme");

            if (schemeName && dateStr) {
                transactions.push({
                    transaction_date: dateStr,
                    scheme_name: String(schemeName).trim(),
                    folio_number: folioIdx !== -1 ? String(row[folioIdx]) : undefined,
                    transaction_type: typeIdx !== -1 ? String(row[typeIdx]) : 'Purchase',
                    amount: amt,
                    units: units,
                    nav: navIdx !== -1 ? parseNum(row[navIdx]) : 0
                });
            }
        }
        return transactions;
    };

    const parseCAMSCSV = (csvText: string): CAMSTransaction[] => {
        const lines = csvText.split('\n');
        const transactions: CAMSTransaction[] = [];

        let headerIdx = -1;
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
            // Lowercase check
            const l = lines[i].toLowerCase();
            if ((l.includes('amount') && l.includes('units')) || (l.includes('mf_name') && l.includes('amount'))) {
                headerIdx = i;
                break;
            }
        }

        if (headerIdx === -1) return [];

        const headers = lines[headerIdx].toLowerCase().split(',').map(h => h.trim());
        const find = (k: string) => headers.findIndex(h => h.includes(k));

        const idx = {
            date: find('date'),
            scheme: find('scheme') !== -1 ? find('scheme') : find('mf_name'),
            folio: find('folio'),
            type: find('trasaction') !== -1 ? find('trasaction') : (find('transaction') !== -1 ? find('transaction') : find('nature')),
            amount: find('amount'),
            units: find('unit'),
            nav: find('price') !== -1 ? find('price') : find('nav')
        };

        const cleanNum = (val: string) => {
            if (!val) return 0;
            // Remove everything except digits, dots, and minus signs
            const cleaned = val.replace(/[^0-9.-]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
        };

        // Helper to parse date strings like "02-Jan-2025" or "02/01/2025"
        const parseDate = (dateStr: string) => {
            if (!dateStr) return null;
            const dStr = dateStr.trim();

            // Handle 02-Jan-2025
            const mmmMatch = dStr.match(/^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})$/i);
            if (mmmMatch) {
                const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
                return `${mmmMatch[3]}-${months[mmmMatch[2].toLowerCase()]}-${mmmMatch[1].padStart(2, '0')}`;
            }

            // Handle DD/MM/YYYY or DD-MM-YYYY
            const parts = dStr.split(/[-/]/);
            if (parts.length === 3) {
                // Assume DD-MM-YYYY
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }

            return null; // Fallback or let backend handle ISO
        };

        for (let i = headerIdx + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Regex to split by comma ignoring quotes
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));

            if (cols.length < 5) continue;
            if (!cols[idx.date] && !cols[idx.amount]) continue;

            const pAmount = cleanNum(cols[idx.amount]);
            const pUnits = cleanNum(cols[idx.units]);
            const pNav = idx.nav !== -1 ? cleanNum(cols[idx.nav]) : 0;

            // Explicit ignore of "0" amount rows if they are just headers/empty
            if (pAmount === 0 && pUnits === 0) continue;

            const parsedDate = parseDate(cols[idx.date]);
            if (!parsedDate) continue;

            transactions.push({
                transaction_date: parsedDate,
                scheme_name: cols[idx.scheme],
                folio_number: idx.folio !== -1 ? cols[idx.folio] : undefined,
                transaction_type: idx.type !== -1 ? cols[idx.type] : 'Purchase',
                amount: Math.abs(pAmount),
                units: Math.abs(pUnits),
                nav: pNav
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
                                            <p className="text-sm font-medium mb-1">Click to upload CAMS statement</p>
                                            <p className="text-xs text-gray-500">Supports CSV and Excel (.xlsx, .xls) formats</p>
                                            <input
                                                type="file"
                                                accept=".csv,.xlsx,.xls"
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
