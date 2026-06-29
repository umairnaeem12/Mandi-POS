import { api } from '@/lib/axios';

export interface Customer {
  id: string;
  name: string;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  totalOrders?: number;
  totalSpent?: string;
  lastOrderAt?: string | null;
}

export interface CustomerInput {
  name: string;
  contactNumber?: string;
  email?: string;
  address?: string;
}

export const customersApi = {
  list: () => api.get<Customer[]>('/customers').then((r) => r.data),
  get: (id: string) => api.get<Customer>(`/customers/${id}`).then((r) => r.data),
  orders: (id: string) => api.get(`/customers/${id}/orders`).then((r) => r.data),
  create: (input: CustomerInput) => api.post<Customer>('/customers', input).then((r) => r.data),
  update: (id: string, input: Partial<CustomerInput>) =>
    api.patch<Customer>(`/customers/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete(`/customers/${id}`).then((r) => r.data),
};
