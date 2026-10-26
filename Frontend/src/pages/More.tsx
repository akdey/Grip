import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Receipt,
    History,
    LayoutGrid,
    Hash,
    Smartphone,
    Calendar,
    Filter,
    Sparkles,
    CircleUserRound,
    CalendarClock,
    Wallet,
    Mail,
    Download,
    Target,
    Brain,
    Cpu,
    ArrowUpRight,
    Layers,
    Activity,
    Sun,
    Moon,
    Settings,
    LogOut,
    ShieldCheck,
    FileSpreadsheet,
    Check,
    AlertCircle,
    Clock,
    Lock,
    Fingerprint,
    Loader2,
    Send,
    X
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { api } from '../lib/api';
import { useSyncTrends } from '../features/sync/hooks';
import { useMonthlySummary } from '../features/dashboard/hooks';
import { usePendingTransactions } from '../features/transactions/hooks';
import { SyncTrendChart } from '../components/sync/SyncTrendChart';
import { Card } from '../components/ui/Card';
import { Drawer } from '../components/ui/Drawer';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useTheme } from '../lib/theme';
import { getBiometricsStatus, registerBiometricCredential, getDeviceBiometricName } from '../lib/webauthn';
import { haptics } from '../lib/haptics';

const FEATURE_CARDS = [
    { id: 'sync', label: 'Gmail Sync', icon: Mail, path: '/sync', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'pending', label: 'Action Center', icon: Sparkles, path: '/transactions?view=pending', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'transactions', label: 'History', icon: History, path: '/transactions', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'sureties', label: 'Sureties', icon: CalendarClock, path: '/sureties', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'goals', label: 'Goals', icon: Wallet, path: '/goals', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'categories', label: 'Categories', icon: LayoutGrid, action: 'OPEN_CATEGORIES', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'tags', label: 'Hash Tags', icon: Hash, path: '/tags', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'export', label: 'Export Data', icon: Download, action: 'OPEN_EXPORTS', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'vault', label: 'Vault', icon: Target, path: '/credit-cards', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'settle-up', label: 'Settle Up', icon: ArrowUpRight, path: '/settle-up', color: 'text-primary', bgColor: 'bg-surface-subtle' },
];

const SystemIntelligence: React.FC = () => {
    const { data: trendsData, isLoading } = useSyncTrends(30);

    if (isLoading || !trendsData?.trends || trendsData.trends.length === 0) return null;

    const totalTxns = trendsData.trends.reduce((acc, curr) => acc + (curr.manual || 0) + (curr.system || 0), 0);
    const systemTxns = trendsData.trends.reduce((acc, curr) => acc + (curr.system || 0), 0);
    const efficiency = totalTxns > 0 ? ((systemTxns / totalTxns) * 100).toFixed(0) : 0;

    return (
        <Card className="px-6 py-8 bg-surface border-border-subtle rounded-[2.5rem] relative overflow-hidden group mb-8">
            <div className="absolute right-0 top-0 p-10 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                <Cpu size={160} />
            </div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-surface-pill text-primary border border-border-subtle flex items-center justify-center shadow-xs">
                        <Brain size={20} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[4px] text-text-muted">System Autopilot</h3>
                        <h4 className="text-xl font-black text-primary tracking-tighter">Decision Efficiency</h4>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-[2px] text-text-muted mb-1">Success Rate</p>
                    <p className="text-2xl font-black text-primary">{efficiency}%</p>
                </div>
            </div>

            <SyncTrendChart data={trendsData.trends} />

            <div className="grid grid-cols-2 gap-8 mt-10 pt-8 border-t border-border-subtle">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-pill border border-border-subtle flex items-center justify-center text-primary">
                        <Activity size={14} className="text-primary" />
                    </div>
                    <div>
                        <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Processed</p>
                        <p className="text-lg font-black text-primary">{totalTxns}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 justify-end text-right">
                    <div>
                        <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">AI Handled</p>
                        <p className="text-lg font-black text-primary">{systemTxns}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-surface-pill border border-border-subtle flex items-center justify-center text-primary">
                        <Sparkles size={14} className="text-primary" />
                    </div>
                </div>
            </div>
        </Card>
    );
};

const More: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const { toggleTheme, isDark } = useTheme();
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingStatement, setIsExportingStatement] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const { data: daySummary } = useMonthlySummary(undefined, undefined, 'day');
    const { data: monthSummary } = useMonthlySummary(undefined, undefined, 'month');
    const { data: yearSummary } = useMonthlySummary(undefined, undefined, 'year');
    const { data: pendingTransactions } = usePendingTransactions();
    const pendingCount = pendingTransactions?.length || 0;

    const formatCompact = (val: number) => {
        const abs = Math.abs(val || 0);
        if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
        if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}k`;
        return `₹${Math.round(abs)}`;
    };

    const userName = user?.email?.split('@')[0] || 'Infiltrator';

    // Contingency & Emergency Contact state
    const [emergencyEmail, setEmergencyEmail] = useState('');
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);

    const fetchEmergencyContact = async () => {
        try {
            const res = await api.get('/auth/emergency-contact');
            if (res.data) {
                setEmergencyEmail(res.data.emergency_contact_email || '');
            }
        } catch (err) {
            console.warn('Failed to fetch emergency contact:', err);
        }
    };

    useEffect(() => {
        fetchEmergencyContact();
    }, []);

    const emailsList = emergencyEmail
        .split(/[,;\n\r]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

    const handleRemoveEmail = (target: string) => {
        const remaining = emailsList.filter(e => e.toLowerCase() !== target.toLowerCase());
        setEmergencyEmail(remaining.join(', '));
    };

    const handleSaveEmergencyContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingContact(true);
        setSaveSuccess(false);
        setSaveError('');
        try {
            const res = await api.put('/auth/emergency-contact', {
                emergency_contact_email: emergencyEmail.trim() || null
            });
            setEmergencyEmail(res.data.emergency_contact_email || '');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            setSaveError(err?.response?.data?.detail || 'Failed to save emergency contact');
        } finally {
            setIsSavingContact(false);
        }
    };

    const handleTestEmergencyContact = async () => {
        setIsSendingTest(true);
        setTestStatus(null);
        setSaveError('');
        try {
            haptics.selection();
            const res = await api.post('/auth/emergency-contact/test');
            haptics.notification('success');
            setTestStatus({
                success: true,
                message: res.data?.message || 'Test contingency email dispatched successfully!'
            });
            setTimeout(() => setTestStatus(null), 8000);
        } catch (err: any) {
            haptics.notification('error');
            setTestStatus({
                success: false,
                message: err?.response?.data?.detail || err?.message || 'Failed to dispatch test email.'
            });
            setTimeout(() => setTestStatus(null), 8000);
        } finally {
            setIsSendingTest(false);
        }
    };


    // Biometric & Hardware Passkey Status
    const [biometricsStatus, setBiometricsStatus] = useState<{
        supported: boolean;
        platformAvailable: boolean;
        hasBiometrics: boolean;
        deviceType: string;
    } | null>(null);
    const [isEnrollingBiometrics, setIsEnrollingBiometrics] = useState(false);
    const [biometricsMsg, setBiometricsMsg] = useState('');
    const [biometricsErr, setBiometricsErr] = useState('');

    const refreshBiometrics = async () => {
        try {
            const status = await getBiometricsStatus();
            setBiometricsStatus(status);
        } catch (e) {
            console.warn('Failed to fetch biometric status', e);
        }
    };

    useEffect(() => {
        if (isProfileOpen) {
            refreshBiometrics();
        }
    }, [isProfileOpen]);

    const handleEnrollBiometrics = async () => {
        setIsEnrollingBiometrics(true);
        setBiometricsMsg('');
        setBiometricsErr('');
        try {
            haptics.selection();
            const res = await registerBiometricCredential();
            haptics.notification('success');
            setBiometricsMsg(res.message || 'Biometric passkey enrolled!');
            await refreshBiometrics();
            setTimeout(() => setBiometricsMsg(''), 4000);
        } catch (err: any) {
            haptics.notification('error');
            if (!err?.message?.includes('cancel') && !err?.message?.includes('abort')) {
                setBiometricsErr(err?.message || 'Biometric enrollment failed');
                setTimeout(() => setBiometricsErr(''), 4000);
            }
        } finally {
            setIsEnrollingBiometrics(false);
        }
    };

    const handleBackup = async () => {
        setIsExporting(true);
        try {
            const response = await api.get('/export/csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `grip_backup_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Backup failed", error);
            alert("Backup failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportStatement = async () => {
        setIsExportingStatement(true);
        try {
            const response = await api.get('/export/portfolio-statement', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `Grip_Portfolio_Statement_${dateStr}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Statement export failed", error);
            alert("Failed to export portfolio statement. Please try again.");
        } finally {
            setIsExportingStatement(false);
        }
    };

    const handleFeatureClick = (card: any) => {
        if (card.action === 'OPEN_CATEGORIES') {
            navigate('/settings/categories');
        } else if (card.action === 'OPEN_EXPORTS') {
            setIsExportOpen(true);
        } else if (card.path) {
            navigate(card.path);
        }
    };

    return (
        <div className="min-h-screen text-primary flex flex-col pb-20 overflow-x-hidden">
            {/* Minimal Header */}
            <header className="px-4 py-6 flex items-center justify-between relative">
                <div
                    onClick={() => {
                        fetchEmergencyContact();
                        setIsProfileOpen(true);
                    }}
                    className="flex items-center gap-3 cursor-pointer group select-none active:scale-[0.98] transition-transform"
                >
                    <div className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center p-1 shadow-sm group-hover:border-primary/40 transition-colors">
                        <div className="w-full h-full rounded-full bg-surface-hover flex items-center justify-center">
                            <CircleUserRound size={20} className="text-text-muted group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-base font-black tracking-tight uppercase text-primary">{userName}</h2>
                        <p className="text-[9px] text-text-muted tracking-[2px] uppercase font-bold mt-0.5 group-hover:text-primary transition-colors">Profile & Settings →</p>
                    </div>
                </div>

                {/* Settings Gear Button */}
                <button
                    onClick={() => {
                        fetchEmergencyContact();
                        setIsProfileOpen(true);
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 border bg-surface-subtle text-secondary border-border-subtle hover:bg-surface-hover hover:text-primary shadow-sm"
                    aria-label="Profile and Settings"
                >
                    <Settings size={18} />
                </button>
            </header>

            <div className="px-3 space-y-8 animate-enter pb-10">
                {/* Feature Grid - Compact */}
                <div className="grid grid-cols-2 gap-2">
                    {FEATURE_CARDS.map((card) => {
                        const isCardLoading = (card.id === 'backup' && isExporting) || (card.id === 'statement' && isExportingStatement);
                        const isActionTarget = card.id === 'transactions' || card.id === 'pending';
                        return (
                            <motion.button
                                key={card.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleFeatureClick(card)}
                                disabled={isCardLoading}
                                className={`flex items-center gap-2.5 p-3 rounded-[1.2rem] bg-surface-subtle border border-border-subtle hover:bg-surface-hover hover:border-accent-border/40 transition-all text-left group relative ${isCardLoading ? 'opacity-50' : ''}`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-surface-pill text-primary border border-border-subtle group-hover:bg-surface-hover group-hover:text-primary transition-colors flex items-center justify-center shadow-xs group-hover:scale-105 shrink-0 relative">
                                    {isCardLoading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                    ) : (
                                        <card.icon size={15} className="text-primary" />
                                    )}
                                    {isActionTarget && pendingCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md shadow-rose-500/35 border border-surface leading-none tracking-tight animate-pulse">
                                            {pendingCount > 99 ? '99+' : pendingCount}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-secondary group-hover:text-primary tracking-wide uppercase whitespace-nowrap transition-colors">
                                    {isCardLoading ? 'Exporting...' : card.label}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Smart Views Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[9px] font-black text-text-muted uppercase tracking-[3px]">
                            Time Horizons & Activity
                        </h3>
                        <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest">
                            Inflow / Outflow
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        {/* Day Card */}
                        <div
                            onClick={() => navigate('/transactions?view=day')}
                            className="p-3.5 bg-surface-subtle rounded-2xl border border-border-subtle hover:bg-surface-hover transition-all cursor-pointer group active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-surface-pill text-primary flex items-center justify-center">
                                        <Smartphone size={14} />
                                    </div>
                                    <span className="text-[11px] font-black text-primary uppercase tracking-wider">Today</span>
                                </div>
                                <ArrowUpRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                                <div>
                                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-wider">In</p>
                                    <p className="text-[11px] font-black text-emerald-400 tracking-tight">
                                        +{formatCompact(daySummary?.total_income || 0)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-wider">Out</p>
                                    <p className="text-[11px] font-black text-rose-400 tracking-tight">
                                        -{formatCompact(daySummary?.cash_outflow ?? daySummary?.total_expense ?? 0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Month / Analytics Card */}
                        <div
                            onClick={() => navigate('/analytics')}
                            className="p-3.5 bg-surface-subtle rounded-2xl border border-border-subtle hover:bg-surface-hover transition-all cursor-pointer group active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-surface-pill text-primary flex items-center justify-center">
                                        <Calendar size={14} />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-black text-primary uppercase tracking-wider block">Monthly Flow</span>
                                        <span className="text-[8px] text-text-muted font-bold uppercase tracking-wider block">Analytics View</span>
                                    </div>
                                </div>
                                <ArrowUpRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                                <div>
                                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-wider">In</p>
                                    <p className="text-[11px] font-black text-emerald-400 tracking-tight">
                                        +{formatCompact(monthSummary?.total_income || 0)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-wider">Out</p>
                                    <p className="text-[11px] font-black text-rose-400 tracking-tight">
                                        -{formatCompact(monthSummary?.cash_outflow ?? monthSummary?.total_expense ?? 0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Year Card */}
                        <div
                            onClick={() => navigate('/transactions?view=year')}
                            className="p-3.5 bg-surface-subtle rounded-2xl border border-border-subtle hover:bg-surface-hover transition-all cursor-pointer group active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-surface-pill text-primary flex items-center justify-center">
                                        <Layers size={14} />
                                    </div>
                                    <span className="text-[11px] font-black text-primary uppercase tracking-wider">This Year</span>
                                </div>
                                <ArrowUpRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                                <div>
                                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-wider">In</p>
                                    <p className="text-[11px] font-black text-emerald-400 tracking-tight">
                                        +{formatCompact(yearSummary?.total_income || 0)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-wider">Out</p>
                                    <p className="text-[11px] font-black text-rose-400 tracking-tight">
                                        -{formatCompact(yearSummary?.cash_outflow ?? yearSummary?.total_expense ?? 0)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Filter Card */}
                        <div
                            onClick={() => navigate('/transactions?view=custom')}
                            className="p-3.5 bg-surface-subtle rounded-2xl border border-border-subtle hover:bg-surface-hover transition-all cursor-pointer group active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-surface-pill text-primary flex items-center justify-center">
                                        <Filter size={14} />
                                    </div>
                                    <span className="text-[11px] font-black text-primary uppercase tracking-wider">Discovery</span>
                                </div>
                                <ArrowUpRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                            </div>
                            <div className="pt-2 border-t border-border-subtle">
                                <p className="text-[8px] text-text-muted font-bold uppercase tracking-widest truncate">
                                    Custom Range & Scope
                                </p>
                                <p className="text-[10px] text-text-muted group-hover:text-primary font-bold uppercase tracking-tight mt-0.5 transition-colors">
                                    Filter & Search →
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <SystemIntelligence />
            </div>

            {/* Consolidated Export Data Drawer */}
            <Drawer
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                title="Export Data"
            >
                <div className="space-y-2.5 pb-6">
                    {/* Transaction CSV Row */}
                    <button
                        onClick={handleBackup}
                        disabled={isExporting}
                        className="w-full p-4 rounded-2xl bg-surface-subtle border border-border-subtle hover:bg-surface-hover active:scale-[0.99] transition-all flex items-center justify-between text-left group disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-surface-pill border border-border-subtle flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                                {isExporting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                ) : (
                                    <Receipt size={18} />
                                )}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-primary tracking-tight">Transaction History</h4>
                                <p className="text-xs text-text-muted mt-0.5">Raw spreadsheet backup (.csv)</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-surface-pill flex items-center justify-center text-text-muted group-hover:text-primary transition-colors shrink-0">
                            <Download size={14} />
                        </div>
                    </button>

                    {/* Portfolio Statement XLSX Row */}
                    <button
                        onClick={handleExportStatement}
                        disabled={isExportingStatement}
                        className="w-full p-4 rounded-2xl bg-surface-subtle border border-border-subtle hover:bg-surface-hover active:scale-[0.99] transition-all flex items-center justify-between text-left group disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-surface-pill border border-border-subtle text-primary flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                {isExportingStatement ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                ) : (
                                    <FileSpreadsheet size={18} className="text-primary" />
                                )}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-primary tracking-tight">Portfolio Statement</h4>
                                <p className="text-xs text-text-muted mt-0.5">Full net worth & holdings (.xlsx)</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-surface-pill flex items-center justify-center text-text-muted group-hover:text-primary transition-colors shrink-0">
                            <Download size={14} />
                        </div>
                    </button>
                </div>
            </Drawer>

            {/* Profile & Settings Drawer */}
            <Drawer
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                title="Profile & Settings"
            >
                <div className="space-y-6 pb-6">
                    {/* User Identity Header - Clean, No Active Badges */}
                    <div className="flex items-center gap-3.5 px-1">
                        <div className="w-12 h-12 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted shadow-sm shrink-0">
                            <CircleUserRound size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-base font-bold text-primary tracking-tight truncate">
                                {userName}
                            </h4>
                            <p className="text-xs text-text-muted truncate mt-0.5">{user?.email}</p>
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[2px] text-text-muted px-1">
                            Preferences
                        </label>
                        <button
                            onClick={toggleTheme}
                            className="w-full p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle hover:bg-surface-hover active:scale-[0.99] transition-all flex items-center justify-between text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-surface-pill text-primary flex items-center justify-center">
                                    {isDark ? <Moon size={15} /> : <Sun size={15} />}
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-primary block">
                                        Interface Theme
                                    </span>
                                    <span className="text-[10px] text-text-muted block mt-0.5">
                                        Currently using {isDark ? 'Dark' : 'Light'} theme
                                    </span>
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-text-muted group-hover:text-primary transition-colors">
                                Switch →
                            </span>
                        </button>
                    </div>

                    {/* Security & Biometrics */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[2px] text-text-muted px-1">
                            Security & Biometrics
                        </label>
                        <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-surface-pill text-primary border border-border-subtle flex items-center justify-center shrink-0">
                                        <Fingerprint size={16} className="text-primary" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-primary block">
                                            {getDeviceBiometricName()} Passkey
                                        </span>
                                        <span className="text-[11px] text-text-muted block mt-0.5 leading-relaxed">
                                            Fast 1-second sign-in for daily activity and instant authorization for Wealth Vault.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                                <div className="flex items-center gap-1.5">
                                    {biometricsStatus?.hasBiometrics ? (
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                                            <Check size={11} />
                                            <span>Active</span>
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-text-muted bg-surface-pill px-2 py-0.5 rounded-md border border-border-subtle">
                                            Not Enrolled
                                        </span>
                                    )}
                                </div>

                                {biometricsStatus?.platformAvailable ? (
                                    <Button
                                        type="button"
                                        onClick={handleEnrollBiometrics}
                                        disabled={isEnrollingBiometrics}
                                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider h-auto shrink-0"
                                    >
                                        {isEnrollingBiometrics ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : biometricsStatus?.hasBiometrics ? (
                                            'Re-register'
                                        ) : (
                                            `Enroll ${getDeviceBiometricName()}`
                                        )}
                                    </Button>
                                ) : (
                                    <span className="text-[10px] text-text-muted italic">
                                        Unsupported on this device
                                    </span>
                                )}
                            </div>

                            {biometricsMsg && (
                                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold px-1">
                                    <Check size={13} />
                                    <span>{biometricsMsg}</span>
                                </div>
                            )}

                            {biometricsErr && (
                                <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-semibold px-1">
                                    <AlertCircle size={13} />
                                    <span>{biometricsErr}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Nominee & Inactivity Contingency */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-bold uppercase tracking-[2px] text-text-muted">
                                Emergency Nominees
                            </label>
                            {emailsList.length > 0 && (
                                <span className="text-[9px] font-bold text-accent-text bg-accent-subtle px-2 py-0.5 rounded-full border border-accent-border">
                                    {emailsList.length} {emailsList.length === 1 ? 'Contact' : 'Contacts'}
                                </span>
                            )}
                        </div>

                        <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-surface-pill text-primary border border-border-subtle flex items-center justify-center shrink-0">
                                    <ShieldCheck size={16} className="text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-xs font-bold text-primary">
                                        7-Day Inactivity Contingency
                                    </h5>
                                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                                        If you don't access Grip for 7 days, your confidential portfolio statement (<span className="font-mono text-[10px] text-primary">.xlsx</span>) will be automatically emailed to all listed nominees.
                                    </p>
                                </div>
                            </div>

                            {/* Nominee Chips List */}
                            {emailsList.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {emailsList.map((em, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-card border border-border-subtle text-[11px] font-mono text-primary shadow-xs"
                                        >
                                            <Mail size={11} className="text-text-muted" />
                                            <span>{em}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEmail(em)}
                                                className="text-text-muted hover:text-rose-400 p-0.5 rounded-full transition-colors"
                                                title={`Remove ${em}`}
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Email Input & Action */}
                            <form onSubmit={handleSaveEmergencyContact} className="space-y-2.5 pt-1">
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Add emails, separated by commas..."
                                        value={emergencyEmail}
                                        onChange={(e) => setEmergencyEmail(e.target.value)}
                                        className="flex-1 text-xs"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={isSavingContact}
                                        className="px-4 text-xs font-bold shrink-0"
                                    >
                                        {isSavingContact ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>

                                {saveSuccess && (
                                    <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold px-1">
                                        <Check size={13} />
                                        <span>Nominee contact(s) updated successfully</span>
                                    </div>
                                )}

                                {saveError && (
                                    <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-semibold px-1">
                                        <AlertCircle size={13} />
                                        <span>{saveError}</span>
                                    </div>
                                )}

                                {testStatus && (
                                    <div className={`flex items-start gap-1.5 text-[11px] font-semibold px-1 py-1 rounded-lg ${testStatus.success ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>
                                        {testStatus.success ? <Check size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                                        <span className="leading-tight">{testStatus.message}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-border-subtle gap-2">
                                    <span className="text-[10px] text-text-muted shrink-0">
                                        Leave empty to disable.
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={handleTestEmergencyContact}
                                            disabled={isSendingTest || emailsList.length === 0}
                                            className="text-[11px] font-semibold text-accent-text hover:underline flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            title={emailsList.length === 0 ? "Save at least one email first" : "Send a sample contingency portfolio email to test delivery"}
                                        >
                                            {isSendingTest ? (
                                                <>
                                                    <Loader2 size={12} className="animate-spin text-accent-text" />
                                                    <span>Testing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={12} />
                                                    <span>Test Email</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportStatement}
                                            disabled={isExportingStatement}
                                            className="text-[11px] font-semibold text-text-muted hover:text-primary flex items-center gap-1 transition-colors"
                                        >
                                            <FileSpreadsheet size={12} />
                                            <span>{isExportingStatement ? 'Downloading...' : 'Preview .xlsx'}</span>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Account Actions */}
                    <div className="pt-2">
                        <button
                            onClick={() => {
                                setIsProfileOpen(false);
                                logout();
                            }}
                            className="w-full p-3.5 rounded-2xl bg-surface-subtle border border-border-subtle hover:bg-rose-500/10 hover:border-rose-500/20 text-rose-400 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-xs font-semibold"
                        >
                            <LogOut size={15} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </Drawer>
        </div>
    );
};

export default More;
