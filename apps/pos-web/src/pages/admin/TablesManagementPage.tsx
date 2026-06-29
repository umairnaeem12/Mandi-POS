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
import { formatMoney, minutesSince } from '@/lib/format';
import { TABLE_STATUSES, tableStatusVariant } from '@/lib/status';
import { toast } from '@/components/ui/sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/Skeletons';
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
      e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? 'Action failed') : 'Action failed',
    );

  const saveMut = useMutation({
    mutationFn: (v: TableForm) =>
      editing
        ? tablesApi.update(editing.id, { name: v.name, capacity: Number(v.capacity) })
        : tablesApi.create({ name: v.name, tableNumber: Number(v.tableNumber), capacity: Number(v.capacity) }),
    onSuccess: () => {
      toast.success(editing ? 'Table updated' : 'Table added');
      setFormOpen(false);
      setEditing(null);
      refresh();
    },
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => {
      toast.success('Table removed');
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
        title="Tables"
        description="Manage your restaurant floor and table status."
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Table
            </Button>
          )
        }
      />

      {isLoading ? (
        <CardGridSkeleton count={8} />
      ) : tables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No tables yet"
          description="Add your first table to start taking dine-in orders."
          action={canManage && <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Add Table</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((t) => (
            <div key={t.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-bold text-foreground">{t.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {t.capacity} seats · #{t.tableNumber}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Set status</DropdownMenuLabel>
                    {TABLE_STATUSES.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => statusMut.mutate({ id: t.id, status: s })}>
                        {s}
                      </DropdownMenuItem>
                    ))}
                    {t.activeOrder && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate(`/admin/orders/${t.activeOrder!.id}`)}>
                          View active order
                        </DropdownMenuItem>
                      </>
                    )}
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(t);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleting(t)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3">
                <Badge variant={tableStatusVariant[t.status]}>{t.status}</Badge>
              </div>

              {t.activeOrder ? (
                <button
                  onClick={() => navigate(`/admin/orders/${t.activeOrder!.id}`)}
                  className="mt-3 space-y-1 rounded-lg border bg-muted/40 p-2.5 text-left text-xs transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{t.activeOrder.orderNumber}</span>
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{t.activeOrder.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {minutesSince(t.activeOrder.createdAt)}m
                    </span>
                    <span className="font-semibold text-primary">{formatMoney(t.activeOrder.grandTotal, currency)}</span>
                  </div>
                </button>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed p-2.5 text-center text-xs text-muted-foreground">
                  No active order
                </div>
              )}
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
        title={`Delete ${deleting?.name}?`}
        description="This table will be removed. Tables with active orders cannot be deleted."
        confirmLabel="Delete"
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
          <DialogTitle>{editing ? 'Edit Table' : 'Add Table'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Table name</Label>
            <Input id="name" placeholder="e.g. Family Table 1" {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tableNumber">Table number</Label>
              <Input
                id="tableNumber"
                type="number"
                min={1}
                disabled={!!editing}
                placeholder="9"
                {...register('tableNumber', { valueAsNumber: true, required: !editing })}
              />
              {editing && <p className="text-[11px] text-muted-foreground">Number can't be changed.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" min={1} {...register('capacity', { valueAsNumber: true })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Add table'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
