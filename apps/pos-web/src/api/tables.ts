import { api } from '@/lib/axios';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface RestaurantTable {
  id: string;
  name: string;
  tableNumber: number;
  capacity: number;
  status: TableStatus;
  activeOrder?: {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: string;
    createdAt: string;
  } | null;
}

export interface CreateTableInput {
  name: string;
  tableNumber: number;
  capacity?: number;
}

export const tablesApi = {
  list: () => api.get<RestaurantTable[]>('/tables').then((r) => r.data),
  get: (id: string) => api.get<RestaurantTable>(`/tables/${id}`).then((r) => r.data),
  create: (input: CreateTableInput) => api.post<RestaurantTable>('/tables', input).then((r) => r.data),
  update: (id: string, input: Partial<{ name: string; capacity: number }>) =>
    api.patch<RestaurantTable>(`/tables/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/tables/${id}`).then((r) => r.data),
  setStatus: (id: string, status: TableStatus) =>
    api.patch<RestaurantTable>(`/tables/${id}/status`, { status }).then((r) => r.data),
};
