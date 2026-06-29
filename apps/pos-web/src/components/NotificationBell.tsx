import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { dashboardApi } from '@/api/dashboard';
import { useAuthStore } from '@/stores/auth.store';
import { useSocketEvent } from '@/lib/socket';
import { timeAgo } from '@/lib/format';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NotificationBell() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const enabled = hasPermission('view_dashboard');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: dashboardApi.recentActivities,
    enabled,
  });

  useSocketEvent('dashboard.recent_activity_created', () => {
    if (enabled) qc.invalidateQueries({ queryKey: ['dashboard-activities'] });
  });

  if (!enabled) return null;
  const activities = (data ?? []).slice(0, 8);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-5 w-5" />
          {activities.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {activities.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">You're all caught up</div>
        ) : (
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {activities.map((a) => (
              <div key={a.id} className="flex flex-col gap-0.5 rounded-sm px-2 py-2 hover:bg-accent">
                <span className="text-sm text-foreground">{a.description}</span>
                <span className="text-[11px] text-muted-foreground">
                  {a.module} · {timeAgo(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
