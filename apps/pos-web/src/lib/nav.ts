import type { ComponentType } from 'react';
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
  label: string;
  icon: ComponentType<{ className?: string }>;
  perm: string;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

// Single source of truth for the admin/manager sidebar. Operational screens
// (POS, Kitchen, Tables) live in their own full-screen layouts but are linked here.
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'view_dashboard' }],
  },
  {
    heading: 'Operations',
    items: [
      { to: '/waiter/tables', label: 'POS', icon: ShoppingCart, perm: 'create_order' },
      { to: '/kitchen/orders', label: 'Kitchen', icon: ChefHat, perm: 'update_order_status' },
      { to: '/admin/tables', label: 'Tables', icon: LayoutGrid, perm: 'manage_restaurant_settings' },
      { to: '/admin/orders', label: 'Orders', icon: ReceiptText, perm: 'view_orders' },
      { to: '/admin/invoices', label: 'Invoices', icon: FileText, perm: 'search_invoices' },
      { to: '/admin/customers', label: 'Customers', icon: Users, perm: 'manage_customers' },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { to: '/admin/menu-items', label: 'Menu', icon: UtensilsCrossed, perm: 'manage_menu_items' },
      { to: '/admin/categories', label: 'Categories', icon: Tags, perm: 'manage_categories' },
      { to: '/admin/inventory', label: 'Inventory', icon: Boxes, perm: 'view_inventory' },
    ],
  },
  {
    heading: 'People',
    items: [
      { to: '/admin/staff', label: 'Staff', icon: UserCog, perm: 'manage_staff' },
      { to: '/admin/roles', label: 'Roles', icon: ShieldCheck, perm: 'manage_roles' },
    ],
  },
  {
    heading: 'Insights',
    items: [{ to: '/admin/reports', label: 'Reports', icon: BarChart3, perm: 'view_reports' }],
  },
  {
    heading: 'System',
    items: [
      { to: '/admin/restaurant-settings', label: 'Settings', icon: Settings, perm: 'manage_restaurant_settings' },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// Resolve the best page title for the current path (longest matching prefix).
export function pageTitleForPath(path: string): string {
  const match = ALL_NAV_ITEMS.filter((i) => path.startsWith(i.to)).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];
  return match?.label ?? 'Restaurant POS';
}
