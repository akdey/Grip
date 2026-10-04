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
            <header className="flex items-center gap-4 mb-8 sticky top-0 bg-page/80 backdrop-blur-xl py-4 z-10 border-b border-border-subtle -mx-6 px-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full bg-surface-subtle hover:bg-surface-hover active:scale-95 transition-all text-text-muted hover:text-primary border border-border-subtle"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-primary heading-apple">Manage sureties</h1>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Auto-detected Obligations</p>
                </div>
            </header>

            <div className="space-y-4">
                {sureties?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-4">
                        <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center">
                            <RefreshCw size={24} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium">No auto-detected sureties found.</p>
                    </div>
                )}

                {sureties?.map((surety) => (
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
                                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-background text-xs font-semibold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                {actionLoading?.id === surety.id && actionLoading?.action === 'PAID' ? (
                                    <Loader2 size={14} className="animate-spin text-background" />
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
