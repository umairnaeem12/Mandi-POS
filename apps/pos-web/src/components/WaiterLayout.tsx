import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, ReceiptText } from 'lucide-react';
import { OperationalTopbar } from '@/components/OperationalTopbar';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/waiter/tables', label: 'Tables', icon: LayoutGrid },
  { to: '/waiter/orders', label: 'My Orders', icon: ReceiptText },
];

export function WaiterLayout() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <OperationalTopbar
        title="Point of Sale"
        nav={NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <n.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{n.label}</span>
          </NavLink>
        ))}
      />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-[1600px] animate-fade-in p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
