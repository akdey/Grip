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

export const useTransactions = (limit: number = 50, skip: number = 0) => {
    return useQuery({
        queryKey: ['transactions', limit, skip],
        queryFn: async () => {
            const { data } = await api.get<Transaction[]>('/transactions/', {
                params: { limit, skip }
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
