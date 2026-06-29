import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ImagePlus, Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import { menuItemsApi, type Availability, type MenuItem, type MenuItemInput } from '@/api/menuItems';
import { categoriesApi } from '@/api/categories';
import { assetUrl } from '@/lib/assets';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useLang } from '@/stores/lang.store';
import { formatMoney } from '@/lib/format';
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

function availabilityOf(item: { isAvailable: boolean; isOutOfStock: boolean }): Availability {
  if (!item.isAvailable) return 'INACTIVE';
  if (item.isOutOfStock) return 'OUT_OF_STOCK';
  return 'AVAILABLE';
}

const AVAIL_BADGE: Record<Availability, { variant: 'success' | 'warning' | 'secondary'; label: string }> = {
  AVAILABLE: { variant: 'success', label: 'Available' },
  OUT_OF_STOCK: { variant: 'warning', label: 'Out of stock' },
  INACTIVE: { variant: 'secondary', label: 'Inactive' },
};

interface FormValues {
  name: string;
  nameAr?: string;
  categoryId: string;
  price: number;
  preparationTimeMinutes?: number;
  description?: string;
}

export function MenuItemsPage() {
  const qc = useQueryClient();
  const { currency } = useRestaurant();
  const { dn } = useLang();
  const itemsQuery = useQuery({ queryKey: ['menu-items'], queryFn: () => menuItemsApi.list() });
  const catsQuery = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['menu-items'] });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('ALL');

  const onError = (e: unknown) =>
    toast.error(e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? 'Failed') : 'Failed');

  const saveMut = useMutation({
    mutationFn: (v: MenuItemInput) =>
      editing ? menuItemsApi.update(editing.id, v) : menuItemsApi.create(v),
    onSuccess: () => {
      toast.success(editing ? 'Item updated' : 'Item added');
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError,
  });

  const availMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Availability }) => menuItemsApi.setAvailability(id, status),
    onSuccess: invalidate,
    onError,
  });

  const imageMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => menuItemsApi.uploadImage(id, file),
    onSuccess: () => { toast.success('Image updated'); invalidate(); },
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => menuItemsApi.remove(id),
    onSuccess: () => { toast.success('Item deleted'); setDeleting(null); invalidate(); },
    onError,
  });

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (itemsQuery.data ?? []).filter(
      (m) => (cat === 'ALL' || m.categoryId === cat) && (!q || m.name.toLowerCase().includes(q)),
    );
  }, [itemsQuery.data, search, cat]);

  const money = (v: string | number) => formatMoney(v, currency);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Menu Items"
        description="Manage the items customers can order."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} disabled={(catsQuery.data?.length ?? 0) === 0}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {catsQuery.data?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{dn(c.name, c.nameAr)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {itemsQuery.isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : items.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="No menu items" description="Add items or adjust your search." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Item</TH>
              <TH>Category</TH>
              <TH>Price</TH>
              <TH>Availability</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {items.map((item) => {
              const av = availabilityOf(item);
              return (
                <TR key={item.id} className="hover:bg-accent/40">
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {item.imageUrl ? (
                          <img src={assetUrl(item.imageUrl)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <UtensilsCrossed className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{item.name}</div>
                        {item.nameAr && <div dir="rtl" className="text-xs text-muted-foreground">{item.nameAr}</div>}
                        {item.preparationTimeMinutes ? (
                          <div className="text-xs text-muted-foreground">{item.preparationTimeMinutes} min</div>
                        ) : null}
                      </div>
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">{dn(item.category.name, item.category.nameAr)}</TD>
                  <TD className="font-semibold">{money(item.price)}</TD>
                  <TD>
                    <Select value={av} onValueChange={(v) => availMut.mutate({ id: item.id, status: v as Availability })}>
                      <SelectTrigger className="h-8 w-36">
                        <Badge variant={AVAIL_BADGE[av].variant}>{AVAIL_BADGE[av].label}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <label className="inline-flex cursor-pointer">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" title="Upload image">
                          <ImagePlus className="h-4 w-4" />
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) imageMut.mutate({ id: item.id, file });
                          }}
                        />
                      </label>
                      <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(item); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <ItemForm
        key={editing?.id ?? 'new'}
        open={formOpen}
        editing={editing}
        categories={catsQuery.data ?? []}
        pending={saveMut.isPending}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        onSubmit={(v) => saveMut.mutate(v)}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This menu item will be removed."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => { if (deleting) deleteMut.mutate(deleting.id); }}
      />
    </div>
  );
}

function ItemForm({
  open,
  editing,
  categories,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editing: MenuItem | null;
  categories: { id: string; name: string }[];
  pending: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: MenuItemInput) => void;
}) {
  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      name: editing?.name ?? '',
      nameAr: editing?.nameAr ?? '',
      categoryId: editing?.categoryId ?? '',
      price: editing ? Number(editing.price) : undefined,
      preparationTimeMinutes: editing?.preparationTimeMinutes ?? undefined,
      description: editing?.description ?? '',
    },
  });
  const categoryId = watch('categoryId');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Item' : 'Add Menu Item'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((v) =>
            onSubmit({
              name: v.name,
              nameAr: v.nameAr || undefined,
              categoryId: v.categoryId,
              price: Number(v.price),
              preparationTimeMinutes: v.preparationTimeMinutes ? Number(v.preparationTimeMinutes) : undefined,
              description: v.description || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name (English)</Label>
              <Input id="name" placeholder="e.g. Mandi Rice" {...register('name', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameAr">Name (Arabic)</Label>
              <Input id="nameAr" dir="rtl" placeholder="رز مندي" {...register('nameAr')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(v) => setValue('categoryId', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('categoryId', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" {...register('price', { required: true, valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prep">Prep time (min)</Label>
              <Input id="prep" type="number" {...register('preparationTimeMinutes', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description (optional)</Label>
            <Input id="desc" {...register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !categoryId}>{pending ? 'Saving…' : editing ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
