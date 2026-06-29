import { api } from '@/lib/axios';

export type OrderStatus = 'PENDING' | 'PREPARING' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
export type OrderType = 'DINE_IN' | 'TAKEAWAY';

export interface OrderItem {
  id: string;
  menuItemId?: string | null;
  itemName: string;
  itemNameAr?: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  tableId?: string | null;
  table?: { id: string; name: string; tableNumber: number } | null;
  customer?: { id: string; name: string; contactNumber?: string | null } | null;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  items: OrderItem[];
  statusLogs?: { status: OrderStatus; createdAt: string; note?: string | null }[];
  createdAt: string;
}

export interface CreateOrderInput {
  orderType: OrderType;
  tableId?: string;
  customerId?: string;
  items: { menuItemId: string; quantity: number; notes?: string }[];
}

export const ordersApi = {
  list: (params: { status?: OrderStatus; tableId?: string; active?: boolean } = {}) =>
    api.get<Order[]>('/orders', { params }).then((r) => r.data),
  get: (id: string) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  activeForTable: (tableId: string) =>
    api.get<Order | null>(`/orders/table/${tableId}/active`).then((r) => r.data),
  create: (input: CreateOrderInput) => api.post<Order>('/orders', input).then((r) => r.data),
  addItem: (id: string, item: { menuItemId: string; quantity: number; notes?: string }) =>
    api.post<Order>(`/orders/${id}/items`, item).then((r) => r.data),
  updateItem: (id: string, itemId: string, data: { quantity?: number; notes?: string }) =>
    api.patch<Order>(`/orders/${id}/items/${itemId}`, data).then((r) => r.data),
  removeItem: (id: string, itemId: string) =>
    api.delete<Order>(`/orders/${id}/items/${itemId}`).then((r) => r.data),
  setStatus: (id: string, status: OrderStatus) =>
    api.patch<Order>(`/orders/${id}/status`, { status }).then((r) => r.data),
  cancel: (id: string, reason: string) =>
    api.post<Order>(`/orders/${id}/cancel`, { reason }).then((r) => r.data),
};
