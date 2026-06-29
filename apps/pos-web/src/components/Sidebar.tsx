import { NavLink } from 'react-router-dom';
import { UtensilsCrossed, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useRestaurant } from '@/hooks/useRestaurant';
import { assetUrl } from '@/lib/assets';
import { NAV_GROUPS } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { name, logoUrl } = useRestaurant();

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => hasPermission(i.perm)),
  })).filter((g) => g.items.length > 0);

  const content = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className={cn('flex h-16 items-center gap-3 border-b border-sidebar-border px-4', collapsed && 'justify-center px-0')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-accent">
          {logoUrl ? (
            <img src={assetUrl(logoUrl)} alt="" className="h-full w-full object-cover" />
          ) : (
            <UtensilsCrossed className="h-5 w-5 text-white" />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight">{name}</div>
            <div className="text-[11px] text-sidebar-muted">Point of Sale</div>
          </div>
        )}
        <button
          onClick={onCloseMobile}
          className="ml-auto rounded-md p-1.5 text-sidebar-muted hover:bg-white/10 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-3 py-4">
          {groups.map((group) => (
            <div key={group.heading}>
              {!collapsed && (
                <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
                  {group.heading}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-sidebar-accent text-white shadow-sm'
                            : 'text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground',
                        )
                      }
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                  return collapsed ? (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </TooltipProvider>

      {!collapsed && (
        <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-muted">
          v0.1.0 · Local network
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'hidden shrink-0 transition-all duration-200 lg:block',
          collapsed ? 'w-[68px]' : 'w-60',
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', mobileOpen ? '' : 'pointer-events-none')}>
        <div
          className={cn(
            'absolute inset-0 bg-slate-900/50 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onCloseMobile}
        />
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-64 transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {content}
        </div>
      </div>
    </>
  );
}
