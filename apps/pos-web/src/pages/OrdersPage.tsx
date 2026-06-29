import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Ban, Eye, Receipt, ReceiptText, Search } from 'lucide-react';
import { ordersApi, type Order, type OrderStatus } from '@/api/orders';
import { useSocketEvent } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth.store';
import { useLang } from '@/stores/lang.store';
import { useRestaurant } from '@/hooks/useRestaurant';
import { formatMoney, timeAgo } from '@/lib/format';
import { ORDER_STATUSES, OPEN_ORDER_STATUSES, orderStatusVariant } from '@/lib/status';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { TableSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const FILTERS: (OrderStatus | 'ALL')[] = ['ALL', ...ORDER_STATUSES];

export function OrdersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { currency } = useRestaurant();
  const { dn } = useLang();
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [reason, setReason] = useState('');

  const canView = hasPermission('view_orders');
  const canBill = hasPermission('generate_invoice');
  const canCancel = hasPermission('cancel_order');
  const money = (v: string | number) => formatMoney(v, currency);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => ordersApi.list(filter === 'ALL' ? {} : { status: filter }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['orders'] });
  useSocketEvent('order.created', refresh);
  useSocketEvent('order.updated', refresh);
  useSocketEvent('order.status_changed', refresh);
  useSocketEvent('order.cancelled', refresh);

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersApi.cancel(id, reason),
    onSuccess: () => {
      toast.success('Order cancelled');
      setCancelTarget(null);
      setReason('');
      refresh();
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? 'Failed') : 'Failed',
      ),
  });

  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.table?.name.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const openDetail = (o: Order) => canView && navigate(`/admin/orders/${o.id}`);

  return (
    <div className="space-y-5">
      <PageHeader title="Orders" description="Track and manage all orders." />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
              )}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, table, customer…"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : orders.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No orders found" description="Orders will appear here as they're created." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border bg-card shadow-card lg:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Table / Type</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => openDetail(o)}
                    className={cn('border-b last:border-0 transition-colors hover:bg-accent/50', canView && 'cursor-pointer')}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.table ? o.table.name : o.orderType.replace('_', ' ')}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-muted-foreground">
                      {o.items.map((i) => `${i.quantity}× ${dn(i.itemName, i.itemNameAr)}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{money(o.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={orderStatusVariant[o.status]}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(o.createdAt)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canView && (
                          <Button variant="ghost" size="icon-sm" onClick={() => openDetail(o)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {canBill && OPEN_ORDER_STATUSES.includes(o.status) && (
                          <Button size="sm" onClick={() => navigate(`/admin/billing/${o.id}`)}>
                            <Receipt className="h-3.5 w-3.5" /> Bill
                          </Button>
                        )}
                        {canCancel && OPEN_ORDER_STATUSES.includes(o.status) && (
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setCancelTarget(o)} title="Cancel">
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {orders.map((o) => (
              <div key={o.id} onClick={() => openDetail(o)} className="rounded-lg border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{o.orderNumber}</span>
                  <Badge variant={orderStatusVariant[o.status]}>{o.status}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {o.table ? o.table.name : o.orderType.replace('_', ' ')} · {timeAgo(o.createdAt)}
                </div>
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {o.items.map((i) => `${i.quantity}× ${dn(i.itemName, i.itemNameAr)}`).join(', ')}
                </div>
                <div className="mt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <span className="font-bold text-primary">{money(o.grandTotal)}</span>
                  <div className="flex gap-2">
                    {canBill && OPEN_ORDER_STATUSES.includes(o.status) && (
                      <Button size="sm" onClick={() => navigate(`/admin/billing/${o.id}`)}>Bill</Button>
                    )}
                    {canCancel && OPEN_ORDER_STATUSES.includes(o.status) && (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelTarget(o)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) { setCancelTarget(null); setReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {cancelTarget?.orderNumber}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Please provide a reason for cancelling this order.</p>
          <Textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer left, duplicate order…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelTarget(null); setReason(''); }}>
              Keep order
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || cancelMut.isPending}
              onClick={() => cancelTarget && cancelMut.mutate({ id: cancelTarget.id, reason: reason.trim() })}
            >
              {cancelMut.isPending ? 'Cancelling…' : 'Cancel order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
