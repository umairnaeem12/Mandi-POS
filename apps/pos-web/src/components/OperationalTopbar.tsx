import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UtensilsCrossed } from 'lucide-react';
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

// Header for full-screen role views (POS / Kitchen) that don't use the admin sidebar.
export function OperationalTopbar({ title, nav }: { title: string; nav?: ReactNode }) {
  const { user, logout } = useAuthStore();
  const { name, logoUrl } = useRestaurant();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 md:px-6">
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

      <div className="ml-auto flex items-center gap-3">
        <Clock />
        <LangToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-accent">
              <Avatar>
                <AvatarFallback>{initials(user?.fullName)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <div className="max-w-[140px] truncate text-sm font-medium leading-tight text-foreground">
                  {user?.fullName}
                </div>
                <div className="text-[11px] text-muted-foreground">{user?.roleName}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.fullName}</span>
                <Badge variant="default" className="mt-1.5 w-fit">
                  {user?.roleName}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
