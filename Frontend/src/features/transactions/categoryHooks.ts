import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../lib/toast';

export type TransactionType = 'EXPENSE' | 'INCOME' | 'INVESTMENT';

export interface SubCategory {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    type: TransactionType;
    category_id: string;
    user_id?: string;
    is_surety?: boolean;
}

export interface Category {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    type: TransactionType;
    user_id?: string;
    sub_categories: SubCategory[];
}

export const useCategories = () => {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await api.get<Category[]>('/categories/');
            return data;
        },
    });
};

export const useUpdateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<Omit<Category, 'id' | 'sub_categories' | 'user_id'>> }) => {
            const { data: response } = await api.patch<Category>(`/categories/${id}`, data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category updated');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to update category');
        }
    });
};

export const useUpdateSubCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<Omit<SubCategory, 'id' | 'user_id' | 'category_id'>> }) => {
            const { data: response } = await api.patch<SubCategory>(`/categories/sub-categories/${id}`, data);
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Subcategory updated');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to update subcategory');
        }
    });
};
