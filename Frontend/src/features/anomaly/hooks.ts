import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface AnomalyFlag {
    id: string;
    anomaly_type: 'amount_spike' | 'category_burn' | 'near_duplicate' | 'recurring_drift' | 'new_merchant_high' | 'settle_up_aging' | string;
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    transaction_id?: string | null;
    merchant_name?: string | null;
    category?: string | null;
    amount?: number | null;
    expected_range?: string | null;
    is_dismissed: boolean;
    dismissed_at?: string | null;
    detected_at: string;
}

export interface AnomalyListResponse {
    active_count: number;
    high_severity_count: number;
    flags: AnomalyFlag[];
}

export interface AnomalyScanResponse {
    new_anomalies_found: number;
    total_active: number;
    flags: AnomalyFlag[];
}

export const useAnomalyFlags = () => {
    return useQuery<AnomalyListResponse>({
        queryKey: ['anomaly-flags'],
        queryFn: async () => {
            const { data } = await api.get('/anomaly/flags');
            return data;
        },
        staleTime: 60 * 1000,
    });
};

export const useScanAnomalies = () => {
    const queryClient = useQueryClient();
    return useMutation<AnomalyScanResponse>({
        mutationFn: async () => {
            const { data } = await api.post('/anomaly/scan');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['anomaly-flags'] });
        },
    });
};

export const useDismissAnomaly = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (flagId: string) => {
            const { data } = await api.post(`/anomaly/flags/${flagId}/dismiss`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['anomaly-flags'] });
        },
    });
};

export const useDismissAllAnomalies = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/anomaly/flags/dismiss-all');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['anomaly-flags'] });
        },
    });
};
