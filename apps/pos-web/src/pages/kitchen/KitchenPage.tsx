import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChefHat, Clock, Flame, UtensilsCrossed } from 'lucide-react';
import { kitchenApi } from '@/api/kitchen';
import type { Order, OrderStatus } from '@/api/orders';
import { joinRoom, useSocketEvent } from '@/lib/socket';
import { useLang } from '@/stores/lang.store';
import { minutesSince } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/Button';
import { OperationalTopbar } from '@/components/OperationalTopbar';

type KitchenStatus = 'PENDING' | 'PREPARING' | 'SERVED';

const COLUMNS: {
  title: string;
  status: KitchenStatus;
  icon: typeof Clock;
  accent: string;
  headBg: string;
  action?: { label: string; to: 'PREPARING' | 'SERVED' };
}[] = [
  {
    title: 'New Orders',
    status: 'PENDING',
    icon: Clock,
    accent: 'text-warning-foreground',
    headBg: 'bg-warning/15',
    action: { label: 'Start Cooking', to: 'PREPARING' },
  },
  {
    title: 'Cooking',
    status: 'PREPARING',
    icon: Flame,
    accent: 'text-info',
    headBg: 'bg-info/10',
    action: { label: 'Mark Ready / Served', to: 'SERVED' },
  },
  {
    title: 'Served',
    status: 'SERVED',
    icon: CheckCircle2,
    accent: 'text-success',
    headBg: 'bg-success/10',
  },
];

export function KitchenPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['kitchen-orders'], queryFn: kitchenApi.orders });

  useEffect(() => {
    joinRoom('join.kitchen');
  }, []);

  const refresh = () => qc.invalidateQueries({ queryKey: ['kitchen-orders'] });
  useSocketEvent('kitchen.new_order', () => {
    toast.info('New order received');
    refresh();
  });
  useSocketEvent('kitchen.order_updated', refresh);
  useSocketEvent('kitchen.order_status_changed', refresh);

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'PREPARING' | 'SERVED' }) =>
      kitchenApi.setStatus(id, status),
    onSuccess: refresh,
    onError: () => toast.error('Could not update order'),
  });

  const byStatus = (s: OrderStatus) => (data ?? []).filter((o) => o.status === s);

  return (
    <div className="flex h-screen flex-col bg-background">
      <OperationalTopbar title="Kitchen Display" />
      <main className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const orders = byStatus(col.status);
          return (
            <section key={col.status} className="flex min-h-0 flex-col rounded-xl border bg-muted/30">
              <div className={cn('flex items-center justify-between rounded-t-xl px-4 py-3', col.headBg)}>
                <div className="flex items-center gap-2">
                  <col.icon className={cn('h-4 w-4', col.accent)} />
                  <h2 className="text-sm font-semibold uppercase tracking-wide">{col.title}</h2>
                </div>
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-card px-1.5 text-xs font-bold">
                  {orders.length}
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin p-3">
                {isLoading && <div className="h-24 animate-pulse rounded-lg bg-muted" />}
                {!isLoading && orders.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                    <UtensilsCrossed className="h-7 w-7 opacity-40" />
                    <span className="text-sm">No orders</span>
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {orders.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      action={
                        col.action
                          ? {
                              label: col.action.label,
                              onClick: () => statusMut.mutate({ id: o.id, status: col.action!.to }),
                            }
                          : undefined
                      }
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function OrderCard({ order, action }: { order: Order; action?: { label: string; onClick: () => void } }) {
  const { dn } = useLang();
  const mins = minutesSince(order.createdAt);
  const urgent = mins >= 15 && order.status !== 'SERVED';
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-lg border bg-card p-3 shadow-card',
        urgent && 'border-destructive/50 ring-1 ring-destructive/20',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-bold text-foreground">
          <ChefHat className="h-4 w-4 text-primary" />
          {order.table ? order.table.name : 'Takeaway'}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            urgent ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
          )}
        >
          <Clock className="h-3 w-3" /> {mins}m
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {order.orderNumber} · {itemCount} item{itemCount === 1 ? '' : 's'}
      </div>

      <ul className="mt-2.5 space-y-1.5 border-t pt-2.5 text-sm">
        {order.items.map((i) => (
          <li key={i.id}>
            <div className="flex gap-2">
              <span className="font-bold text-primary tabular-nums">{i.quantity}×</span>
              <span className="text-foreground">{dn(i.itemName, i.itemNameAr)}</span>
            </div>
            {i.notes && <div className="ml-6 text-xs italic text-warning-foreground">↳ {i.notes}</div>}
          </li>
        ))}
      </ul>

      {action && (
        <Button className="mt-3 w-full" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
