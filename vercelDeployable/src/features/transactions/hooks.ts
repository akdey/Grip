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
}

export interface TransactionFilters {
    limit?: number;
    skip?: number;
    start_date?: string;
    end_date?: string;
    category?: string;
    sub_category?: string;
    search?: string;
}

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
