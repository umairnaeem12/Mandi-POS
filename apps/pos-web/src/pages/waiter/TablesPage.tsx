import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, LayoutGrid, Users } from 'lucide-react';
import { tablesApi, type RestaurantTable, type TableStatus } from '@/api/tables';
import { useSocketEvent } from '@/lib/socket';
import { useRestaurant } from '@/hooks/useRestaurant';
import { formatMoney, minutesSince } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';

const STATUS: Record<TableStatus, { label: string; card: string; dot: string; badge: string }> = {
  AVAILABLE: {
    label: 'Available',
    card: 'border-success/30 hover:border-success/60',
    dot: 'bg-success',
    badge: 'bg-success/10 text-success',
  },
  OCCUPIED: {
    label: 'Occupied',
    card: 'border-primary/40 hover:border-primary/70 bg-primary/[0.03]',
    dot: 'bg-primary',
    badge: 'bg-primary/10 text-primary',
  },
  RESERVED: {
    label: 'Reserved',
    card: 'border-warning/40 hover:border-warning/70',
    dot: 'bg-warning',
    badge: 'bg-warning/15 text-warning-foreground',
  },
  CLEANING: {
    label: 'Cleaning',
    card: 'border-border hover:border-slate-400',
    dot: 'bg-slate-400',
    badge: 'bg-muted text-muted-foreground',
  },
};

const FILTERS: ('ALL' | TableStatus)[] = ['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'];

export function TablesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { currency } = useRestaurant();
  const [filter, setFilter] = useState<'ALL' | TableStatus>('ALL');
  const { data, isLoading } = useQuery({ queryKey: ['tables'], queryFn: tablesApi.list });

  const refresh = () => qc.invalidateQueries({ queryKey: ['tables'] });
  useSocketEvent('table.status_changed', refresh);
  useSocketEvent('order.created', refresh);
  useSocketEvent('order.status_changed', refresh);
  useSocketEvent('order.cancelled', refresh);

  const tables = data ?? [];
  const counts = (s: TableStatus) => tables.filter((t) => t.status === s).length;
  const visible = filter === 'ALL' ? tables : tables.filter((t) => t.status === filter);

  return (
    <div className="space-y-5">
      <PageHeader title="Tables" description="Select a table to start or view an order." />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f === 'ALL' ? tables.length : counts(f);
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
              )}
            >
              {f !== 'ALL' && <span className={cn('h-2 w-2 rounded-full', STATUS[f].dot)} />}
              {f === 'ALL' ? 'All' : STATUS[f].label}
              <span className={cn('rounded-full px-1.5 text-xs', active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <CardGridSkeleton count={8} />
      ) : visible.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No tables" description="No tables match this filter." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((t, i) => (
            <TableCard
              key={t.id}
              table={t}
              index={i}
              currency={currency}
              onClick={() => navigate(`/waiter/tables/${t.id}/order`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TableCard({
  table,
  index,
  currency,
  onClick,
}: {
  table: RestaurantTable;
  index: number;
  currency: string;
  onClick: () => void;
}) {
  const st = STATUS[table.status];
  const order = table.activeOrder;
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={cn(
        'flex flex-col rounded-xl border-2 bg-card p-4 text-left shadow-card transition-shadow hover:shadow-card-hover',
        st.card,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-bold text-foreground">{table.name}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" /> {table.capacity} seats
          </div>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', st.badge)}>{st.label}</span>
      </div>

      {order ? (
        <div className="mt-3 space-y-1 border-t pt-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{order.orderNumber}</span>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{order.status}</Badge>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {minutesSince(order.createdAt)}m
            </span>
            <span className="font-semibold text-primary">{formatMoney(order.grandTotal, currency)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">Tap to start an order</div>
      )}
    </motion.button>
  );
}
