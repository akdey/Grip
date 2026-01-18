import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

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
    created_at: string;
    remarks?: string;
    tags?: string[];
    category_icon?: string;
    sub_category_icon?: string;
    category_color?: string;
    sub_category_color?: string;
    is_settled?: boolean;
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
            alert('Failed to update transaction status. Please check console for details.');
        },
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
