import { api } from '@/lib/axios';
import type { AuthUser, TokenPair } from '@/types';

export const authApi = {
  login: (identifier: string, password: string) =>
    api.post<TokenPair>('/auth/login', { identifier, password }).then((r) => r.data),

  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
};
