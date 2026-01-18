import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface Goal {
    id: string;
    user_id: string;
    name: string;
    target_amount: number;
    target_date: string;
    monthly_contribution: number;
    current_saved: number;
    is_active: boolean;
}

export interface GoalCreate {
    name: string;
    target_amount: number;
    target_date: string;
}

export interface FeasibilityCheck {
    is_feasible: boolean;
    required_monthly_savings: number;
    available_monthly_liquidity: number;
    message: string;
}

export const useGoals = () => {
    return useQuery({
        queryKey: ['goals'],
        queryFn: async () => {
            const response = await api.get<Goal[]>('/goals/');
            return response.data;
        },
    });
};

export const useCheckFeasibility = () => {
    return useMutation({
        mutationFn: async (goalData: GoalCreate) => {
            const response = await api.post<FeasibilityCheck>('/goals/feasibility', goalData);
            return response.data;
        },
    });
};

export const useCreateGoal = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (goalData: GoalCreate) => {
            const response = await api.post<Goal>('/goals/', goalData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
        },
    });
};

export const useDeleteGoal = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (goalId: string) => {
            await api.delete(`/goals/${goalId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['safe-to-spend'] });
        },
    });
};
