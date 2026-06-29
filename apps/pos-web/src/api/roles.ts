import { api } from '@/lib/axios';
import type { Permission, Role } from '@/types';

export const rolesApi = {
  list: () => api.get<Role[]>('/roles').then((r) => r.data),
  create: (input: { name: string; description?: string; permissions?: string[] }) =>
    api.post<Role>('/roles', input).then((r) => r.data),
  update: (id: string, input: { name?: string; description?: string; permissions?: string[] }) =>
    api.patch<Role>(`/roles/${id}`, input).then((r) => r.data),
  setPermissions: (id: string, permissions: string[]) =>
    api.post<Role>(`/roles/${id}/permissions`, { permissions }).then((r) => r.data),
  remove: (id: string) => api.delete(`/roles/${id}`).then((r) => r.data),
};

export const permissionsApi = {
  list: () => api.get<Permission[]>('/permissions').then((r) => r.data),
};
