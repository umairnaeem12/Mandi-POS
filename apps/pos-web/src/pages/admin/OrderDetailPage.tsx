import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  ArrowLeft,
  Ban,
  CircleDot,
  Clock,
  Hash,
  Receipt,
  User,
  Utensils,
} from 'lucide-react';
import { ordersApi, type Order } from '@/api/orders';
import { useSocketEvent } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth.store';
import { t as tNow, useLang } from '@/stores/lang.store';
import { useRestaurant } from '@/hooks/useRestaurant';
import { formatDateTime, formatMoney, formatTime } from '@/lib/format';
import { OPEN_ORDER_STATUSES, orderStatusVariant } from '@/lib/status';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { currency } = useRestaurant();
  const { dn, t, tEnum } = useLang();
  const money = (v: string | number) => formatMoney(v, currency);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['order', orderId] });
  useSocketEvent('order.status_changed', refresh);
  useSocketEvent('order.updated', refresh);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const cancelMut = useMutation({
    mutationFn: () => ordersApi.cancel(orderId, reason.trim()),
    onSuccess: () => {
      toast.success(tNow('orders.cancelled'));
      setCancelOpen(false);
      setReason('');
      refresh();
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? tNow('orders.actionFailed')) : tNow('orders.actionFailed'),
      ),
  });

  if (isLoading) return <OrderDetailSkeleton />;
  if (!order) return <p className="text-destructive">{t('orders.notFound')}</p>;

  const open = OPEN_ORDER_STATUSES.includes(order.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/orders')} aria-label={t('common.back')}>
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
              <Badge variant={orderStatusVariant[order.status]}>{tEnum('orderStatus', order.status)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t('orders.createdOn', { date: formatDateTime(order.createdAt) })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPermission('generate_invoice') && open && (
            <Button onClick={() => navigate(`/admin/billing/${order.id}`)}>
              <Receipt className="h-4 w-4" /> {t('orders.generateBill')}
            </Button>
          )}
          {hasPermission('cancel_order') && open && (
            <Button variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)}>
              <Ban className="h-4 w-4" /> {t('common.cancel')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: items + summary */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-primary" /> {t('common.items')}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {t('orders.itemCount', { n: order.items.reduce((s, i) => s + i.quantity, 0) })}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40 text-start text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2">{t('common.item')}</th>
                    <th className="px-5 py-2 text-center">{t('common.qty')}</th>
                    <th className="px-5 py-2 text-end">{t('orders.unitPrice')}</th>
                    <th className="px-5 py-2 text-end">{t('common.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-foreground">{dn(i.itemName, i.itemNameAr)}</div>
                        {i.notes && <div className="text-xs italic text-warning-foreground"><span className="inline-block rtl:-scale-x-100">↳</span> {i.notes}</div>}
                      </td>
                      <td className="px-5 py-2.5 text-center tabular-nums">{i.quantity}</td>
                      <td className="px-5 py-2.5 text-end text-muted-foreground tabular-nums">{money(i.unitPrice)}</td>
                      <td className="px-5 py-2.5 text-end font-medium tabular-nums">{money(i.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1.5 border-t p-5 text-sm">
                <Row label={t('common.subtotal')} value={money(order.subtotal)} />
                {Number(order.discountAmount) > 0 && <Row label={t('common.discount')} value={`- ${money(order.discountAmount)}`} />}
                {Number(order.taxAmount) > 0 && <Row label={t('common.tax')} value={money(order.taxAmount)} />}
                <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                  <span>{t('orders.grandTotal')}</span>
                  <span className="text-primary">{money(order.grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> {t('orders.timeline')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline order={order} />
            </CardContent>
          </Card>
        </div>

        {/* Right: meta */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t('common.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Meta icon={Hash} label={t('common.orderType')} value={tEnum('orderType', order.orderType)} />
              <Meta icon={Utensils} label={t('common.table')} value={order.table ? `${order.table.name} (#${order.table.tableNumber})` : '—'} />
              <Meta icon={CircleDot} label={t('common.status')} value={<Badge variant={orderStatusVariant[order.status]}>{tEnum('orderStatus', order.status)}</Badge>} />
              <Meta icon={Clock} label={t('common.createdAt')} value={formatDateTime(order.createdAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> {t('common.customer')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.customer ? (
                <>
                  <Meta icon={User} label={t('common.name')} value={order.customer.name} />
                  {order.customer.contactNumber && <Meta icon={Hash} label={t('orders.contact')} value={order.customer.contactNumber} />}
                </>
              ) : (
                <p className="text-muted-foreground">{t('orders.noCustomer')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={(o) => { setCancelOpen(o); if (!o) setReason(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('orders.cancelTitle', { order: order.orderNumber })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('orders.cancelReasonPrompt')}</p>
          <Textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('orders.reasonPlaceholder')} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>{t('orders.keepOrder')}</Button>
            <Button variant="destructive" disabled={!reason.trim() || cancelMut.isPending} onClick={() => cancelMut.mutate()}>
              {cancelMut.isPending ? t('orders.cancelling') : t('orders.cancelOrder')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Timeline({ order }: { order: Order }) {
  const { tEnum } = useLang();
  const logs = order.statusLogs ?? [];
  const events = logs.length
    ? logs
    : [{ status: order.status, createdAt: order.createdAt, note: null as string | null }];
  return (
    <ol className="relative ms-2 space-y-5 border-s ps-6">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -start-[27px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-primary bg-card" />
          <div className="flex items-center gap-2">
            <Badge variant={orderStatusVariant[e.status]}>{tEnum('orderStatus', e.status)}</Badge>
            <span className="text-xs text-muted-foreground">{formatTime(e.createdAt)}</span>
          </div>
          {e.note && <p className="mt-1 text-sm text-muted-foreground">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="text-end font-medium text-foreground">{value}</span>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
