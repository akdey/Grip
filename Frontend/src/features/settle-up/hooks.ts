// Settle Up (Peer Ledger) Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface PeerBalance {
    peer_name: string;
    net_balance: number;
    last_activity_date: string;
}

export interface LedgerEntry {
    id: string;
    user_id: string;
    peer_name: string;
    amount: number;
    transaction_id: string | null;
    remarks: string | null;
    date: string;
    created_at: string;
}

export interface LedgerEntryCreate {
    peer_name: string;
    amount: number;
    remarks?: string;
    date?: string;
}

export const usePeerBalances = () => {
    return useQuery({
        queryKey: ['settle-up-balances'],
        queryFn: async () => {
            const { data } = await api.get<PeerBalance[]>('/settle-up/balances');
            return data;
        },
    });
};

export const usePeerHistory = (peerName: string) => {
    return useQuery({
        queryKey: ['settle-up-history', peerName],
        queryFn: async () => {
            const { data } = await api.get<LedgerEntry[]>(`/settle-up/${encodeURIComponent(peerName)}/history`);
            return data;
        },
        enabled: !!peerName,
    });
};

export const useAddLedgerEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (entry: LedgerEntryCreate) => {
            const { data } = await api.post<LedgerEntry>('/settle-up/', entry);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settle-up-balances'] });
            queryClient.invalidateQueries({ queryKey: ['settle-up-history'] });
        },
    });
};
