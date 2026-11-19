import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, LogOut, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { useRestaurant } from '@/hooks/useRestaurant';
import { assetUrl } from '@/lib/assets';
import { initials } from '@/lib/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock } from '@/components/Clock';
import { LangToggle } from '@/components/LangToggle';
import { useLang } from '@/stores/lang.store';

// Header for full-screen role views (POS / Kitchen) that don't use the admin sidebar.
export function OperationalTopbar({ title, nav }: { title: string; nav?: ReactNode }) {
  const { user, logout, hasPermission } = useAuthStore();
  const { name, logoUrl } = useRestaurant();
  const navigate = useNavigate();
  const { t, tEnum } = useLang();
  // Admins and managers open POS/Kitchen from the sidebar and need a way back.
  const canOpenDashboard = hasPermission('view_dashboard');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex min-h-[4rem] shrink-0 items-center gap-4 border-b bg-card px-4 pt-[env(safe-area-inset-top)] md:px-6">
      {canOpenDashboard && (
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/dashboard" aria-label={t('shell.backToDashboard')}>
            <ArrowLeft className="rtl:-scale-x-100" />
            <span className="hidden sm:inline">{t('shell.navDashboard')}</span>
          </Link>
        </Button>
      )}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-primary">
          {logoUrl ? (
            <img src={assetUrl(logoUrl)} alt="" className="h-full w-full object-cover" />
          ) : (
            <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
          )}
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-bold leading-tight text-foreground">{name}</div>
          <div className="text-[11px] text-muted-foreground">{title}</div>
        </div>
      </div>

      {nav && <nav className="flex items-center gap-1">{nav}</nav>}

      <div className="ms-auto flex items-center gap-3">
        <Clock />
        <LangToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md p-1 pe-2 transition-colors hover:bg-accent">
              <Avatar>
                <AvatarFallback>{initials(user?.fullName)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-start sm:block">
                <div className="max-w-[140px] truncate text-sm font-medium leading-tight text-foreground">
                  {user?.fullName}
                </div>
                <div className="text-[11px] text-muted-foreground">{tEnum('role', user?.roleName)}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.fullName}</span>
                <Badge variant="default" className="mt-1.5 w-fit">
                  {tEnum('role', user?.roleName)}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canOpenDashboard && (
              <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
                <LayoutDashboard className="h-4 w-4" />
                {t('shell.navDashboard')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              {t('shell.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
