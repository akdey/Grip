export interface GmailStatus {
    connected: boolean;
    email: string | null;
    last_sync: string | null;
    total_synced: number;
}

export interface SyncAuditItem {
    id: string;
    subject: string;
    sender: string;
    status: 'IMPORTED' | 'NON_TRANSACTION' | 'DUPLICATE' | 'FAILED';
    verdict: 'TRANSACTION' | 'NON_TRANSACTION' | 'DUPLICATE' | 'ERROR';
    reason?: string;
    time_taken_ms: number;
    amount?: number | null;
    merchant?: string | null;
    category?: string | null;
    sub_category?: string | null;
    account_type?: string | null;
    transaction_type?: string | null;
    wealth_mapped?: boolean;
}

export interface SyncAuditSummary {
    total_fetched: number;
    imported_count: number;
    non_transaction_count: number;
    duplicate_count: number;
    items: SyncAuditItem[];
}

export interface SyncHistoryItem {
    id: number;
    start_time: string;
    end_time: string | null;
    status: string;
    records_processed: number;
    trigger_source: string;
    error_message: string | null;
    summary: string | null;
}

export interface SyncHistory {
    syncs: SyncHistoryItem[];
}

export interface SyncTrend {
    date: string;
    manual: number;
    system: number;
    records: number;
}

export interface SyncTrendResponse {
    trends: SyncTrend[];
}
