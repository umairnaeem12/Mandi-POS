import type { BadgeProps } from '@/components/ui/badge';

type Variant = NonNullable<BadgeProps['variant']>;

export const orderStatusVariant: Record<string, Variant> = {
  PENDING: 'warning',
  PREPARING: 'info',
  SERVED: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

export const paymentStatusVariant: Record<string, Variant> = {
  UNPAID: 'secondary',
  PARTIAL: 'warning',
  PAID: 'success',
  REFUNDED: 'destructive',
};

export const tableStatusVariant: Record<string, Variant> = {
  AVAILABLE: 'success',
  OCCUPIED: 'default',
  RESERVED: 'warning',
  CLEANING: 'secondary',
};

export const ORDER_STATUSES = ['PENDING', 'PREPARING', 'SERVED', 'COMPLETED', 'CANCELLED'] as const;
export const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'] as const;

// Order statuses that are still "open" (billable / cancellable).
export const OPEN_ORDER_STATUSES = ['PENDING', 'PREPARING', 'SERVED'];
