import { api } from '@/lib/axios';

export type Availability = 'AVAILABLE' | 'OUT_OF_STOCK' | 'INACTIVE';

export interface MenuItem {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  categoryId: string;
  category: { id: string; name: string; nameAr?: string | null };
  price: string; // Prisma Decimal serialized as string
  imageUrl?: string | null;
  isAvailable: boolean;
  isOutOfStock: boolean;
  preparationTimeMinutes?: number | null;
  sortOrder: number;
}

export interface MenuItemInput {
  name: string;
  nameAr?: string;
  categoryId: string;
  price: number;
  description?: string;
  preparationTimeMinutes?: number;
  sortOrder?: number;
}

export const menuItemsApi = {
  list: (params: { categoryId?: string; availableOnly?: boolean } = {}) =>
    api.get<MenuItem[]>('/menu-items', { params }).then((r) => r.data),
  create: (input: MenuItemInput) => api.post<MenuItem>('/menu-items', input).then((r) => r.data),
  update: (id: string, input: Partial<MenuItemInput>) =>
    api.patch<MenuItem>(`/menu-items/${id}`, input).then((r) => r.data),
  setAvailability: (id: string, status: Availability) =>
    api.patch<MenuItem>(`/menu-items/${id}/availability`, { status }).then((r) => r.data),
  uploadImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<MenuItem>(`/menu-items/${id}/image`, fd).then((r) => r.data);
  },
  remove: (id: string) => api.delete(`/menu-items/${id}`).then((r) => r.data),
};
