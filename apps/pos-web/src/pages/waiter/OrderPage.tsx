import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  ArrowLeft,
  ChefHat,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  StickyNote,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { tablesApi } from '@/api/tables';
import { ordersApi } from '@/api/orders';
import { categoriesApi } from '@/api/categories';
import { menuItemsApi, type MenuItem } from '@/api/menuItems';
import { useAuthStore } from '@/stores/auth.store';
import { useLang } from '@/stores/lang.store';
import { useRestaurant } from '@/hooks/useRestaurant';
import { assetUrl } from '@/lib/assets';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/EmptyState';
import { CardGridSkeleton } from '@/components/Skeletons';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CartLine {
  menuItemId: string;
  name: string;
  nameAr?: string | null;
  price: number;
  quantity: number;
  notes?: string;
}

export function OrderPage() {
  const { tableId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currency } = useRestaurant();
  const { dn } = useLang();
  const canBill = useAuthStore((s) => s.hasPermission('generate_invoice'));
  const money = (v: number | string) => formatMoney(v, currency);

  const [activeCat, setActiveCat] = useState<string>('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [noteTarget, setNoteTarget] = useState<{ id: string; name: string; notes: string; isActive: boolean } | null>(null);

  const tableQuery = useQuery({ queryKey: ['table', tableId], queryFn: () => tablesApi.get(tableId) });
  const catsQuery = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() });
  const itemsQuery = useQuery({ queryKey: ['menu-items', 'pos'], queryFn: () => menuItemsApi.list() });
  const activeOrderQuery = useQuery({
    queryKey: ['active-order', tableId],
    queryFn: () => ordersApi.activeForTable(tableId),
  });

  const activeOrder = activeOrderQuery.data;
  const refreshOrder = () => {
    qc.invalidateQueries({ queryKey: ['active-order', tableId] });
    qc.invalidateQueries({ queryKey: ['tables'] });
  };

  const onError = (e: unknown) =>
    toast.error(
      e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? 'Action failed') : 'Action failed',
    );

  const createMut = useMutation({
    mutationFn: () =>
      ordersApi.create({
        orderType: 'DINE_IN',
        tableId,
        items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity, notes: c.notes })),
      }),
    onSuccess: () => {
      setCart([]);
      toast.success('Order sent to kitchen');
      refreshOrder();
    },
    onError,
  });

  const addItemMut = useMutation({
    mutationFn: (m: MenuItem) => ordersApi.addItem(activeOrder!.id, { menuItemId: m.id, quantity: 1 }),
    onSuccess: refreshOrder,
    onError,
  });
  const updateItemMut = useMutation({
    mutationFn: ({ itemId, quantity, notes }: { itemId: string; quantity?: number; notes?: string }) =>
      ordersApi.updateItem(activeOrder!.id, itemId, { quantity, notes }),
    onSuccess: refreshOrder,
    onError,
  });
  const removeItemMut = useMutation({
    mutationFn: (itemId: string) => ordersApi.removeItem(activeOrder!.id, itemId),
    onSuccess: refreshOrder,
    onError,
  });

  // Sellable items: isAvailable=true (covers AVAILABLE and OUT_OF_STOCK). Inactive hidden.
  const sellable = useMemo(() => (itemsQuery.data ?? []).filter((m) => m.isAvailable), [itemsQuery.data]);
  const visibleItems = useMemo(
    () =>
      sellable.filter(
        (m) =>
          (!activeCat || m.categoryId === activeCat) &&
          (!search || m.name.toLowerCase().includes(search.toLowerCase())),
      ),
    [sellable, activeCat, search],
  );

  const countFor = (catId: string) => sellable.filter((m) => m.categoryId === catId).length;

  const onPickItem = (m: MenuItem) => {
    if (m.isOutOfStock) return;
    if (activeOrder) {
      addItemMut.mutate(m);
      return;
    }
    setCart((prev) => {
      const found = prev.find((c) => c.menuItemId === m.id);
      if (found) return prev.map((c) => (c.menuItemId === m.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { menuItemId: m.id, name: m.name, nameAr: m.nameAr, price: Number(m.price), quantity: 1 }];
    });
  };

  const cartCount = activeOrder
    ? activeOrder.items.reduce((s, i) => s + i.quantity, 0)
    : cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const saveNote = () => {
    if (!noteTarget) return;
    if (noteTarget.isActive) {
      updateItemMut.mutate({ itemId: noteTarget.id, notes: noteTarget.notes });
    } else {
      setCart((prev) => prev.map((c) => (c.menuItemId === noteTarget.id ? { ...c, notes: noteTarget.notes } : c)));
    }
    setNoteTarget(null);
  };

  const statusVariant = (s: string) =>
    s === 'PENDING' ? 'warning' : s === 'PREPARING' ? 'info' : s === 'SERVED' ? 'default' : 'success';

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[190px_1fr_350px]">
      {/* Category panel */}
      <aside className="hidden flex-col gap-1.5 overflow-y-auto scrollbar-thin lg:flex">
        <CategoryButton active={!activeCat} onClick={() => setActiveCat('')} label={dn('All Items', 'الكل')} count={sellable.length} />
        {catsQuery.data?.map((c) => (
          <CategoryButton
            key={c.id}
            active={activeCat === c.id}
            onClick={() => setActiveCat(c.id)}
            label={dn(c.name, c.nameAr)}
            count={countFor(c.id)}
          />
        ))}
      </aside>

      {/* Menu */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate('/waiter/tables')} className="shrink-0 lg:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items…"
              className="pl-9"
            />
          </div>
          {/* mobile category select */}
          <select
            value={activeCat}
            onChange={(e) => setActiveCat(e.target.value)}
            className="h-10 rounded-md border border-input bg-card px-2 text-sm lg:hidden"
          >
            <option value="">All</option>
            {catsQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-1">
          {itemsQuery.isLoading ? (
            <CardGridSkeleton count={9} />
          ) : visibleItems.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No menu items found"
              description="Try another category or search term."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visibleItems.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onPickItem(m)}
                  disabled={m.isOutOfStock}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-lg border bg-card text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover',
                    m.isOutOfStock && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <div className="relative flex h-24 items-center justify-center bg-muted">
                    {m.imageUrl ? (
                      <img src={assetUrl(m.imageUrl)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="h-7 w-7 text-muted-foreground/40" />
                    )}
                    {m.isOutOfStock && (
                      <span className="absolute inset-0 flex items-center justify-center bg-card/70 text-xs font-semibold uppercase tracking-wide text-destructive">
                        Out of stock
                      </span>
                    )}
                    {!m.isOutOfStock && (
                      <span className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                        <Plus className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-2.5">
                    <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{dn(m.name, m.nameAr)}</span>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-sm font-bold text-primary">{money(m.price)}</span>
                      {m.preparationTimeMinutes ? (
                        <span className="text-[11px] text-muted-foreground">{m.preparationTimeMinutes}m</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart / Bill */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card shadow-card">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="font-semibold">{tableQuery.data?.name ?? 'Table'}</span>
            </div>
            {activeOrder ? (
              <Badge variant={statusVariant(activeOrder.status)}>{activeOrder.status}</Badge>
            ) : (
              <Badge variant="secondary">New</Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="px-2 py-0">Dine In</Badge>
            {activeOrder && <span>{activeOrder.orderNumber}</span>}
            <span>· {cartCount} item{cartCount === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-2">
          {activeOrder ? (
            activeOrder.items.length === 0 ? (
              <EmptyCart />
            ) : (
              activeOrder.items.map((it) => (
                <CartRow
                  key={it.id}
                  name={dn(it.itemName, it.itemNameAr)}
                  unitPrice={Number(it.unitPrice)}
                  quantity={it.quantity}
                  notes={it.notes}
                  money={money}
                  onDec={() => updateItemMut.mutate({ itemId: it.id, quantity: Math.max(1, it.quantity - 1) })}
                  onInc={() => updateItemMut.mutate({ itemId: it.id, quantity: it.quantity + 1 })}
                  onRemove={() => removeItemMut.mutate(it.id)}
                  onNote={() => setNoteTarget({ id: it.id, name: dn(it.itemName, it.itemNameAr), notes: it.notes ?? '', isActive: true })}
                />
              ))
            )
          ) : cart.length === 0 ? (
            <EmptyCart />
          ) : (
            cart.map((c) => (
              <CartRow
                key={c.menuItemId}
                name={dn(c.name, c.nameAr)}
                unitPrice={c.price}
                quantity={c.quantity}
                notes={c.notes}
                money={money}
                onDec={() =>
                  setCart((p) =>
                    p.map((x) => (x.menuItemId === c.menuItemId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)),
                  )
                }
                onInc={() =>
                  setCart((p) => p.map((x) => (x.menuItemId === c.menuItemId ? { ...x, quantity: x.quantity + 1 } : x)))
                }
                onRemove={() => setCart((p) => p.filter((x) => x.menuItemId !== c.menuItemId))}
                onNote={() => setNoteTarget({ id: c.menuItemId, name: dn(c.name, c.nameAr), notes: c.notes ?? '', isActive: false })}
              />
            ))
          )}
        </div>

        {/* Totals + actions */}
        <div className="border-t p-4">
          {activeOrder ? (
            <div className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={money(activeOrder.subtotal)} />
              {Number(activeOrder.discountAmount) > 0 && (
                <Row label="Discount" value={`- ${money(activeOrder.discountAmount)}`} />
              )}
              {Number(activeOrder.taxAmount) > 0 && <Row label="Tax" value={money(activeOrder.taxAmount)} />}
              <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{money(activeOrder.grandTotal)}</span>
              </div>
              <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <ChefHat className="h-3.5 w-3.5" /> Sent to kitchen — tap items to add more.
              </p>
              {canBill && (
                <Button className="mt-2 w-full" onClick={() => navigate(`/admin/billing/${activeOrder.id}`)}>
                  <Receipt className="h-4 w-4" /> Generate Bill
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{money(cartTotal)}</span>
              </div>
              <Button
                size="lg"
                className="w-full"
                disabled={cart.length === 0 || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                <ChefHat className="h-4 w-4" />
                {createMut.isPending ? 'Sending…' : 'Send to Kitchen'}
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Notes dialog */}
      <Dialog open={!!noteTarget} onOpenChange={(o) => !o && setNoteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Note for {noteTarget?.name}</DialogTitle>
          </DialogHeader>
          <Textarea
            autoFocus
            value={noteTarget?.notes ?? ''}
            onChange={(e) => setNoteTarget((t) => (t ? { ...t, notes: e.target.value } : t))}
            placeholder="e.g. No mayo, extra spicy…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)}>
              Cancel
            </Button>
            <Button onClick={saveNote}>Save note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-transparent bg-card text-foreground hover:bg-accent',
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          'ml-2 rounded-full px-1.5 text-xs',
          active ? 'bg-white/20' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function CartRow({
  name,
  unitPrice,
  quantity,
  notes,
  money,
  onInc,
  onDec,
  onRemove,
  onNote,
}: {
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string | null;
  money: (v: number) => string;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
  onNote: () => void;
}) {
  return (
    <div className="rounded-lg p-2 transition-colors hover:bg-accent/60">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{name}</div>
          <div className="text-xs text-muted-foreground">{money(unitPrice)} each</div>
        </div>
        <div className="text-sm font-semibold text-foreground">{money(unitPrice * quantity)}</div>
      </div>
      {notes && <div className="mt-1 text-[11px] italic text-warning-foreground">↳ {notes}</div>}
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={onDec}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-7 text-center text-sm font-medium tabular-nums">{quantity}</span>
          <Button variant="outline" size="icon-sm" onClick={onInc}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onNote} title="Add note">
            <StickyNote className={cn('h-3.5 w-3.5', notes && 'text-primary')} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRemove} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No items yet</p>
      <p className="text-xs text-muted-foreground">Tap menu items to build this order.</p>
    </div>
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
