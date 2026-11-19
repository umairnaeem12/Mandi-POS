import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { History, Plus, Search, Trash2, Users } from 'lucide-react';
import { customersApi, type Customer, type CustomerInput } from '@/api/customers';
import { useRestaurant } from '@/hooks/useRestaurant';
import { formatDate, formatMoney } from '@/lib/format';
import { orderStatusVariant } from '@/lib/status';
import { useLang } from '@/stores/lang.store';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { TableSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CustomerOrder {
  id: string;
  orderNumber: string;
  grandTotal: string;
  status: string;
  createdAt: string;
  invoice?: { invoiceNumber: string } | null;
}

export function CustomersPage() {
  const qc = useQueryClient();
  const { currency } = useRestaurant();
  const { t, tEnum } = useLang();
  const list = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['customers'] });

  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [historyFor, setHistoryFor] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');

  const history = useQuery({
    queryKey: ['customer-orders', historyFor?.id],
    queryFn: () => customersApi.orders(historyFor!.id) as Promise<CustomerOrder[]>,
    enabled: !!historyFor,
  });

  const onError = (e: unknown) =>
    toast.error(
      e instanceof AxiosError
        ? ((e.response?.data as { message?: string })?.message ?? t('common.somethingWentWrong'))
        : t('common.somethingWentWrong'),
    );

  const createMut = useMutation({
    mutationFn: (input: CustomerInput) => customersApi.create(input),
    onSuccess: () => { toast.success(t('customers.customerAdded')); setFormOpen(false); invalidate(); },
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => { toast.success(t('customers.customerDeleted')); setDeleting(null); invalidate(); },
    onError,
  });

  const money = (v: string | number) => formatMoney(v, currency);
  const customers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data ?? []).filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.contactNumber?.toLowerCase().includes(q),
    );
  }, [list.data, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('shell.navCustomers')}
        description={t('customers.subtitle')}
        actions={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> {t('customers.addCustomer')}</Button>}
      />

      <div className="relative sm:w-80">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('customers.searchPlaceholder')} className="ps-9" />
      </div>

      {list.isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title={t('customers.emptyTitle')} description={t('customers.emptyDesc')} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t('common.name')}</TH>
              <TH>{t('customers.contact')}</TH>
              <TH>{t('common.orders')}</TH>
              <TH>{t('customers.totalSpent')}</TH>
              <TH>{t('customers.lastOrder')}</TH>
              <TH className="text-end">{t('common.actions')}</TH>
            </TR>
          </THead>
          <TBody>
            {customers.map((c) => (
              <TR key={c.id} className="hover:bg-accent/40">
                <TD className="font-medium text-foreground">{c.name}</TD>
                <TD className="text-muted-foreground"><span dir="ltr">{c.contactNumber ?? '—'}</span></TD>
                <TD className="text-muted-foreground">{c.totalOrders ?? 0}</TD>
                <TD className="font-semibold">{money(c.totalSpent ?? 0)}</TD>
                <TD className="text-muted-foreground">{c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}</TD>
                <TD className="text-end">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setHistoryFor(c)} title={t('customers.orderHistory')}>
                      <History className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* Add form */}
      <CustomerForm open={formOpen} pending={createMut.isPending} onOpenChange={setFormOpen} onSubmit={(v) => createMut.mutate(v)} />

      {/* History */}
      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('customers.historyTitle', { name: historyFor?.name ?? '' })}</DialogTitle>
          </DialogHeader>
          {history.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>
          ) : (history.data?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('customers.noOrders')}</p>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto scrollbar-thin">
              {history.data?.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <div className="font-medium text-foreground">{o.orderNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(o.createdAt)}{o.invoice ? ` · ${o.invoice.invoiceNumber}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={orderStatusVariant[o.status] ?? 'secondary'}>{tEnum('orderStatus', o.status)}</Badge>
                    <span className="font-semibold">{money(o.grandTotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('customers.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('customers.deleteDesc')}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleting) deleteMut.mutate(deleting.id); }}
      />
    </div>
  );
}

function CustomerForm({
  open,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: CustomerInput) => void;
}) {
  const { t } = useLang();
  const { register, handleSubmit, reset } = useForm<CustomerInput>({ defaultValues: { name: '', contactNumber: '', email: '' } });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('customers.addCustomer')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => onSubmit(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t('common.name')}</Label>
            <Input id="name" {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact">{t('customers.contact')}</Label>
              <Input id="contact" dir="ltr" {...register('contactNumber')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input id="email" dir="ltr" type="email" {...register('email')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={pending}>{pending ? t('customers.adding') : t('common.add')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
