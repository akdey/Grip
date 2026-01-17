import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface SubCategory {
    id: string;
    name: string;
    icon: string | null;
    category_id: string;
    user_id: string | null;
}

export interface Category {
    id: string;
    name: string;
    icon: string | null;
    user_id: string | null;
    sub_categories: SubCategory[];
}

export const useCategories = () => {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await api.get<Category[]>('/categories');
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
