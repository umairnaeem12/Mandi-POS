import { create } from 'zustand';
import { authApi } from '@/api/auth';
import { tokenStorage } from '@/lib/tokenStorage';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { AuthUser } from '@/types';

type Status = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: Status;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',

  login: async (identifier, password) => {
    const tokens = await authApi.login(identifier, password);
    tokenStorage.set(tokens);
    const user = await authApi.me();
    connectSocket(tokens.accessToken);
    set({ user, status: 'authenticated' });
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefresh();
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
    disconnectSocket();
    tokenStorage.clear();
    set({ user: null, status: 'unauthenticated' });
  },

  // Restore session on app load using the stored access/refresh tokens.
  bootstrap: async () => {
    const access = tokenStorage.getAccess();
    if (!access && !tokenStorage.getRefresh()) {
      set({ status: 'unauthenticated' });
      return;
    }
    set({ status: 'loading' });
    try {
      const user = await authApi.me();
      if (access) connectSocket(access);
      set({ user, status: 'authenticated' });
    } catch {
      tokenStorage.clear();
      set({ user: null, status: 'unauthenticated' });
    }
  },

  hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
}));

// Forced logout from the axios interceptor when refresh fails.
window.addEventListener('auth:logout', () => {
  tokenStorage.clear();
  useAuthStore.setState({ user: null, status: 'unauthenticated' });
});
