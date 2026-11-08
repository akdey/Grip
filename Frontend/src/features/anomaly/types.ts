export type AnomalyType = 
    | 'amount_spike' 
    | 'category_burn' 
    | 'near_duplicate' 
    | 'recurring_drift' 
    | 'new_merchant_high' 
    | 'settle_up_aging';

export type AnomalySeverity = 'high' | 'medium' | 'low';

export interface AnomalyFlag {
    id: string;
    anomaly_type: AnomalyType;
    severity: AnomalySeverity;
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
