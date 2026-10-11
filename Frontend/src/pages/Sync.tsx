import React, { useState } from 'react';
import {
    Mail,
    CheckCircle,
    XCircle,
    RefreshCw,
    Unplug,
    Clock,
    AlertCircle,
    TrendingUp,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useGmailStatus, useConnectGmail, useDisconnectGmail, useManualSync, useSyncHistory } from '../features/sync/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { formatDistanceToNow } from 'date-fns';

const Sync: React.FC = () => {
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [expandedSync, setExpandedSync] = useState<number | null>(null);

    const { data: status, isLoading: statusLoading } = useGmailStatus();
    const { data: history } = useSyncHistory();
    const connectMutation = useConnectGmail();
    const disconnectMutation = useDisconnectGmail();
    const syncMutation = useManualSync();

    const handleConnect = async () => {
        try {
            await connectMutation.mutateAsync();
        } catch (error: any) {
            console.error('Connection failed:', error);
        }
    };

    const handleDisconnect = async () => {
        try {
            await disconnectMutation.mutateAsync();
            setShowDisconnectConfirm(false);
        } catch (error) {
            console.error('Disconnect failed:', error);
        }
    };

    const handleSync = async () => {
        try {
            await syncMutation.mutateAsync();
        } catch (error) {
            console.error('Sync failed:', error);
        }
    };

    if (statusLoading) {
        return <Loader fullPage text="Loading sync status..." />;
    }

    return (
        <div className="text-text-primary pb-24 space-y-4">
            {/* Header */}
            <header className="px-5 pt-3 pb-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary heading-apple">
                    Gmail Sync
                </h1>
            </header>

            <div className="px-5 space-y-4">
                {/* Connection Status Card */}
                {!status?.connected ? (
                    <Card className="p-8 sm:p-10 space-y-8 bg-surface-subtle border-border-subtle relative overflow-hidden">
                        <div className="relative z-10 text-center space-y-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-surface-pill text-primary border border-border-subtle shadow-inner group">
                                <Mail size={36} strokeWidth={1.5} className="text-primary group-hover:scale-105 transition-transform duration-300" />
                            </div>

                            <div className="space-y-1">
                                <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight uppercase heading-apple">
                                    Sync Intelligence
                                </h2>
                                <p className="text-text-muted text-[10px] font-bold uppercase tracking-[2px] max-w-xs mx-auto leading-relaxed">
                                    Autopilot for transaction tracking
                                </p>
                            </div>

                            <div className="space-y-3 text-left max-w-md mx-auto">
                                <div className="flex items-start gap-3">
                                    <CheckCircle size={18} className="text-status-success-text mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm text-text-primary font-bold">Automatic Transaction Detection</p>
                                        <p className="text-xs text-text-muted">Extracts amount, merchant, and category from spend alerts</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle size={18} className="text-status-success-text mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm text-text-primary font-bold">Wealth Map Integration</p>
                                        <p className="text-xs text-text-muted">Auto-update SIPs and investments in your Wealth portfolio</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle size={18} className="text-status-success-text mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm text-text-primary font-bold">Bin & Trash Intelligence</p>
                                        <p className="text-xs text-text-muted">Monitors deleted mail for missed transaction alerts</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleConnect}
                                isLoading={connectMutation.isPending}
                                className="w-full max-w-md"
                                icon={<Mail size={18} className="shrink-0" />}
                            >
                                Continue with Gmail
                            </Button>

                            {connectMutation.isError && (
                                <div className="p-3 rounded-xl badge-danger text-xs font-semibold">
                                    <p className="flex items-center justify-center gap-2">
                                        <AlertCircle size={14} />
                                        Failed to connect. Please try again.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Connected Status */}
                        <Card className="p-5 sm:p-6 bg-surface-subtle border-border-subtle">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-status-success-bg border border-status-success-border flex items-center justify-center text-status-success-text shrink-0">
                                        <CheckCircle size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary mb-0.5">
                                            Gmail Connected
                                        </h3>
                                        <p className="text-sm text-text-secondary mb-3">
                                            {status.email}
                                        </p>

                                        <div className="flex flex-wrap gap-4 text-xs">
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <Clock size={14} />
                                                <span>
                                                    Last synced: {status.last_sync
                                                        ? formatDistanceToNow(new Date(status.last_sync), { addSuffix: true })
                                                        : 'Never'
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <Mail size={14} />
                                                <span>{status.total_synced} transactions imported</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowDisconnectConfirm(true)}
                                    className="text-text-muted hover:text-status-danger-text transition-colors p-2"
                                    title="Disconnect"
                                >
                                    <Unplug size={18} />
                                </button>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <Button
                                    onClick={handleSync}
                                    isLoading={syncMutation.isPending}
                                    icon={<RefreshCw size={16} />}
                                    className="flex-1"
                                >
                                    {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                                </Button>
                            </div>

                            {syncMutation.isSuccess && (
                                <div className="mt-4 p-3 rounded-xl badge-success text-xs font-semibold">
                                    <p className="flex items-center gap-2">
                                        <CheckCircle size={14} />
                                        Sync started! Check history below for results.
                                    </p>
                                </div>
                            )}
                        </Card>

                        {/* Sync History */}
                        {history && history.syncs.length > 0 && (
                            <Card className="p-5 sm:p-6 bg-surface-subtle border-border-subtle">
                                <h3 className="text-lg font-bold text-text-primary mb-4">
                                    Sync History
                                </h3>

                                <div className="space-y-2.5">
                                    {history.syncs.map((sync) => {
                                        const summary = sync.summary ? JSON.parse(sync.summary) : [];
                                        const isExpanded = expandedSync === sync.id;

                                        return (
                                            <div key={sync.id} className="space-y-2">
                                                <div
                                                    onClick={() => summary.length > 0 && setExpandedSync(isExpanded ? null : sync.id)}
                                                    className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-surface border border-border-subtle hover:bg-surface-hover transition-colors cursor-pointer ${isExpanded ? 'bg-surface-hover border-border-strong' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={`w-2 h-2 rounded-full ${sync.status === 'SUCCESS' ? 'bg-status-success-solid' :
                                                            sync.status === 'FAILED' ? 'bg-status-danger-solid' :
                                                                'bg-status-warning-solid'
                                                            }`} />

                                                        <div>
                                                            <p className="text-sm font-semibold text-text-primary">
                                                                {sync.status === 'SUCCESS' && `${sync.records_processed} transactions synced`}
                                                                {sync.status === 'FAILED' && 'Sync failed'}
                                                                {sync.status === 'IN_PROGRESS' && 'Syncing...'}
                                                            </p>
                                                            <p className="text-xs text-text-muted mt-0.5">
                                                                {formatDistanceToNow(new Date(sync.start_time), { addSuffix: true })} • {sync.trigger_source}
                                                            </p>
                                                            {sync.error_message && (
                                                                <p className="text-xs text-status-danger-text mt-1">{sync.error_message}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2.5">
                                                        {sync.status === 'SUCCESS' && summary.length > 0 && (
                                                            <div className="text-text-muted">
                                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                            </div>
                                                        )}
                                                        {sync.status === 'SUCCESS' && <CheckCircle size={16} className="text-status-success-text" />}
                                                        {sync.status === 'FAILED' && <XCircle size={16} className="text-status-danger-text" />}
                                                    </div>
                                                </div>

                                                {isExpanded && summary.length > 0 && (
                                                    <div className="ml-5 pl-4 border-l border-border-subtle space-y-2 animate-in slide-in-from-top-2">
                                                        <h4 className="text-[10px] font-extrabold uppercase tracking-[2px] text-text-muted mb-2">Intelligence Feed</h4>
                                                        {summary.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-subtle">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.amount < 0 ? 'bg-status-danger-solid' : 'bg-status-success-solid'}`} />
                                                                    <div>
                                                                        <p className="text-xs font-bold text-text-primary">{item.merchant}</p>
                                                                        <p className="text-[10px] text-text-muted">{item.category}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    {item.wealth_mapped && (
                                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-subtle border border-accent-border">
                                                                            <TrendingUp size={10} className="text-accent-text" />
                                                                            <span className="text-[8px] font-black uppercase text-accent-text tracking-wider">Wealth Sync</span>
                                                                        </div>
                                                                    )}
                                                                    <p className={`text-xs font-bold ${item.amount < 0 ? 'text-text-primary' : 'text-status-success-text'}`}>
                                                                        {item.amount < 0 ? '-' : '+'}₹{Math.abs(item.amount).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>

            {/* Disconnect Confirmation Modal */}
            {showDisconnectConfirm && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-overlay backdrop-blur-md animate-in fade-in">
                    <Card className="w-full max-w-md p-6 space-y-4 bg-raised border-border-default shadow-2xl rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-status-danger-bg border border-status-danger-border flex items-center justify-center text-status-danger-text">
                                <AlertCircle size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary">
                                Disconnect Gmail?
                            </h3>
                        </div>

                        <p className="text-sm text-text-secondary">
                            This will remove Gmail access. You'll need to reconnect to sync transactions again.
                            Your existing transactions won't be deleted.
                        </p>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setShowDisconnectConfirm(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDisconnect}
                                isLoading={disconnectMutation.isPending}
                                className="flex-1 bg-status-danger-solid hover:opacity-90 text-white"
                            >
                                Disconnect
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Sync;
