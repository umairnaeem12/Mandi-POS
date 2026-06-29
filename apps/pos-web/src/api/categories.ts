import { api } from '@/lib/axios';

export interface Category {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { menuItems: number };
}

export interface CategoryInput {
  name: string;
  nameAr?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const categoriesApi = {
  list: (includeInactive = false) =>
    api
      .get<Category[]>('/categories', { params: { includeInactive } })
      .then((r) => r.data),
  create: (input: CategoryInput) => api.post<Category>('/categories', input).then((r) => r.data),
  update: (id: string, input: Partial<CategoryInput>) =>
    api.patch<Category>(`/categories/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/categories/${id}`).then((r) => r.data),
};
