import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

interface Props {
  children: ReactNode;
  permission?: string; // optional permission gate
}

export function ProtectedRoute({ children, permission }: Props) {
  const location = useLocation();
  const { status, hasPermission } = useAuthStore();

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-slate-600">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="text-sm text-slate-400">You don't have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
