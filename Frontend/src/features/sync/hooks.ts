import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface GmailStatus {
    connected: boolean;
    email: string | null;
    last_sync: string | null;
    total_synced: number;
}

export interface SyncHistoryItem {
    id: number;
    start_time: string;
    end_time: string | null;
    status: string;
    records_processed: number;
    trigger_source: string;
    error_message: string | null;
}

export interface SyncHistory {
    syncs: SyncHistoryItem[];
}

export const useGmailStatus = () => {
    return useQuery({
        queryKey: ['gmail-status'],
        queryFn: async () => {
            const { data } = await api.get<GmailStatus>('/sync/status');
            return data;
        },
    });
};

export const useConnectGmail = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            // Step 1: Get auth URL - Use current location as redirect URI so polling works
            const redirectUri = window.location.origin + '/sync';
            const { data } = await api.get<{ url: string }>(`/sync/google/auth?redirect_uri=${encodeURIComponent(redirectUri)}`);

            // Step 2: Open popup
            const width = 500;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;

            const popup = window.open(
                data.url,
                'Google OAuth',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // Step 3: Wait for callback
            return new Promise<void>((resolve, reject) => {
                const checkPopup = setInterval(() => {
                    if (!popup || popup.closed) {
                        clearInterval(checkPopup);
                        reject(new Error('Popup closed'));
                        return;
                    }

                    try {
                        // Check if we got redirected back to our app with code
                        if (popup.location.href.includes('code=')) {
                            const urlParams = new URLSearchParams(popup.location.search);
                            const code = urlParams.get('code');

                            if (code) {
                                popup.close();
                                clearInterval(checkPopup);

                                // Step 4: Send code to backend with the SAME redirect_uri
                                api.post('/sync/google/callback', {
                                    code,
                                    redirect_uri: redirectUri
                                })
                                    .then(() => resolve())
                                    .catch(reject);
                            }
                        }
                    } catch (e) {
                        // Cross-origin error while on Google terrain, keep waiting
                    }
                }, 500);

                // Timeout after 5 minutes
                setTimeout(() => {
                    clearInterval(checkPopup);
                    if (popup && !popup.closed) popup.close();
                    reject(new Error('Timeout'));
                }, 300000);
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
        },
    });
};

export const useDisconnectGmail = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await api.delete('/sync/disconnect');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
            queryClient.invalidateQueries({ queryKey: ['sync-history'] });
        },
    });
};

export const useManualSync = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await api.post('/sync/manual');
        },
        onSuccess: () => {
            // Invalidate status after a delay to allow sync to complete
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
                queryClient.invalidateQueries({ queryKey: ['sync-history'] });
            }, 2000);
        },
    });
};

export const useSyncHistory = () => {
    return useQuery({
        queryKey: ['sync-history'],
        queryFn: async () => {
            const { data } = await api.get<SyncHistory>('/sync/history');
            return data;
        },
    });
};

export const useAutoSync = () => {
    const { mutate: sync } = useManualSync();

    // Logic to run sync on mount if connected
    // We don't want to run this TOO often, but "on app load" (hook mount) is a good start.
    // Ideally, we check status first, then sync.
    const { data: status } = useGmailStatus();

    // Effectively, we can just expose a function or useEffect in the component using this.
    // But for clean separation, let's keep logic here or just rely on the existing hooks in the Layout.
    return { status, sync };
};
