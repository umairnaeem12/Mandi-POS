import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useLang } from '@/stores/lang.store';

interface Props {
  children: ReactNode;
  permission?: string; // optional permission gate
}

export function ProtectedRoute({ children, permission }: Props) {
  const location = useLocation();
  const { status, hasPermission } = useAuthStore();
  const { t } = useLang();

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">{t('common.loading')}</div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-slate-600">
        <h2 className="text-xl font-semibold">{t('shell.accessDenied')}</h2>
        <p className="text-sm text-slate-400">{t('shell.noPermission')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
