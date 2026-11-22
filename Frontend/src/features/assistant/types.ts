export interface AssistantQueryRequest {
    question: string;
}

export interface AssistantQueryResultItem {
    id?: string;
    amount?: number;
    merchant_name?: string;
    category?: string;
    sub_category?: string;
    transaction_date?: string;
    account_type?: string;
    remarks?: string;
    status?: string;
    [key: string]: any;
}

export interface AssistantQueryResponse {
    question: string;
    answer: string;
    sql_query: string;
    row_count: number;
    results: AssistantQueryResultItem[];
    execution_time_ms: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    response?: AssistantQueryResponse;
    timestamp: Date;
    error?: string;
}
