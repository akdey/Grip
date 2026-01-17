import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    is_paid: boolean;
    is_recurring: boolean;
    category: string;
}

export const useBills = (paid: boolean = false) => {
    return useQuery({
        queryKey: ['bills', paid],
        queryFn: async () => {
            const { data } = await api.get<Bill[]>(`/bills?paid=${paid}`);
            return data;
        },
    });
};

export const useUpcomingBills = (days: number = 30) => {
    return useQuery({
        queryKey: ['bills-upcoming', days],
        queryFn: async () => {
            const { data } = await api.get<{ upcoming_bills: Bill[], total_amount: number }>(`/bills/upcoming?days=${days}`);
            return data;
        },
    });
};

export const useMarkBillPaid = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
            await api.post(`/bills/${id}/mark-paid`, { paid });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['bills-upcoming'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] }); // Updates dashboard frozen funds
        },
    });
};

export const useAddBill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (bill: Partial<Bill>) => {
            await api.post('/bills', bill);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
        },
    });
};
