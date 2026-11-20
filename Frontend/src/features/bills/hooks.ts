import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

export interface Bill {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    is_paid: boolean;
    is_recurring: boolean;
    recurrence_day?: number;
    category: string;
    sub_category?: string;
    created_at?: string;
}

export const useBills = (paid?: boolean) => {
    return useQuery({
        queryKey: ['bills', paid],
        queryFn: async () => {
            const url = paid !== undefined ? `/bills?paid=${paid}` : '/bills';
            const { data } = await api.get<Bill[]>(url);
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
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to update bill status');
        }
    });
};

export const useAddBill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (bill: Partial<Bill>) => {
            const res = await api.post<Bill>('/bills', bill);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['bills-upcoming'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
            toast.success('Bill recurring schedule created');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to add bill');
        }
    });
};

export const useUpdateBill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Bill> }) => {
            const res = await api.put<Bill>(`/bills/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['bills-upcoming'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
            toast.success('Bill updated');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to update bill');
        }
    });
};

export const useDeleteBill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/bills/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['bills-upcoming'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
            toast.success('Bill deleted');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to delete bill');
        }
    });
};

export const suretyQueryKey = ['sureties'];

export interface Surety {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    type: string;
    status: string;
    sub_category: string;
    source_id?: string;
}

export const useSureties = () => {
    return useQuery({
        queryKey: suretyQueryKey,
        queryFn: async () => {
            const { data } = await api.get<Surety[]>('/bills/surety/list');
            return data;
        },
    });
};

export const useCreateExclusion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (exclusion: {
            source_transaction_id?: string,
            merchant_pattern?: string,
            subcategory_pattern?: string,
            exclusion_type: 'SKIP' | 'PERMANENT' | 'MANUAL_PAID'
        }) => {
            await api.post('/bills/surety/exclusion', exclusion);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sureties'] });
            queryClient.invalidateQueries({ queryKey: ['bills-upcoming'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
            toast.success('Surety allocation adjusted');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to adjust surety');
        }
    });
};
