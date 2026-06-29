import { api } from '@/lib/axios';
import type { Order } from '@/api/orders';

export const kitchenApi = {
  orders: () => api.get<Order[]>('/kitchen/orders').then((r) => r.data),
  setStatus: (id: string, status: 'PREPARING' | 'SERVED') =>
    api.patch<Order>(`/kitchen/orders/${id}/status`, { status }).then((r) => r.data),
};
