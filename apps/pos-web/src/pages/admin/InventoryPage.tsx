import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ArrowDownCircle, ArrowUpCircle, Boxes, Plus, Settings2, Trash2 } from 'lucide-react';
import {
  INVENTORY_UNITS,
  inventoryApi,
  type CreateItemInput,
  type InventoryItem,
  type InventoryUnit,
} from '@/api/inventory';
import { formatDateTime } from '@/lib/format';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type MoveKind = 'IN' | 'OUT' | 'ADJUST';

export function InventoryPage() {
  const qc = useQueryClient();
  const itemsQuery = useQuery({ queryKey: ['inventory'], queryFn: inventoryApi.list });
  const txQuery = useQuery({ queryKey: ['inventory-tx'], queryFn: () => inventoryApi.transactions(30) });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['inventory-tx'] });
  };

  const [addOpen, setAddOpen] = useState(false);
  const [move, setMove] = useState<{ item: InventoryItem; kind: MoveKind } | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  const onError = (e: unknown) =>
    toast.error(e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? 'Failed') : 'Failed');

  const createMut = useMutation({
    mutationFn: (input: CreateItemInput) => inventoryApi.create(input),
    onSuccess: () => { toast.success('Item added'); setAddOpen(false); invalidate(); },
    onError,
  });

  const moveMut = useMutation({
    mutationFn: ({ item, kind, qty, notes }: { item: InventoryItem; kind: MoveKind; qty: number; notes?: string }) => {
      if (kind === 'IN') return inventoryApi.stockIn(item.id, qty, notes);
      if (kind === 'OUT') return inventoryApi.stockOut(item.id, qty, 'STOCK_OUT', notes);
      return inventoryApi.adjustment(item.id, qty, notes);
    },
    onSuccess: () => { toast.success('Stock updated'); setMove(null); invalidate(); },
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => inventoryApi.remove(id),
    onSuccess: () => { toast.success('Item deleted'); setDeleting(null); invalidate(); },
    onError,
  });

  const isLow = (i: InventoryItem) => Number(i.currentStock) <= Number(i.lowStockLimit);
  const items = itemsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track stock levels and movements."
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Item</Button>}
      />

      {itemsQuery.isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : items.length === 0 ? (
        <EmptyState icon={Boxes} title="No inventory items" description="Add items to start tracking stock." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Item</TH>
              <TH>Unit</TH>
              <TH>Stock</TH>
              <TH>Low limit</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {items.map((item) => (
              <TR key={item.id} className="hover:bg-accent/40">
                <TD>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    {item.name}
                    {isLow(item) && <Badge variant="destructive">Low</Badge>}
                  </div>
                </TD>
                <TD className="text-muted-foreground">{item.unit}</TD>
                <TD className={isLow(item) ? 'font-semibold text-destructive' : 'font-semibold'}>{item.currentStock}</TD>
                <TD className="text-muted-foreground">{item.lowStockLimit}</TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" title="Stock in" onClick={() => setMove({ item, kind: 'IN' })}>
                      <ArrowUpCircle className="h-4 w-4 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Stock out" onClick={() => setMove({ item, kind: 'OUT' })}>
                      <ArrowDownCircle className="h-4 w-4 text-warning-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Adjust" onClick={() => setMove({ item, kind: 'ADJUST' })}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* Recent movements */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Recent stock movements</h2>
        {(txQuery.data?.length ?? 0) === 0 ? (
          <EmptyState icon={Boxes} title="No movements yet" className="py-8" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Item</TH><TH>Type</TH><TH>Qty</TH><TH>Change</TH><TH>Notes</TH><TH>When</TH>
              </TR>
            </THead>
            <TBody>
              {txQuery.data?.map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium text-foreground">{t.inventoryItem.name}</TD>
                  <TD><Badge variant="secondary">{t.type}</Badge></TD>
                  <TD>{t.quantity}</TD>
                  <TD className="text-muted-foreground">{t.previousStock} → {t.newStock}</TD>
                  <TD className="text-muted-foreground">{t.notes ?? '—'}</TD>
                  <TD className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <AddItemForm open={addOpen} pending={createMut.isPending} onOpenChange={setAddOpen} onSubmit={(v) => createMut.mutate(v)} />

      <StockMoveDialog
        move={move}
        pending={moveMut.isPending}
        onClose={() => setMove(null)}
        onSubmit={(qty, notes) => move && moveMut.mutate({ ...move, qty, notes })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This inventory item and its tracking will be removed."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleting) deleteMut.mutate(deleting.id); }}
      />
    </div>
  );
}

function AddItemForm({
  open,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: CreateItemInput) => void;
}) {
  const { register, handleSubmit, watch, setValue, reset } = useForm<{
    name: string;
    unit: InventoryUnit;
    currentStock?: number;
    lowStockLimit?: number;
  }>({ defaultValues: { name: '', unit: 'PIECE' } });
  const unit = watch('unit');

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((v) =>
            onSubmit({
              name: v.name,
              unit: v.unit,
              currentStock: v.currentStock ? Number(v.currentStock) : undefined,
              lowStockLimit: v.lowStockLimit ? Number(v.lowStockLimit) : undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Item name</Label>
            <Input id="name" {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={(v) => setValue('unit', v as InventoryUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock">Opening</Label>
              <Input id="stock" type="number" step="0.001" {...register('currentStock', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="low">Low limit</Label>
              <Input id="low" type="number" step="0.001" {...register('lowStockLimit', { valueAsNumber: true })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add item'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const MOVE_LABELS: Record<MoveKind, { title: string; label: string; cta: string }> = {
  IN: { title: 'Stock In', label: 'Quantity to add', cta: 'Add stock' },
  OUT: { title: 'Stock Out', label: 'Quantity to remove', cta: 'Remove stock' },
  ADJUST: { title: 'Adjust Stock', label: 'New actual stock level', cta: 'Set stock' },
};

function StockMoveDialog({
  move,
  pending,
  onClose,
  onSubmit,
}: {
  move: { item: InventoryItem; kind: MoveKind } | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (qty: number, notes?: string) => void;
}) {
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const cfg = move ? MOVE_LABELS[move.kind] : null;

  return (
    <Dialog open={!!move} onOpenChange={(o) => { if (!o) { onClose(); setQty(''); setNotes(''); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{cfg?.title} — {move?.item.name}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(qty);
            if (Number.isNaN(n) || n < 0) return;
            onSubmit(n, notes || undefined);
            setQty('');
            setNotes('');
          }}
          className="space-y-4"
        >
          <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
            Current stock: <span className="font-semibold text-foreground">{move?.item.currentStock} {move?.item.unit}</span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qty">{cfg?.label}</Label>
            <Input id="qty" type="number" step="0.001" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending || !qty}>{pending ? 'Saving…' : cfg?.cta}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
