import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Receipt,
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
    Lock
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { api } from '../lib/api';
import { useSyncTrends } from '../features/sync/hooks';
import { useMonthlySummary } from '../features/dashboard/hooks';
import { SyncTrendChart } from '../components/sync/SyncTrendChart';
import { Card } from '../components/ui/Card';
import { Drawer } from '../components/ui/Drawer';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useTheme } from '../lib/theme';

const FEATURE_CARDS = [
    { id: 'sync', label: 'Gmail Sync', icon: Mail, path: '/sync', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'pending', label: 'Action Center', icon: Sparkles, path: '/transactions?view=pending', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'transactions', label: 'History', icon: Receipt, path: '/transactions', color: 'text-primary', bgColor: 'bg-surface-subtle' },
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
                    <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent-text border border-accent-border flex items-center justify-center">
                        <Brain size={22} />
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
                    <div className="w-8 h-8 rounded-lg bg-surface-subtle flex items-center justify-center text-text-muted">
                        <Activity size={14} />
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
                    <div className="w-8 h-8 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center text-accent-text">
                        <Sparkles size={14} />
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

    const formatCompact = (val: number) => {
        const abs = Math.abs(val || 0);
        if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
        if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}k`;
        return `₹${Math.round(abs)}`;
    };

    const userName = user?.email?.split('@')[0] || 'Infiltrator';

    // Contingency & Emergency Contact state
    const [emergencyEmail, setEmergencyEmail] = useState('');
    const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');

    const fetchEmergencyContact = async () => {
        try {
            const res = await api.get('/auth/emergency-contact');
            if (res.data) {
                setEmergencyEmail(res.data.emergency_contact_email || '');
                setLastActiveAt(res.data.last_active_at || null);
            }
        } catch (err) {
            console.warn('Failed to fetch emergency contact:', err);
        }
    };

    useEffect(() => {
        fetchEmergencyContact();
    }, []);

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
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-base font-black tracking-tight uppercase text-primary">{userName}</h2>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <p className="text-[8px] text-text-muted tracking-[3px] uppercase font-bold mt-0.5 group-hover:text-primary transition-colors">Profile & Settings →</p>
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
                        return (
                            <motion.button
                                key={card.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleFeatureClick(card)}
                                disabled={isCardLoading}
                                className={`flex items-center gap-2.5 p-3 rounded-[1.2rem] bg-surface-subtle border border-border-subtle hover:bg-surface-hover hover:border-accent-border/40 transition-all text-left group ${isCardLoading ? 'opacity-50' : ''}`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-surface-pill text-primary group-hover:bg-accent-subtle group-hover:text-accent-text group-hover:border group-hover:border-accent-border transition-colors flex items-center justify-center shadow-sm group-hover:scale-105 shrink-0">
                                    {isCardLoading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                    ) : (
                                        <card.icon size={15} className={card.color || 'text-primary'} />
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

            {/* Asset Contingency Bottom Sheet */}
            <Drawer
                isOpen={isContingencyOpen}
                onClose={() => setIsContingencyOpen(false)}
                title="Asset Contingency"
            >
                <div className="p-5 space-y-6">
                    {/* Hero Rule Card */}
                    <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent-border flex items-center justify-center shrink-0 text-accent-text shadow-sm">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-primary tracking-tight">7-Day Inactivity Contingency</h4>
                            <p className="text-xs text-text-muted mt-1 leading-relaxed">
                                If you do not access Grip for <span className="text-primary font-bold">7 days</span>, Grip's automated scheduler will securely generate your comprehensive portfolio statement spreadsheet (<span className="text-primary font-mono text-[11px]">.xlsx</span>) and dispatch it to your designated emergency contact.
                            </p>
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-pill border border-border-subtle text-xs">
                        <div className="flex items-center gap-2 text-text-muted">
                            <Clock size={14} className="text-emerald-400" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Your Grip Status</span>
                        </div>
                        <span className="font-bold text-emerald-400">
                            {lastActiveAt ? `Active (${new Date(lastActiveAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})` : 'Active Now'}
                        </span>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleSaveEmergencyContact} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[2px] text-text-muted px-1 flex items-center justify-between">
                                <span>Designated Emergency / Nominee Email</span>
                                <span className="text-[9px] text-text-muted/60 font-semibold lowercase">receives .xlsx schedule</span>
                            </label>
                            <Input
                                type="email"
                                placeholder="nominee@example.com"
                                value={emergencyEmail}
                                onChange={(e) => setEmergencyEmail(e.target.value)}
                                className="w-full text-sm font-medium"
                            />
                            <p className="text-[10px] text-text-muted px-1 mt-1 leading-normal">
                                Enter the email of your trusted contact or nominee. Leave empty to disable automated dispatch.
                            </p>
                        </div>

                        {saveSuccess && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                                <Check size={14} />
                                <span>Emergency contact saved securely</span>
                            </div>
                        )}

                        {saveError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                                <AlertCircle size={14} />
                                <span>{saveError}</span>
                            </div>
                        )}

                        <div className="flex gap-2.5 pt-2">
                            <Button
                                type="submit"
                                disabled={isSavingContact}
                                className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-primary text-background hover:opacity-90"
                            >
                                {isSavingContact ? 'Saving...' : 'Save Contingency Rule'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleExportStatement}
                                disabled={isExportingStatement}
                                className="py-3 px-4 text-xs font-bold border-border-subtle text-text-muted hover:text-primary flex items-center gap-1.5"
                                title="Download the spreadsheet that will be sent"
                            >
                                <FileSpreadsheet size={15} />
                                <span className="hidden sm:inline">Preview XLS</span>
                            </Button>
                        </div>
                    </form>
                </div>
            </Drawer>
        </div>
    );
};

export default More;
