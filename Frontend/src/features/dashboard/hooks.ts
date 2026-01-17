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
}

export interface InvestmentSummary {
    total_investments: number;
    breakdown: Record<string, number>;
}

export interface ForecastInfo {
    predicted_burden_30d: number;
    confidence: string;
    description: string;
}

export const useSafeToSpend = (buffer: number = 0.10) => {
    return useQuery({
        queryKey: ['safe-to-spend', buffer],
        queryFn: async () => {
            const { data } = await api.get<SafeToSpend>(`/analytics/safe-to-spend/?buffer=${buffer}`);
            return data;
        },
    });
};

export const useVariance = () => {
    return useQuery({
        queryKey: ['variance'],
        queryFn: async () => {
            const { data } = await api.get<VarianceAnalysis>('/analytics/variance/');
            return data;
        },
    });
};

export const useMonthlySummary = () => {
    return useQuery({
        queryKey: ['monthly-summary'],
        queryFn: async () => {
            const { data } = await api.get<MonthlySummary>('/analytics/summary/');
            return data;
        },
    });
};

export const useInvestments = () => {
    return useQuery({
        queryKey: ['investments'],
        queryFn: async () => {
            const { data } = await api.get<InvestmentSummary>('/dashboard/investments');
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
