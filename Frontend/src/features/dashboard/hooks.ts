import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface SafeToSpend {
    current_balance: number;
    frozen_funds: {
        unpaid_bills: number;
        projected_surety: number;
        unbilled_cc: number;
        total_frozen: number;
    };
    buffer_amount: number;
    safe_to_spend: number;
    recommendation: string;
}

export interface VarianceAnalysis {
    current_month_total: number;
    last_month_total: number;
    variance_amount: number;
    variance_percentage: number;
    category_breakdown: Record<string, any>;
}

export interface MonthlySummary {
    total_income: number;
    total_expense: number;
    balance: number;
    month: string;
    year: number;
    current_period_expense: number;
    prior_period_settlement: number;
}

export interface InvestmentSummary {
    total_investments: number;
    breakdown: Record<string, number>;
}

export interface ForecastInfo {
    predicted_burden_30d: number;
    confidence: string;
    description: string;
    time_frame: string;
    breakdown: Array<{
        category: string;
        predicted_amount: number;
        reason: string;
    }>;
}

export const useSafeToSpend = () => {
    return useQuery({
        queryKey: ['safe-to-spend'],
        queryFn: async () => {
            const { data } = await api.get<SafeToSpend>(`/analytics/safe-to-spend/`);
            return data;
        },
    });
};

export const useVariance = (month?: number, year?: number) => {
    return useQuery({
        queryKey: ['variance', month, year],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (month) params.append('month', month.toString());
            if (year) params.append('year', year.toString());
            const { data } = await api.get<VarianceAnalysis>(`/analytics/variance/?${params.toString()}`);
            return data;
        },
    });
};

export const useMonthlySummary = (month?: number, year?: number, scope: string = 'month') => {
    return useQuery({
        queryKey: ['monthly-summary', month, year, scope],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (month) params.append('month', month.toString());
            if (year) params.append('year', year.toString());
            if (scope) params.append('scope', scope);
            const { data } = await api.get<MonthlySummary>(`/analytics/summary/?${params.toString()}`);
            return data;
        },
    });
};

export const useInvestments = (month?: number, year?: number) => {
    return useQuery({
        queryKey: ['investments', month, year],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (month) params.append('month', month.toString());
            if (year) params.append('year', year.toString());
            const { data } = await api.get<InvestmentSummary>(`/dashboard/investments?${params.toString()}`);
            return data;
        },
    });
};

export const useForecast = () => {
    return useQuery({
        queryKey: ['forecast'],
        queryFn: async () => {
            const { data } = await api.get<ForecastInfo>('/dashboard/forecast');
            return data;
        },
    });
};
