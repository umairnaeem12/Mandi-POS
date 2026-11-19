import type { ComponentType } from 'react';
import type { TKey } from '@/i18n';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  LayoutGrid,
  ReceiptText,
  FileText,
  Users,
  UtensilsCrossed,
  Tags,
  Boxes,
  UserCog,
  ShieldCheck,
  BarChart3,
  Settings,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: TKey;
  icon: ComponentType<{ className?: string }>;
  perm: string;
}

export interface NavGroup {
  heading: TKey;
  items: NavItem[];
}

// Single source of truth for the admin/manager sidebar. Operational screens
// (POS, Kitchen, Tables) live in their own full-screen layouts but are linked here.
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'shell.groupOverview',
    items: [{ to: '/admin/dashboard', label: 'shell.navDashboard', icon: LayoutDashboard, perm: 'view_dashboard' }],
  },
  {
    heading: 'shell.groupOperations',
    items: [
      { to: '/waiter/tables', label: 'shell.navPos', icon: ShoppingCart, perm: 'create_order' },
      { to: '/kitchen/orders', label: 'shell.navKitchen', icon: ChefHat, perm: 'update_order_status' },
      { to: '/admin/tables', label: 'shell.navTables', icon: LayoutGrid, perm: 'manage_restaurant_settings' },
      { to: '/admin/orders', label: 'shell.navOrders', icon: ReceiptText, perm: 'view_orders' },
      { to: '/admin/invoices', label: 'shell.navInvoices', icon: FileText, perm: 'search_invoices' },
      { to: '/admin/customers', label: 'shell.navCustomers', icon: Users, perm: 'manage_customers' },
    ],
  },
  {
    heading: 'shell.groupCatalog',
    items: [
      { to: '/admin/menu-items', label: 'shell.navMenu', icon: UtensilsCrossed, perm: 'manage_menu_items' },
      { to: '/admin/categories', label: 'shell.navCategories', icon: Tags, perm: 'manage_categories' },
      { to: '/admin/inventory', label: 'shell.navInventory', icon: Boxes, perm: 'view_inventory' },
    ],
  },
  {
    heading: 'shell.groupPeople',
    items: [
      { to: '/admin/staff', label: 'shell.navStaff', icon: UserCog, perm: 'manage_staff' },
      { to: '/admin/roles', label: 'shell.navRoles', icon: ShieldCheck, perm: 'manage_roles' },
    ],
  },
  {
    heading: 'shell.groupInsights',
    items: [{ to: '/admin/reports', label: 'shell.navReports', icon: BarChart3, perm: 'view_reports' }],
  },
  {
    heading: 'shell.groupSystem',
    items: [
      { to: '/admin/restaurant-settings', label: 'shell.navSettings', icon: Settings, perm: 'manage_restaurant_settings' },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// Resolve the best page title for the current path (longest matching prefix).
export function pageTitleForPath(path: string): TKey {
  const match = ALL_NAV_ITEMS.filter((i) => path.startsWith(i.to)).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];
  return match?.label ?? 'shell.appName';
}
