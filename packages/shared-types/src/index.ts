// Shared enums & types used by both backend and frontend.
// Keep in sync with prisma enums as they are added in later phases.

export const PERMISSIONS = [
  'manage_restaurant_settings',
  'view_dashboard',
  'manage_staff',
  'manage_roles',
  'manage_permissions',
  'manage_categories',
  'manage_menu_items',
  'manage_inventory',
  'view_inventory',
  'create_order',
  'update_order',
  'cancel_order',
  'view_orders',
  'send_order_to_kitchen',
  'update_order_status',
  'generate_invoice',
  'apply_discount',
  'receive_payment',
  'print_receipt',
  'manage_customers',
  'view_reports',
  'search_invoices',
  'view_recent_activities',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type OrderStatus = 'PENDING' | 'PREPARING' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE' | 'SPLIT';
export type DiscountType = 'FIXED' | 'PERCENTAGE';
