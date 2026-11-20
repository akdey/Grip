import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

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
    custom_expected_income?: number;
}

export interface FeasibilityCheck {
    is_feasible: boolean;
    required_monthly_savings: number;
    available_monthly_liquidity: number;
    projected_monthly_surplus?: number;
    projected_total_savings?: number;
    current_cycle_freeze?: number;
    next_cycle_contribution?: number;
    days_remaining?: number;
    daily_saving_needed?: number;
    detected_income?: number;
    detected_payday_day?: number;
    salary_cycles_count?: number;
    monthly_obligations_burn?: number;
    message: string;
    suggested_target_date?: string;
    suggested_target_amount?: number;
    suggested_cycles_needed?: number;
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
            toast.success('Goal target locked into Safe-to-Spend');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to create goal');
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
            toast.success('Goal removed');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to delete goal');
        },
    });
};
