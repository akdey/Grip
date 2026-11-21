import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

export interface Transaction {
    id: string;
    amount: number;
    merchant_name: string;
    category: string;
    sub_category?: string;
    account_type: string;
    transaction_date: string;
    status: string;
    is_manual: boolean;
    is_surety: boolean;
    credit_card_id?: string;
    split_group_id?: string;
    created_at: string;
    remarks?: string;
    tags?: string[];
    category_icon?: string;
    sub_category_icon?: string;
    category_color?: string;
    sub_category_color?: string;
    is_settled?: boolean;
}

export interface TransactionSplitSlice {
    category: string;
    sub_category: string;
    amount?: number;
    ratio?: number;
    remarks?: string;
    tags?: string[];
}

export interface TransactionSplitRequest {
    split_mode: 'RATIO' | 'AMOUNT';
    splits: TransactionSplitSlice[];
}

export interface TransactionFilters {
    limit?: number;
    skip?: number;
    start_date?: string;
    end_date?: string;
    category?: string;
    sub_category?: string;
    search?: string;
    credit_card_id?: string;
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useTransactions = (filters: TransactionFilters = {}) => {
    const { limit = 50, skip = 0, ...rest } = filters;
    return useQuery({
        queryKey: ['transactions', limit, skip, rest],
        queryFn: async () => {
            const { data } = await api.get<Transaction[]>('/transactions/', {
                params: {
                    limit,
                    skip,
                    ...rest
                }
            });
            return data;
        },
    });
};

export const useToggleSettledStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            console.log('Toggling settled status for transaction:', id);
            const { data } = await api.patch<Transaction>(`/transactions/${id}/toggle-settled`);
            console.log('Toggle response:', data);
            return data;
        },
        onSuccess: () => {
            console.log('Successfully toggled, invalidating queries...');
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['card-cycle-info'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
        },
        onError: (error) => {
            console.error('Error toggling settled status:', error);
            toast.error('Failed to update transaction status');
        },
    });
};

export const useVerifyTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { 
            id: string, 
            data: { 
                category: string, 
                sub_category: string, 
                merchant_name: string, 
                approved: boolean, 
                amount?: number,
                account_type?: string,
                credit_card_id?: string | null,
                transaction_date?: string,
                tags?: string[],
                remarks?: string
            } 
        }) => {
            const { data: response } = await api.patch<Transaction>(`/transactions/${id}/verify`, data);
            return response;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['transaction', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
        },
    });
};

export const useSplitTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: TransactionSplitRequest }) => {
            const { data: response } = await api.post<Transaction[]>(`/transactions/${id}/split`, data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
            toast.success('Transaction split successfully');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to split transaction');
        }
    });
};

export const useSplitGroup = (transactionId?: string, enabled = true) => {
    return useQuery({
        queryKey: ['transactions', 'split-group', transactionId],
        queryFn: async () => {
            if (!transactionId) return [];
            const { data } = await api.get<Transaction[]>(`/transactions/${transactionId}/split-group`);
            return data;
        },
        enabled: Boolean(transactionId && enabled)
    });
};

export const useTransaction = (id?: string) => {
    return useQuery({
        queryKey: ['transaction', id],
        queryFn: async () => {
            if (!id) return null;
            const { data } = await api.get<Transaction>(`/transactions/${id}`);
            return data;
        },
        enabled: !!id
    });
};

export const usePendingTransactions = () => {
    return useQuery({
        queryKey: ['transactions', 'pending'],
        queryFn: async () => {
            const { data } = await api.get<Transaction[]>('/transactions/pending');
            return data;
        },
        staleTime: 15 * 1000,
        refetchInterval: 30 * 1000,
    });
};

export const useDeleteTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/transactions/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
            queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
            toast.success('Transaction deleted');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to delete transaction');
        }
    });
};

export interface TagSummary {
    tag: string;
    count: number;
    amount: number;
    last_used: string | null;
}

export const useTagsSummary = () => {
    return useQuery({
        queryKey: ['tags', 'summary'],
        queryFn: async () => {
            const { data } = await api.get<TagSummary[]>('/transactions/tags');
            return data;
        },
    });
};
