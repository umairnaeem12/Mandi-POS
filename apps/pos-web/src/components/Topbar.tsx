import { useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut, Menu, PanelLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
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
import { NotificationBell } from '@/components/NotificationBell';

interface TopbarProps {
  title: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}

export function Topbar({ title, collapsed, onToggleCollapse, onOpenMobile }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur md:px-6">
      <button
        onClick={onOpenMobile}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        onClick={onToggleCollapse}
        className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:flex"
      >
        {collapsed ? <PanelLeft className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>

      <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <Clock />
        <LangToggle />
        <NotificationBell />

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
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                <Badge variant="default" className={cn('mt-1.5 w-fit')}>
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
