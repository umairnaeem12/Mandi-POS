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
import { tablePhoto } from '@/lib/tablePhotos';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';

// `badge` is the on-white variant; `onPhoto` is the solid fill used over the
// card's photo banner, where a translucent tint would wash out.
const STATUS: Record<
  TableStatus,
  { label: string; card: string; dot: string; badge: string; onPhoto: string }
> = {
  AVAILABLE: {
    label: 'Available',
    card: 'border-success/30 hover:border-success/60',
    dot: 'bg-success',
    badge: 'bg-success/10 text-success',
    onPhoto: 'bg-success text-success-foreground',
  },
  OCCUPIED: {
    label: 'Occupied',
    card: 'border-primary/40 hover:border-primary/70 bg-primary/[0.03]',
    dot: 'bg-primary',
    badge: 'bg-primary/10 text-primary',
    onPhoto: 'bg-primary text-primary-foreground',
  },
  RESERVED: {
    label: 'Reserved',
    card: 'border-warning/40 hover:border-warning/70',
    dot: 'bg-warning',
    badge: 'bg-warning/15 text-warning-foreground',
    onPhoto: 'bg-warning text-warning-foreground',
  },
  CLEANING: {
    label: 'Cleaning',
    card: 'border-border hover:border-slate-400',
    dot: 'bg-slate-400',
    badge: 'bg-muted text-muted-foreground',
    onPhoto: 'bg-slate-600 text-white',
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
        'flex flex-col overflow-hidden rounded-xl border-2 bg-card text-left shadow-card transition-shadow hover:shadow-card-hover',
        st.card,
      )}
    >
      {/* Photo banner with the table identity laid over it. */}
      <div className="relative h-28 w-full overflow-hidden bg-muted">
        <img
          src={tablePhoto(table.tableNumber)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5">
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-white drop-shadow">{table.name}</div>
            <div className="flex items-center gap-1 text-xs text-white/90 drop-shadow">
              <Users className="h-3 w-3" /> {table.capacity} seats
            </div>
          </div>
          {/* Solid fill — the translucent card badge is unreadable over a photo. */}
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', st.onPhoto)}>
            {st.label}
          </span>
        </div>
      </div>

      {order ? (
        <div className="space-y-1 p-3 text-xs">
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
        <div className="p-3 text-xs text-muted-foreground">Tap to start an order</div>
      )}
    </motion.button>
  );
}
