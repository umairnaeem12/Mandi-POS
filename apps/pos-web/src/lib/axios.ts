import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './tokenStorage';
import { getApiUrl } from './config';
import { getDemoAdapter } from './demoApi';
import type { TokenPair } from '@/types';

const baseURL = getApiUrl();
const missingApiUrlMessage =
  'Backend API URL is not configured. Open Server settings and enter your deployed backend API URL.';

export const api = axios.create({ baseURL });

// Backend wraps responses as { success, data }. Unwrap to data for callers.
api.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
});

// Attach access token.
api.interceptors.request.use((config) => {
  const demoAdapter = getDemoAdapter();
  if (demoAdapter) {
    config.adapter = demoAdapter;
    return config;
  }

  if (!baseURL) {
    return Promise.reject(new Error(missingApiUrlMessage));
  }

  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 401 → refresh → retry (single in-flight refresh) ---
let refreshing: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return null;
  try {
    // Use a bare axios call so this isn't intercepted/looped.
    const res = await axios.post<{ success: boolean; data: TokenPair }>(
      `${baseURL}/auth/refresh`,
      { refreshToken },
    );
    const pair = res.data.data;
    tokenStorage.set(pair);
    return pair.accessToken;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url ?? '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      refreshing = refreshing ?? performRefresh();
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Refresh failed → force re-login.
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);
