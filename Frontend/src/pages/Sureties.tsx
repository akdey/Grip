import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSureties, useCreateExclusion } from '../features/bills/hooks';
import { Loader } from '../components/ui/Loader';
import { ArrowLeft, Ban, CalendarX, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const Sureties: React.FC = () => {
    const navigate = useNavigate();
    const { data: sureties, isLoading } = useSureties();
    const createExclusion = useCreateExclusion();
    const [actionLoading, setActionLoading] = useState<{ id: string, action: 'PAID' | 'SKIP' | 'STOP' } | null>(null);

    const [activeTab, setActiveTab] = useState<'CURRENT' | 'UPCOMING'>('CURRENT');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);

    const currentMonthSureties = (sureties || []).filter(s => {
        const d = new Date(s.due_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const upcomingMonthSureties = (sureties || []).filter(s => {
        const d = new Date(s.due_date);
        return d.getFullYear() > currentYear || (d.getFullYear() === currentYear && d.getMonth() > currentMonth);
    });

    const displayedSureties = activeTab === 'CURRENT' ? currentMonthSureties : upcomingMonthSureties;
    const currentTotal = currentMonthSureties.reduce((sum, s) => sum + Math.abs(s.amount || 0), 0);
    const upcomingTotal = upcomingMonthSureties.reduce((sum, s) => sum + Math.abs(s.amount || 0), 0);

    const handleSkip = (suretyId: string, sourceId: string) => {
        if (!confirm('Skip this surety for this month?')) return;
        setActionLoading({ id: suretyId, action: 'SKIP' });
        createExclusion.mutate({
            source_transaction_id: sourceId,
            exclusion_type: 'SKIP'
        }, {
            onSettled: () => setActionLoading(null)
        });
    };

    const handleMarkPaid = (suretyId: string, sourceId: string) => {
        if (!confirm('Mark this surety as paid manually? This will stop it from showing as overdue.')) return;
        setActionLoading({ id: suretyId, action: 'PAID' });
        createExclusion.mutate({
            source_transaction_id: sourceId,
            exclusion_type: 'MANUAL_PAID'
        }, {
            onSettled: () => setActionLoading(null)
        });
    };

    const handleTerminate = (suretyId: string, merchant: string, subCategory: string) => {
        // Clean merchant name if it has suffix
        const cleanMerchant = merchant.replace(' (Auto-detected)', '').trim();
        if (!confirm(`Permanently stop identifying obligations for ${cleanMerchant} (${subCategory})?`)) return;
        setActionLoading({ id: suretyId, action: 'STOP' });
        createExclusion.mutate({
            merchant_pattern: cleanMerchant,
            subcategory_pattern: subCategory,
            exclusion_type: 'PERMANENT'
        }, {
            onSettled: () => setActionLoading(null)
        });
    };

    if (isLoading) return <Loader fullPage />;

    return (
        <div className="min-h-screen text-primary p-6 pb-24 animate-in fade-in duration-500">
            <header className="flex items-center gap-4 mb-6 sticky top-0 bg-page/80 backdrop-blur-xl py-4 z-10 border-b border-border-subtle -mx-6 px-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-surface-subtle hover:bg-surface-hover active:scale-95 transition-all text-text-muted hover:text-primary border border-border-subtle"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-primary heading-apple">Manage Sureties</h1>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Auto-detected Obligations</p>
                </div>
            </header>

            {/* Month Filter Selector */}
            <div className="grid grid-cols-2 p-1 bg-surface-subtle border border-border-subtle rounded-2xl mb-5">
                <button
                    onClick={() => setActiveTab('CURRENT')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'CURRENT'
                            ? 'bg-surface text-primary shadow-xs border border-border-subtle'
                            : 'text-text-muted hover:text-primary'
                    }`}
                >
                    <span>This Month ({format(now, 'MMM')})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-pill font-mono">
                        {currentMonthSureties.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('UPCOMING')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'UPCOMING'
                            ? 'bg-surface text-primary shadow-xs border border-border-subtle'
                            : 'text-text-muted hover:text-primary'
                    }`}
                >
                    <span>Upcoming ({format(nextMonthDate, 'MMM')})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent-subtle text-accent-text border border-accent-border font-mono">
                        {upcomingMonthSureties.length}
                    </span>
                </button>
            </div>

            {/* Total Summary Card */}
            <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle mb-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {activeTab === 'CURRENT' ? `${format(now, 'MMMM')} Obligations` : `Projected ${format(nextMonthDate, 'MMMM')} Burden`}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                        {activeTab === 'CURRENT' ? 'Identified commitments for current cycle' : 'Expected recurring charges for upcoming cycle'}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xl font-black text-primary tracking-tight font-mono">
                        ₹{(activeTab === 'CURRENT' ? currentTotal : upcomingTotal).toLocaleString('en-IN')}
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                {displayedSureties.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-3">
                        <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center border border-border-subtle">
                            <RefreshCw size={22} className="opacity-50" />
                        </div>
                        <p className="text-sm font-semibold">
                            {activeTab === 'CURRENT' ? 'No auto-detected sureties for this month.' : `No sureties projected yet for ${format(nextMonthDate, 'MMMM')}.`}
                        </p>
                    </div>
                )}

                {displayedSureties.map((surety) => (
                    <div key={surety.id} className="p-5 rounded-[1.5rem] bg-surface-subtle border border-border-subtle relative overflow-hidden group hover:border-border-default transition-all duration-300">
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4">
                            <div className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border
                                    ${surety.status === 'OVERDUE' ? 'bg-status-danger-bg text-status-danger-text border-status-danger-border' :
                                    surety.status === 'PAID' ? 'bg-status-success-bg text-status-success-text border-status-success-border' :
                                        surety.status === 'SKIPPED' ? 'bg-status-warning-bg text-status-warning-text border-status-warning-border' :
                                            surety.status === 'COVERED' ? 'bg-surface-pill text-text-muted border-border-subtle' :
                                                'bg-accent-subtle text-accent-text border-accent-border'}`}>
                                {surety.status}
                            </div>
                        </div>

                        <div className="pr-20">
                            <h3 className="font-bold text-primary text-lg leading-tight mb-1">{surety.title.replace(' (Auto-detected)', '')}</h3>
                            <p className="text-xs text-text-muted font-mono uppercase tracking-wider">{format(new Date(surety.due_date), 'MMMM do')} • {surety.sub_category}</p>
                        </div>

                        <div className="mt-4 flex items-end justify-between">
                            <div className="font-mono font-medium text-2xl tracking-tighter text-primary">
                                ₹{Math.abs(surety.amount).toLocaleString('en-IN')}
                            </div>

                            {surety.source_id && (
                                <button
                                    onClick={() => navigate(`/transactions?highlight=${surety.source_id}`)}
                                    className="text-xs text-accent-text hover:underline decoration-accent-border underline-offset-4 transition-all flex items-center gap-1.5"
                                >
                                    Source <ExternalLink size={12} />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-border-subtle">
                            <button
                                onClick={() => surety.source_id && handleMarkPaid(surety.id, surety.source_id)}
                                disabled={['SKIPPED', 'PAID', 'COVERED', 'TERMINATED'].includes(surety.status) || createExclusion.isPending}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-text-inverse text-xs font-semibold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                {actionLoading?.id === surety.id && actionLoading?.action === 'PAID' ? (
                                    <Loader2 size={14} className="animate-spin text-text-inverse" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                )}
                                {actionLoading?.id === surety.id && actionLoading?.action === 'PAID' ? 'Processing...' : 'Paid'}
                            </button>
                            <button
                                onClick={() => surety.source_id && handleSkip(surety.id, surety.source_id)}
                                disabled={['SKIPPED', 'PAID', 'COVERED', 'TERMINATED'].includes(surety.status) || createExclusion.isPending}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-subtle text-text-muted text-xs font-medium hover:bg-surface-hover hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-border-subtle"
                            >
                                {actionLoading?.id === surety.id && actionLoading?.action === 'SKIP' ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <CalendarX size={14} />
                                )}
                                {actionLoading?.id === surety.id && actionLoading?.action === 'SKIP' ? 'Skipping...' : 'Skip'}
                            </button>
                            <button
                                onClick={() => handleTerminate(surety.id, surety.title, surety.sub_category)}
                                disabled={['TERMINATED', 'COVERED'].includes(surety.status) || createExclusion.isPending}
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-subtle text-rose-500 text-xs font-medium hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-border-subtle"
                            >
                                {actionLoading?.id === surety.id && actionLoading?.action === 'STOP' ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Ban size={14} />
                                )}
                                {actionLoading?.id === surety.id && actionLoading?.action === 'STOP' ? 'Stopping...' : 'Stop'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sureties;
