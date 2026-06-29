// Runtime-configurable backend URL. Defaults to build-time env, but can be
// overridden at runtime (stored in localStorage) so the Tauri/tablet build can
// point at the cashier PC's LAN address, e.g. http://192.168.1.10:4000/api.

const STORAGE_KEY = 'serverApiUrl';
const ENV_API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export function getApiUrl(): string {
  return localStorage.getItem(STORAGE_KEY) ?? ENV_API;
}

// Uploads + sockets live at the backend root (API URL without trailing /api).
export function getServerRoot(): string {
  return getApiUrl().replace(/\/api\/?$/, '');
}

export function getSocketUrl(): string {
  return import.meta.env.VITE_SOCKET_URL ?? getServerRoot();
}

export function setApiUrl(url: string): void {
  const trimmed = url.trim().replace(/\/$/, '');
  if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
  else localStorage.removeItem(STORAGE_KEY);
}
