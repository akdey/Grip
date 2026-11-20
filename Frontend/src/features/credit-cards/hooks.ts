import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

export interface CreditCard {
    id: string;
    card_name: string;
    last_four_digits: string;
    statement_date: number;
    payment_due_date: number;
    credit_limit: number;
    is_active: boolean;
}

export interface CreditCardCycleInfo extends CreditCard {
    cycle_start: string;
    cycle_end: string;
    next_statement_date: string;
    days_until_statement: number;
    unbilled_amount: number;
    utilization_percentage: number;
}

export const useCreditCards = () => {
    return useQuery({
        queryKey: ['credit-cards'],
        queryFn: async () => {
            const { data } = await api.get<CreditCard[]>('/credit-cards');
            return data;
        },
    });
};

export const useCardCycleInfo = (cardId: string) => {
    return useQuery({
        queryKey: ['credit-card-cycle', cardId],
        queryFn: async () => {
            const { data } = await api.get<CreditCardCycleInfo>(`/credit-cards/${cardId}/cycle-info`);
            return data;
        },
        enabled: !!cardId,
    });
};


export const useAddCreditCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (newCard: Partial<CreditCard>) => {
            const { data } = await api.post('/credit-cards', newCard);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            toast.success('Credit card added');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to add credit card');
        }
    });
};

export const useUpdateCreditCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<CreditCard> & { id: string }) => {
            const { data: response } = await api.put(`/credit-cards/${id}`, data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
            toast.success('Credit card updated');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to update credit card');
        }
    });
};

export interface CardGraceEvaluation {
    card_id: string;
    card_name: string;
    last_four_digits?: string;
    statement_date: number;
    payment_due_date: number;
    credit_limit?: number;
    unbilled_amount: number;
    utilization_percentage?: number;
    grace_days: number;
    days_until_statement: number;
    next_statement_date: string;
    payment_due_date_resolved: string;
    status_label: string;
    is_recommended: boolean;
    warning?: string;
}

export interface GraceOptimizerResponse {
    reference_date: string;
    recommended_card?: CardGraceEvaluation;
    cards: CardGraceEvaluation[];
    max_grace_days: number;
    insight: string;
}

export const useCreditCardGraceOptimizer = (referenceDate?: string) => {
    return useQuery({
        queryKey: ['credit-card-grace-optimizer', referenceDate],
        queryFn: async () => {
            const params = referenceDate ? { reference_date: referenceDate } : {};
            const { data } = await api.get<GraceOptimizerResponse>('/credit-cards/grace-optimizer', { params });
            return data;
        },
    });
};

