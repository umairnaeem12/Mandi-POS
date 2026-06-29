import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { pageTitleForPath } from '@/lib/nav';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

const COLLAPSE_KEY = 'pos.sidebar.collapsed';

export function AdminLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const title = pageTitleForPath(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-[1600px] animate-fade-in p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
