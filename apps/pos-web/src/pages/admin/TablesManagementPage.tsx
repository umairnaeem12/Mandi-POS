import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Clock, LayoutGrid, MoreVertical, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { tablesApi, type RestaurantTable, type TableStatus } from '@/api/tables';
import { useSocketEvent } from '@/lib/socket';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useAuthStore } from '@/stores/auth.store';
import { t as tr, useLang } from '@/stores/lang.store';
import { formatMoney, minutesSince } from '@/lib/format';
import { TABLE_STATUSES, tableStatusVariant } from '@/lib/status';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/Skeletons';
import { tablePhoto } from '@/lib/tablePhotos';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TableForm {
  name: string;
  tableNumber: number;
  capacity: number;
}

export function TablesManagementPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t, tEnum } = useLang();
  const { currency } = useRestaurant();
  const canManage = useAuthStore((s) => s.hasPermission('manage_restaurant_settings'));

  const { data, isLoading } = useQuery({ queryKey: ['tables'], queryFn: tablesApi.list });
  const refresh = () => qc.invalidateQueries({ queryKey: ['tables'] });
  useSocketEvent('table.status_changed', refresh);
  useSocketEvent('order.created', refresh);
  useSocketEvent('order.status_changed', refresh);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [deleting, setDeleting] = useState<RestaurantTable | null>(null);

  const onError = (e: unknown) =>
    toast.error(
      e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? tr('common.somethingWentWrong')) : tr('common.somethingWentWrong'),
    );

  const saveMut = useMutation({
    mutationFn: (v: TableForm) =>
      editing
        ? tablesApi.update(editing.id, { name: v.name, capacity: Number(v.capacity) })
        : tablesApi.create({ name: v.name, tableNumber: Number(v.tableNumber), capacity: Number(v.capacity) }),
    onSuccess: () => {
      toast.success(editing ? tr('tables.updated') : tr('tables.added'));
      setFormOpen(false);
      setEditing(null);
      refresh();
    },
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => {
      toast.success(tr('tables.removed'));
      setDeleting(null);
      refresh();
    },
    onError,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) => tablesApi.setStatus(id, status),
    onSuccess: refresh,
    onError,
  });

  const tables = data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('tables.title')}
        description={t('tables.subtitle')}
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> {t('tables.addTable')}
            </Button>
          )
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={8} />
      ) : tables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={t('tables.emptyTitle')}
          description={t('tables.emptyDesc')}
          action={canManage && <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> {t('tables.addTable')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <div key={table.id} className="relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-card">
              {/* Photo banner — fills what used to be dead white space. */}
              <div className="relative h-32 w-full overflow-hidden bg-muted">
                <img
                  src={tablePhoto(table.tableNumber)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
                  <div>
                    <div className="text-base font-bold text-white drop-shadow">{table.name}</div>
                    <div className="flex items-center gap-1 text-xs text-white/90 drop-shadow">
                      <Users className="h-3 w-3" /> {t('tables.seats', { n: table.capacity })} · #{table.tableNumber}
                    </div>
                  </div>
                  <Badge variant={tableStatusVariant[table.status]}>{tEnum('tableStatus', table.status)}</Badge>
                </div>
              </div>

              <div className="absolute end-1.5 top-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('tables.tableOptions')}
                      className="bg-black/35 text-white hover:bg-black/55 hover:text-white"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('tables.setStatus')}</DropdownMenuLabel>
                    {TABLE_STATUSES.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => statusMut.mutate({ id: table.id, status: s })}>
                        {tEnum('tableStatus', s)}
                      </DropdownMenuItem>
                    ))}
                    {table.activeOrder && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate(`/admin/orders/${table.activeOrder!.id}`)}>
                          {t('tables.viewActiveOrder')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(table);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleting(table)}
                        >
                          <Trash2 className="h-4 w-4" /> {t('common.delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-1 flex-col p-3">
              {table.activeOrder ? (
                <button
                  onClick={() => navigate(`/admin/orders/${table.activeOrder!.id}`)}
                  className="flex-1 space-y-1 rounded-lg border bg-muted/40 p-2.5 text-start text-xs transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{table.activeOrder.orderNumber}</span>
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{tEnum('orderStatus', table.activeOrder.status)}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {t('shell.minutesShort', { n: minutesSince(table.activeOrder.createdAt) })}
                    </span>
                    <span className="font-semibold text-primary">{formatMoney(table.activeOrder.grandTotal, currency)}</span>
                  </div>
                </button>
              ) : (
                <div className="rounded-lg border border-dashed p-2.5 text-center text-xs text-muted-foreground">
                  {t('tables.noActiveOrder')}
                </div>
              )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TableFormDialog
        key={editing?.id ?? 'new'}
        open={formOpen}
        editing={editing}
        pending={saveMut.isPending}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        onSubmit={(v) => saveMut.mutate(v)}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('tables.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('tables.deleteDesc')}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleting) deleteMut.mutate(deleting.id);
        }}
      />
    </div>
  );
}

function TableFormDialog({
  open,
  editing,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editing: RestaurantTable | null;
  pending: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: TableForm) => void;
}) {
  const { t } = useLang();
  const { register, handleSubmit } = useForm<TableForm>({
    defaultValues: {
      name: editing?.name ?? '',
      tableNumber: editing?.tableNumber ?? undefined,
      capacity: editing?.capacity ?? 4,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t('tables.editTable') : t('tables.addTable')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t('tables.tableName')}</Label>
            <Input id="name" placeholder={t('tables.tableNamePlaceholder')} {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tableNumber">{t('tables.tableNumber')}</Label>
              <Input
                id="tableNumber"
                type="number"
                min={1}
                disabled={!!editing}
                placeholder="9"
                {...register('tableNumber', { valueAsNumber: true, required: !editing })}
              />
              {editing && <p className="text-[11px] text-muted-foreground">{t('tables.numberLocked')}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">{t('tables.capacity')}</Label>
              <Input id="capacity" type="number" min={1} {...register('capacity', { valueAsNumber: true })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t('common.saving') : editing ? t('common.saveChanges') : t('tables.addTable')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
