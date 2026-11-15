import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FlaskConical,
    CreditCard,
    ShieldAlert,
    Target,
    Hourglass,
    LineChart,
    Sparkles,
    ArrowUpRight,
    Beaker,
    Sliders
} from 'lucide-react';
import { GraceOptimizerView } from '../features/credit-cards/GraceOptimizerView';
import { GripRadar } from '../features/anomaly/components/GripRadar';
import Goals from './Goals';
import { RunwaySimulatorView } from '../features/dashboard/components/RunwaySimulatorView';
import { formatCurrency } from '../lib/formatters';
import { haptics } from '../lib/haptics';

type LabTab = 'cards' | 'anomaly' | 'goals' | 'runway' | 'wealth';

interface TabItem {
    id: LabTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: string;
    description: string;
}

const LAB_TABS: TabItem[] = [
    {
        id: 'cards',
        label: 'Card Float',
        icon: CreditCard,
        badge: 'NEW',
        description: 'Grace period & 0% float optimizer'
    },
    {
        id: 'anomaly',
        label: 'Anomaly Radar',
        icon: ShieldAlert,
        description: 'Spend velocity & drift detection'
    },
    {
        id: 'goals',
        label: 'Goal Pacing',
        icon: Target,
        description: 'Dual-bucket capital pacing'
    },
    {
        id: 'runway',
        label: 'Runway Stress',
        icon: Hourglass,
        badge: 'LAB',
        description: 'Zero-income solvency simulator'
    },
    {
        id: 'wealth',
        label: 'Wealth Lab',
        icon: LineChart,
        description: 'Monte Carlo simulations & forecasts'
    }
];

const Lab: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const activeTabParam = searchParams.get('tab') as LabTab;
    const activeTab: LabTab = LAB_TABS.some(t => t.id === activeTabParam) ? activeTabParam : 'cards';

    const handleTabChange = (tabId: LabTab) => {
        haptics.selection();
        setSearchParams({ tab: tabId }, { replace: true });
    };

    return (
        <div className="min-h-screen text-primary pb-28">
            {/* Header / Institutional Overline */}
            <header className="px-4 py-6 border-b border-border-subtle sticky top-0 bg-page/85 backdrop-blur-3xl z-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-accent-subtle flex items-center justify-center border border-accent-border text-accent-text shadow-xs">
                            <FlaskConical size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black uppercase tracking-tight text-primary heading-apple">
                                    Experimental Lab
                                </h1>
                                <span className="px-2 py-0.5 rounded-full bg-accent text-accent-text text-[9px] font-black uppercase tracking-wider">
                                    BETA
                                </span>
                            </div>
                            <p className="text-[9px] text-text-muted uppercase tracking-widest font-bold">
                                Advanced Financial Engines & Research
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab Pill Selector */}
                <div className="mt-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {LAB_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all select-none active:scale-95 ${
                                    isActive
                                        ? 'bg-accent text-accent-text shadow-xs'
                                        : 'bg-surface-subtle text-text-muted hover:text-primary hover:bg-surface-hover border border-border-subtle'
                                }`}
                            >
                                <Icon size={14} className={isActive ? 'text-accent-text' : 'text-text-muted'} />
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                                        isActive
                                            ? 'bg-page/20 text-accent-text'
                                            : 'bg-accent-subtle text-accent-text'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Tab Contents */}
            <main className="px-4 py-6 max-w-5xl mx-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'cards' && (
                        <motion.div
                            key="cards"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                        >
                            <GraceOptimizerView />
                        </motion.div>
                    )}

                    {activeTab === 'anomaly' && (
                        <motion.div
                            key="anomaly"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-4"
                        >
                            <div className="p-4 bg-surface rounded-2xl border border-border-subtle flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center border border-accent-border text-accent-text shrink-0">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-tight text-primary">Anomaly Radar</h2>
                                        <p className="text-[10px] text-text-muted font-bold">Autonomous Outflow & Drift Surveillance</p>
                                    </div>
                                </div>
                            </div>
                            <GripRadar formatCurrency={formatCurrency} />
                        </motion.div>
                    )}

                    {activeTab === 'goals' && (
                        <motion.div
                            key="goals"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Goals embedded />
                        </motion.div>
                    )}

                    {activeTab === 'runway' && (
                        <motion.div
                            key="runway"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                        >
                            <RunwaySimulatorView />
                        </motion.div>
                    )}

                    {activeTab === 'wealth' && (
                        <motion.div
                            key="wealth"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="space-y-6"
                        >
                            <div className="p-6 bg-surface rounded-3xl border border-border-subtle space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-accent-subtle flex items-center justify-center border border-accent-border text-accent-text">
                                        <LineChart size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-primary">Wealth Lab Engine</h3>
                                        <p className="text-xs text-text-muted">
                                            Interactive Monte Carlo forecasting, SIP yield curves, and asset allocation stress simulations.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div className="p-4 bg-surface-subtle rounded-2xl border border-border-subtle space-y-1">
                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Multi-Year Forecasts</p>
                                        <p className="text-xs text-primary font-bold">10 to 30 year portfolio growth bounds</p>
                                    </div>
                                    <div className="p-4 bg-surface-subtle rounded-2xl border border-border-subtle space-y-1">
                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Yield Optimization</p>
                                        <p className="text-xs text-primary font-bold">Historical timing windows for maximum compounding</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={() => {
                                            haptics.impact();
                                            navigate('/wealth/lab');
                                        }}
                                        className="w-full py-3.5 rounded-2xl bg-accent text-accent-text font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition-all shadow-sm"
                                    >
                                        <span>Launch Full Wealth Lab</span>
                                        <ArrowUpRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Lab;
