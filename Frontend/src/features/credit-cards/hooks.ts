import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

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
        },
    });
};
