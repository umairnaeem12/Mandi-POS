import { create } from 'zustand';
import { api } from '@/lib/axios';
import { tokenStorage } from '@/lib/tokenStorage';
import { disconnectSocket } from '@/lib/socket';
import type { AuthUser, TokenPair } from '@/types';

type Status = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

// Legacy key from the old demo build — cleared on boot so a stale value can't
// keep the app in the removed demo mode.
const LEGACY_DEMO_KEY = 'demoAuthUser';

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

  // Authenticate against the real backend, store tokens, then load the user.
  login: async (identifier, password) => {
    set({ status: 'loading' });
    try {
      const { data: tokens } = await api.post<TokenPair>('/auth/login', { identifier, password });
      tokenStorage.set(tokens);
      const { data: user } = await api.get<AuthUser>('/auth/me');
      set({ user, status: 'authenticated' });
    } catch (err) {
      tokenStorage.clear();
      set({ user: null, status: 'unauthenticated' });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefresh();
    disconnectSocket();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // Ignore logout errors — clear the local session regardless.
      }
    }
    tokenStorage.clear();
    set({ user: null, status: 'unauthenticated' });
  },

  // Restore session on app load using the stored access/refresh tokens.
  bootstrap: async () => {
    localStorage.removeItem(LEGACY_DEMO_KEY);
    if (!tokenStorage.getAccess()) {
      set({ status: 'unauthenticated' });
      return;
    }
    try {
      // The axios interceptor transparently refreshes an expired access token.
      const { data: user } = await api.get<AuthUser>('/auth/me');
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
