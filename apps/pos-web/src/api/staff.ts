import { api } from '@/lib/axios';
import type { Staff } from '@/types';

export interface CreateStaffInput {
  fullName: string;
  email: string;
  username: string;
  password: string;
  roleId: string;
  phoneNumber?: string;
}

export type UpdateStaffInput = Partial<Omit<CreateStaffInput, 'password'>> & { password?: string };

export const staffApi = {
  list: () => api.get<Staff[]>('/staff').then((r) => r.data),
  get: (id: string) => api.get<Staff>(`/staff/${id}`).then((r) => r.data),
  create: (input: CreateStaffInput) => api.post<Staff>('/staff', input).then((r) => r.data),
  update: (id: string, input: UpdateStaffInput) =>
    api.patch<Staff>(`/staff/${id}`, input).then((r) => r.data),
  setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    api.patch<Staff>(`/staff/${id}/status`, { status }).then((r) => r.data),
  remove: (id: string) => api.delete(`/staff/${id}`).then((r) => r.data),
};
