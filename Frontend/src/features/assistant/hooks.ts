import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AssistantQueryRequest, AssistantQueryResponse } from './types';

export function useAssistantQuery() {
    return useMutation<AssistantQueryResponse, Error, AssistantQueryRequest>({
        mutationFn: async (payload) => {
            const res = await api.post<AssistantQueryResponse>('/assistant/query', payload);
            return res.data;
        }
    });
}
