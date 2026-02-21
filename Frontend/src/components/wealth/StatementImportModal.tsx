import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
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
            <div className="fixed inset-0 z-[2000] flex justify-center pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
                />
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[90vh] bg-[#050505] border-t border-white/10 rounded-t-[3rem] flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto"
                >
                    {/* Header */}
                    <div className="p-6 sm:p-10 border-b border-white/10 flex justify-between items-center bg-gradient-to-b from-white/[0.05] to-transparent shrink-0">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Statement Intelligence</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[4px] mt-1">Consolidated account statement processing</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleClose}
                                className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all shadow-xl group"
                            >
                                <ChevronDown size={28} className="group-hover:translate-y-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto flex-1 p-5 sm:p-10 custom-scrollbar">
                        {!importResult ? (
                            <>
                                {/* Source Selector */}
                                <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar whitespace-nowrap">
                                    {['CAMS', 'KFin', 'MFCentral'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => {
                                                setSource(s as ImportSource);
                                                setTransactions([]);
                                                setError('');
                                            }}
                                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${source === s
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                {/* File Upload */}
                                <div className="mb-8">
                                    <label className="block w-full">
                                        <div className="border border-dashed border-white/20 rounded-3xl p-5 sm:p-10 text-center hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all cursor-pointer bg-white/[0.01] group overflow-hidden max-w-full">
                                            <Upload size={40} className="mx-auto mb-4 text-gray-500 group-hover:text-emerald-500 group-hover:scale-110 transition-all" />
                                            <p className="text-base font-black text-white tracking-tight mb-1">Select {source} Statement</p>
                                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Supports CSV and Excel Formats</p>
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
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[4px] flex items-center gap-3">
                                                <FileText size={16} className="text-emerald-500" />
                                                Data Ingestion Preview ({transactions.length} items)
                                            </h4>
                                        </div>

                                        <div className="bg-white/[0.02] rounded-3xl border border-white/5 max-h-[40vh] overflow-auto custom-scrollbar">
                                            <table className="w-full text-xs text-left">
                                                <thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">
                                                    <tr className="text-gray-500">
                                                        <th className="px-5 py-4 font-black uppercase tracking-widest text-[9px]">Event Date</th>
                                                        <th className="px-5 py-4 font-black uppercase tracking-widest text-[9px]">Scheme Descriptor</th>
                                                        <th className="px-5 py-4 font-black uppercase tracking-widest text-[9px]">Type</th>
                                                        <th className="px-5 py-4 font-black uppercase tracking-widest text-[9px] text-right">Settlement</th>
                                                        <th className="px-5 py-4 font-black uppercase tracking-widest text-[9px] text-right">Units</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.05]">
                                                    {transactions.slice(0, 100).map((txn, idx) => (
                                                        <tr key={idx} className="hover:bg-white/[0.04] transition-colors">
                                                            <td className="px-5 py-4 whitespace-nowrap text-gray-400 font-mono">{txn.transaction_date}</td>
                                                            <td className="px-5 py-4 font-bold text-white truncate max-w-[250px]" title={txn.scheme_name}>{txn.scheme_name}</td>
                                                            <td className="px-5 py-4">
                                                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${txn.transaction_type.toLowerCase().includes('purchase') || txn.transaction_type.toLowerCase().includes('sip')
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                                                                    }`}>
                                                                    {txn.transaction_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-4 text-right font-black text-white">₹{txn.amount.toLocaleString()}</td>
                                                            <td className="px-5 py-4 text-right font-mono text-gray-400">{txn.units.toFixed(3)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {transactions.length > 100 && (
                                            <p className="text-[10px] text-gray-600 text-center font-bold uppercase tracking-widest">
                                                Truncated preview: {transactions.length - 100} more items hidden
                                            </p>
                                        )}
                                    </div>
                                )}

                                {error && (
                                    <div className="mt-6 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-4">
                                        <AlertCircle size={20} className="text-rose-500 shrink-0" />
                                        <p className="text-sm text-rose-300 font-medium">{error}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Import Result */
                            <div className="space-y-8 py-10">
                                <div className="text-center">
                                    <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                                        <CheckCircle size={48} className="text-emerald-500" />
                                    </div>
                                    <h4 className="text-3xl font-black text-white tracking-tighter uppercase italic">Ingestion Complete</h4>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-[4px] mt-2">Intelligence engine sync successful</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Assets Integrated</p>
                                            <p className="text-3xl font-black text-emerald-400 tracking-tighter">{importResult.holdings_created || 0}</p>
                                        </div>
                                        <RefreshCw size={24} className="text-emerald-500/20" />
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">State Syncs</p>
                                            <p className="text-3xl font-black text-blue-400 tracking-tighter">{importResult.holdings_updated || 0}</p>
                                        </div>
                                        <RefreshCw size={24} className="text-blue-500/20" />
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Records Processed</p>
                                            <p className="text-3xl font-black text-purple-400 tracking-tighter">{importResult.transactions_processed || 0}</p>
                                        </div>
                                        <FileText size={24} className="text-purple-500/20" />
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">SIP Signals</p>
                                            <p className="text-3xl font-black text-amber-400 tracking-tighter">{importResult.sip_patterns_detected || 0}</p>
                                        </div>
                                        <RefreshCw size={24} className="text-amber-500/20" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 sm:p-8 border-t border-white/5 bg-white/[0.01] flex-shrink-0 flex flex-col sm:flex-row gap-4">
                        {!importResult ? (
                            <>
                                <button
                                    onClick={handleClose}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/[0.05] border border-white/10 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all active:scale-[0.98]"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={loading || transactions.length === 0}
                                    className="flex-[2] py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-2xl shadow-emerald-900/20 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={20} />
                                            Initialize Migration
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleClose}
                                className="w-full py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98]"
                            >
                                Re-enter Portfolio
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
