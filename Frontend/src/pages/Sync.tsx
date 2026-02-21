import React, { useState } from 'react';
import {
    Mail,
    CheckCircle,
    XCircle,
    RefreshCw,
    Unplug,
    Clock,
    AlertCircle
} from 'lucide-react';
import { useGmailStatus, useConnectGmail, useDisconnectGmail, useManualSync, useSyncHistory } from '../features/sync/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loader } from '../components/ui/Loader';
import { formatDistanceToNow } from 'date-fns';
const Sync: React.FC = () => {
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

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
        <div className="text-white pb-24 space-y-6">
            {/* Header */}
            <header className="px-5 pt-10 pb-4">
                <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600 mb-2">
                    Gmail Sync
                </h1>
                {/* <p className="text-sm text-gray-400">
                    Automatically import transactions from your email
                </p> */}
            </header>

            <div className="px-5 space-y-6">
                {/* Connection Status Card */}
                {!status?.connected ? (
                    <Card className="p-10 space-y-10 bg-gradient-to-br from-indigo-500/5 via-cyan-500/5 to-transparent border-indigo-500/10 relative overflow-hidden">
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl opacity-50" />

                        <div className="relative z-10 text-center space-y-8">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 shadow-inner group">
                                <Mail size={42} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-500" />
                            </div>

                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                                    Sync Intelligence
                                </h2>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] max-w-xs mx-auto leading-relaxed opacity-60">
                                    Autopilot for transaction tracking.
                                </p>
                            </div>

                            <div className="space-y-3 text-left max-w-md mx-auto">
                                <div className="flex items-start gap-3">
                                    <CheckCircle size={20} className="text-green-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm text-white font-medium">Automatic Transaction Detection</p>
                                        <p className="text-xs text-gray-500">AI extracts amount, merchant, and category</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle size={20} className="text-green-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm text-white font-medium">Secure & Private</p>
                                        <p className="text-xs text-gray-500">Read-only access, we never send emails</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle size={20} className="text-green-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm text-white font-medium">Save Time</p>
                                        <p className="text-xs text-gray-500">No manual entry needed</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleConnect}
                                isLoading={connectMutation.isPending}
                                className="w-full max-w-md"
                                icon={<Mail size={20} className="shrink-0" />}
                            >
                                Continue with Gmail
                            </Button>

                            {connectMutation.isError && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    <p className="flex items-center gap-2">
                                        <AlertCircle size={16} />
                                        Failed to connect. Please try again.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Connected Status */}
                        <Card className="p-6 bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">
                                            Gmail Connected
                                        </h3>
                                        <p className="text-sm text-gray-400 mb-3">
                                            {status.email}
                                        </p>

                                        <div className="flex flex-wrap gap-4 text-xs">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Clock size={14} />
                                                <span>
                                                    Last synced: {status.last_sync
                                                        ? formatDistanceToNow(new Date(status.last_sync), { addSuffix: true })
                                                        : 'Never'
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Mail size={14} />
                                                <span>{status.total_synced} transactions imported</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowDisconnectConfirm(true)}
                                    className="text-gray-500 hover:text-red-400 transition-colors p-2"
                                    title="Disconnect"
                                >
                                    <Unplug size={20} />
                                </button>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    onClick={handleSync}
                                    isLoading={syncMutation.isPending}
                                    icon={<RefreshCw size={18} />}
                                    className="flex-1"
                                >
                                    {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                                </Button>
                            </div>

                            {syncMutation.isSuccess && (
                                <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                                    <p className="flex items-center gap-2">
                                        <CheckCircle size={16} />
                                        Sync started! Check history below for results.
                                    </p>
                                </div>
                            )}
                        </Card>

                        {/* Sync History */}
                        {history && history.syncs.length > 0 && (
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-white mb-4">
                                    Sync History
                                </h3>

                                <div className="space-y-3">
                                    {history.syncs.map((sync) => (
                                        <div
                                            key={sync.id}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${sync.status === 'SUCCESS' ? 'bg-green-400' :
                                                    sync.status === 'FAILED' ? 'bg-red-400' :
                                                        'bg-yellow-400'
                                                    }`} />

                                                <div>
                                                    <p className="text-sm font-medium text-white">
                                                        {sync.status === 'SUCCESS' && `${sync.records_processed} transactions synced`}
                                                        {sync.status === 'FAILED' && 'Sync failed'}
                                                        {sync.status === 'IN_PROGRESS' && 'Syncing...'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {formatDistanceToNow(new Date(sync.start_time), { addSuffix: true })} • {sync.trigger_source}
                                                    </p>
                                                    {sync.error_message && (
                                                        <p className="text-xs text-red-400 mt-1">{sync.error_message}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {sync.status === 'SUCCESS' && (
                                                <CheckCircle size={18} className="text-green-400" />
                                            )}
                                            {sync.status === 'FAILED' && (
                                                <XCircle size={18} className="text-red-400" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>

            {/* Disconnect Confirmation Modal */}
            {showDisconnectConfirm && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <Card className="w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                                <AlertCircle size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-white">
                                Disconnect Gmail?
                            </h3>
                        </div>

                        <p className="text-sm text-gray-400">
                            This will remove Gmail access. You'll need to reconnect to sync transactions again.
                            Your existing transactions won't be deleted.
                        </p>

                        <div className="flex gap-3">
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
                                className="flex-1 bg-red-500 hover:bg-red-600"
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
