import { create } from 'zustand';
import { authApi } from '@/api/auth';
import { tokenStorage } from '@/lib/tokenStorage';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { AuthUser } from '@/types';

type Status = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

const DEMO_SESSION_KEY = 'demoAuthUser';
const DEMO_IDENTIFIER = 'admin@restaurant.local';
const DEMO_PASSWORD = 'admin123';
const DEMO_USER: AuthUser = {
  id: 'demo-admin',
  restaurantId: 'demo-restaurant',
  roleId: 'demo-admin-role',
  roleName: 'Admin',
  fullName: 'Demo Admin',
  email: DEMO_IDENTIFIER,
  username: 'admin',
  permissions: [
    'view_dashboard',
    'create_order',
    'update_order_status',
    'generate_invoice',
    'view_inventory',
    'view_orders',
    'cancel_order',
    'manage_restaurant_settings',
  ],
};

function getDemoUser(): AuthUser | null {
  const raw = localStorage.getItem(DEMO_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(DEMO_SESSION_KEY);
    return null;
  }
}

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
    if (identifier.trim().toLowerCase() === DEMO_IDENTIFIER && password === DEMO_PASSWORD) {
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(DEMO_USER));
      tokenStorage.clear();
      set({ user: DEMO_USER, status: 'authenticated' });
      return;
    }

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
    localStorage.removeItem(DEMO_SESSION_KEY);
    set({ user: null, status: 'unauthenticated' });
  },

  // Restore session on app load using the stored access/refresh tokens.
  bootstrap: async () => {
    const demoUser = getDemoUser();
    if (demoUser) {
      set({ user: demoUser, status: 'authenticated' });
      return;
    }

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
  localStorage.removeItem(DEMO_SESSION_KEY);
  useAuthStore.setState({ user: null, status: 'unauthenticated' });
});
