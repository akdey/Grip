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
    LogOut
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { api } from '../lib/api';
import { useSyncTrends } from '../features/sync/hooks';
import { useMonthlySummary } from '../features/dashboard/hooks';
import { SyncTrendChart } from '../components/sync/SyncTrendChart';
import { Card } from '../components/ui/Card';
import { useTheme } from '../lib/theme';

const FEATURE_CARDS = [
    { id: 'sync', label: 'Gmail Sync', icon: Mail, path: '/sync', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'pending', label: 'Action Center', icon: Sparkles, path: '/transactions?view=pending', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'transactions', label: 'History', icon: Receipt, path: '/transactions', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'sureties', label: 'Sureties', icon: CalendarClock, path: '/sureties', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'goals', label: 'Goals', icon: Wallet, path: '/goals', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'categories', label: 'Categories', icon: LayoutGrid, action: 'OPEN_CATEGORIES', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'tags', label: 'Hash Tags', icon: Hash, path: '/tags', color: 'text-primary', bgColor: 'bg-surface-subtle' },
    { id: 'backup', label: 'Backup Data', icon: Download, action: 'BACKUP_DATA', color: 'text-primary', bgColor: 'bg-surface-subtle' },
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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                !(event.target as HTMLElement).closest('button[aria-label="Settings"]')
            ) {
                setIsSettingsOpen(false);
            }
        };

        if (isSettingsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSettingsOpen]);

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

    const handleFeatureClick = (card: any) => {
        if (card.action === 'OPEN_CATEGORIES') {
            navigate('/settings/categories');
        } else if (card.action === 'BACKUP_DATA') {
            handleBackup();
        } else if (card.path) {
            navigate(card.path);
        }
    };

    return (
        <div className="min-h-screen text-primary flex flex-col pb-20 overflow-x-hidden">
            {/* Minimal Header */}
            <header className="px-4 py-6 flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center p-1 shadow-sm">
                        <div className="w-full h-full rounded-full bg-surface-hover flex items-center justify-center">
                            <CircleUserRound size={20} className="text-text-muted" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-base font-black tracking-tight uppercase text-primary">{userName}</h2>
                        <p className="text-[8px] text-text-muted tracking-[3px] uppercase font-bold mt-0.5">Intelligence Hub</p>
                    </div>
                </div>

                {/* Settings Gear & Popover */}
                <div className="relative">
                    <button
                        onClick={() => setIsSettingsOpen((prev) => !prev)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
                            isSettingsOpen
                                ? 'bg-accent-subtle text-accent-text border-accent-border shadow-md'
                                : 'bg-surface-subtle text-secondary border-border-subtle hover:bg-surface-hover hover:text-primary shadow-sm'
                        }`}
                        aria-label="Settings"
                        aria-expanded={isSettingsOpen}
                    >
                        <Settings size={18} className={`transition-transform duration-300 ${isSettingsOpen ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isSettingsOpen && (
                            <motion.div
                                ref={popoverRef}
                                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="absolute right-0 top-11 z-50 w-64 p-3 rounded-2xl glass-card bg-surface/95 backdrop-blur-2xl border border-border-default shadow-2xl space-y-3"
                            >
                                {/* Theme Selector */}
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[2px] text-text-muted px-2 mb-2">
                                        Appearance
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-pill border border-border-subtle">
                                        <button
                                            onClick={() => {
                                                if (!isDark) toggleTheme();
                                            }}
                                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                                isDark
                                                    ? 'bg-surface text-primary shadow-sm border border-border-subtle'
                                                    : 'text-text-muted hover:text-primary'
                                            }`}
                                        >
                                            <Moon size={14} className={isDark ? 'text-cyan-400' : ''} />
                                            <span>Dark</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (isDark) toggleTheme();
                                            }}
                                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                                !isDark
                                                    ? 'bg-surface text-primary shadow-sm border border-border-subtle'
                                                    : 'text-text-muted hover:text-primary'
                                            }`}
                                        >
                                            <Sun size={14} className={!isDark ? 'text-amber-500' : ''} />
                                            <span>Light</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="h-[1px] bg-border-subtle" />

                                {/* Logout Option */}
                                <button
                                    onClick={() => {
                                        setIsSettingsOpen(false);
                                        logout();
                                        navigate('/login');
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors text-xs font-bold group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <LogOut size={16} className="text-rose-400 group-hover:scale-105 transition-transform" />
                                        <span>Sign Out</span>
                                    </div>
                                    <span className="text-[10px] text-rose-400/60 uppercase tracking-wider font-semibold">Exit</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            <div className="px-3 space-y-8 animate-enter pb-10">
                {/* Feature Grid - Compact */}
                <div className="grid grid-cols-2 gap-2">
                    {FEATURE_CARDS.map((card) => (
                        <motion.button
                            key={card.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleFeatureClick(card)}
                            disabled={card.id === 'backup' && isExporting}
                            className={`flex items-center gap-2.5 p-3 rounded-[1.2rem] bg-surface-subtle border border-border-subtle hover:bg-surface-hover hover:border-accent-border/40 transition-all text-left group ${card.id === 'backup' && isExporting ? 'opacity-50' : ''}`}
                        >
                            <div className="w-8 h-8 rounded-lg bg-surface-pill text-primary group-hover:bg-accent-subtle group-hover:text-accent-text group-hover:border group-hover:border-accent-border transition-colors flex items-center justify-center shadow-sm group-hover:scale-105 shrink-0">
                                {card.id === 'backup' && isExporting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                ) : (
                                    <card.icon size={15} />
                                )}
                            </div>
                            <span className="text-[11px] font-bold text-secondary group-hover:text-primary tracking-wide uppercase whitespace-nowrap transition-colors">
                                {card.id === 'backup' && isExporting ? 'Exporting...' : card.label}
                            </span>
                        </motion.button>
                    ))}
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

                        {/* Month Card */}
                        <div
                            onClick={() => navigate('/transactions?view=month')}
                            className="p-3.5 bg-surface-subtle rounded-2xl border border-border-subtle hover:bg-surface-hover transition-all cursor-pointer group active:scale-[0.98]"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-surface-pill text-primary flex items-center justify-center">
                                        <Calendar size={14} />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-black text-primary uppercase tracking-wider block">Calendar</span>
                                        <span className="text-[8px] text-text-muted font-bold uppercase tracking-wider block">This Month</span>
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
        </div>
    );
};

export default More;
