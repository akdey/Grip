export interface GmailStatus {
    connected: boolean;
    email: string | null;
    last_sync: string | null;
    total_synced: number;
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
