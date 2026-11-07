// Settle Up (Peer Ledger) Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface PeerBalance {
    peer_name: string;
    net_balance: number;
    last_activity_date: string;
    phone?: string | null;
    email?: string | null;
    auto_remind_email?: boolean;
    last_reminded_at?: string | null;
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
    phone?: string;
    email?: string;
}

export interface PeerContactUpdate {
    phone?: string | null;
    email?: string | null;
    auto_remind_email?: boolean;
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

export const useUpdateSettleUpEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...entry }: Partial<LedgerEntryCreate> & { id: string }) => {
            const { data } = await api.put<LedgerEntry>(`/settle-up/${id}`, entry);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settle-up-balances'] });
            queryClient.invalidateQueries({ queryKey: ['settle-up-history'] });
        },
    });
};

export const useDeleteSettleUpEntry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.delete(`/settle-up/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settle-up-balances'] });
            queryClient.invalidateQueries({ queryKey: ['settle-up-history'] });
        },
    });
};

export const useUpdatePeerContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ peerName, ...contact }: PeerContactUpdate & { peerName: string }) => {
            const { data } = await api.put(`/settle-up/${encodeURIComponent(peerName)}/contact`, contact);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settle-up-balances'] });
        },
    });
};

export const useSendEmailReminder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ peerName, custom_note, subject, include_ledger }: { peerName: string; custom_note?: string; subject?: string; include_ledger?: boolean }) => {
            const { data } = await api.post(`/settle-up/${encodeURIComponent(peerName)}/send-reminder`, { custom_note, subject, include_ledger });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settle-up-balances'] });
        },
    });
};
