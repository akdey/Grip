import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    RefreshCw,
    Brain,
    Cpu,
    Activity
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { api } from '../lib/api';
import { useSyncTrends } from '../features/sync/hooks';
import { SyncTrendChart } from '../components/sync/SyncTrendChart';
import { Card } from '../components/ui/Card';

const FEATURE_CARDS = [
    { id: 'sync', label: 'Gmail Sync', icon: Mail, path: '/sync', color: 'text-green-400', bgColor: 'bg-green-500/10' },
    { id: 'pending', label: 'Action Center', icon: Sparkles, path: '/transactions?view=pending', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { id: 'transactions', label: 'History', icon: Receipt, path: '/transactions', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { id: 'scheduled', label: 'Scheduled', icon: CalendarClock, path: '/bills', color: 'text-teal-400', bgColor: 'bg-teal-500/10' },
    { id: 'goals', label: 'Goals', icon: Wallet, path: '/goals', color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
    { id: 'categories', label: 'Categories', icon: LayoutGrid, action: 'OPEN_CATEGORIES', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    { id: 'tags', label: 'Hash Tags', icon: Hash, path: '/tags', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
    { id: 'backup', label: 'Backup Data', icon: Download, action: 'BACKUP_DATA', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    { id: 'vault', label: 'Vault', icon: Target, path: '/credit-cards', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    { id: 'sureties', label: 'Sureties', icon: RefreshCw, path: '/sureties', color: 'text-rose-400', bgColor: 'bg-rose-500/10' }, // Changed color to rose to differentiate
];

const SystemIntelligence: React.FC = () => {
    const { data: trendsData, isLoading } = useSyncTrends(30);

    if (isLoading || !trendsData?.trends || trendsData.trends.length === 0) return null;

    const totalTxns = trendsData.trends.reduce((acc, curr) => acc + (curr.manual || 0) + (curr.system || 0), 0);
    const systemTxns = trendsData.trends.reduce((acc, curr) => acc + (curr.system || 0), 0);
    const efficiency = totalTxns > 0 ? ((systemTxns / totalTxns) * 100).toFixed(0) : 0;

    return (
        <Card className="px-6 py-8 bg-[#0a0a0a] border-white/[0.05] rounded-[2.5rem] relative overflow-hidden group mb-8">
            <div className="absolute right-0 top-0 p-10 opacity-[0.02] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                <Cpu size={160} />
            </div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center animate-pulse">
                        <Brain size={22} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[4px] text-indigo-400">System Autopilot</h3>
                        <h4 className="text-xl font-black text-white tracking-tighter">Decision Efficiency</h4>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-[2px] text-gray-500 mb-1">Success Rate</p>
                    <p className="text-2xl font-black text-white">{efficiency}%</p>
                </div>
            </div>

            <SyncTrendChart data={trendsData.trends} />

            <div className="grid grid-cols-2 gap-8 mt-10 pt-8 border-t border-white/[0.05]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-gray-400">
                        <Activity size={14} />
                    </div>
                    <div>
                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Processed</p>
                        <p className="text-lg font-black text-white">{totalTxns}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 justify-end text-right">
                    <div>
                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">AI Handled</p>
                        <p className="text-lg font-black text-indigo-400">{systemTxns}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/5 flex items-center justify-center text-indigo-400">
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
    const [isExporting, setIsExporting] = useState(false);

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
        <div className="min-h-screen text-white flex flex-col pb-20 overflow-x-hidden">
            {/* Minimal Header */}
            <header className="px-4 py-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center p-1 shadow-2xl">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                            <CircleUserRound size={20} className="text-gray-500" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-base font-black tracking-tight uppercase">{userName}</h2>
                        <p className="text-[8px] text-gray-600 tracking-[3px] uppercase font-bold mt-0.5">Intelligence Hub</p>
                    </div>
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
                            className={`flex items-center gap-2.5 p-3 rounded-[1.2rem] bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all text-left group ${card.id === 'backup' && isExporting ? 'opacity-50' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-lg ${card.bgColor} ${card.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0`}>
                                {card.id === 'backup' && isExporting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                ) : (
                                    <card.icon size={15} />
                                )}
                            </div>
                            <span className="text-[11px] font-bold text-gray-300 tracking-wide uppercase whitespace-nowrap">
                                {card.id === 'backup' && isExporting ? 'Exporting...' : card.label}
                            </span>
                        </motion.button>
                    ))}
                </div>

                {/* Smart Views Section - Compact List */}
                <div className="space-y-3">
                    <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-[3px] ml-1 opacity-80">Views</h3>
                    <div className="grid grid-cols-3 gap-2.5">
                        <button
                            onClick={() => navigate('/transactions?view=day')}
                            className="flex flex-col items-center justify-center p-3.5 bg-white/[0.03] rounded-[1.4rem] border border-white/[0.05] active:scale-[0.98] transition-all gap-2"
                        >
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400/80 flex items-center justify-center">
                                <Smartphone size={16} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Today</span>
                        </button>

                        <button
                            onClick={() => navigate('/transactions?view=month')}
                            className="flex flex-col items-center justify-center p-3.5 bg-white/[0.03] rounded-[1.4rem] border border-white/[0.05] active:scale-[0.98] transition-all gap-2"
                        >
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400/80 flex items-center justify-center">
                                <Calendar size={16} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Month</span>
                        </button>

                        <button
                            onClick={() => navigate('/transactions?view=custom')}
                            className="flex flex-col items-center justify-center p-3.5 bg-white/[0.03] rounded-[1.4rem] border border-white/[0.05] active:scale-[0.98] transition-all gap-2"
                        >
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400/80 flex items-center justify-center">
                                <Filter size={16} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter</span>
                        </button>
                    </div>
                </div>

                <SystemIntelligence />
            </div>
        </div>
    );
};

export default More;
