import type { AuthUser } from '@/types';

// Where to send a user after login, based on their permissions.
export function landingPath(user: AuthUser | null): string {
  if (!user) return '/login';
  const p = user.permissions;
  if (p.includes('view_dashboard')) return '/admin/dashboard';
  if (p.includes('create_order')) return '/waiter/tables';
  if (p.includes('update_order_status')) return '/kitchen/orders';
  if (p.includes('generate_invoice')) return '/admin/orders'; // cashier: bill from orders list
  if (p.includes('view_inventory')) return '/admin/inventory';
  if (p.includes('view_orders')) return '/admin/orders';
  return '/login';
}
