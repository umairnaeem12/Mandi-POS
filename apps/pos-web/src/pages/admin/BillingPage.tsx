import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ArrowLeft, CheckCircle2, Printer, Receipt as ReceiptIcon } from 'lucide-react';
import { ordersApi } from '@/api/orders';
import { invoicesApi, type DiscountType, type Invoice, type PaymentMethod } from '@/api/invoices';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useLang } from '@/stores/lang.store';
import { formatMoney } from '@/lib/format';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt } from '@/components/Receipt';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE'];

export function BillingPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { currency } = useRestaurant();
  const { dn } = useLang();
  const money = (v: string | number) => formatMoney(v, currency);

  const orderQuery = useQuery({ queryKey: ['order', orderId], queryFn: () => ordersApi.get(orderId) });

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType | 'NONE'>('NONE');
  const [discountValue, setDiscountValue] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState('');

  const onError = (e: unknown) =>
    toast.error(
      e instanceof AxiosError ? ((e.response?.data as { message?: string })?.message ?? 'Failed') : 'Failed',
    );

  const genMut = useMutation({
    mutationFn: () =>
      invoicesApi.generateFromOrder(orderId, {
        customerName: customerName || undefined,
        customerContact: customerContact || undefined,
        discountType: discountType === 'NONE' ? undefined : discountType,
        discountValue: discountType === 'NONE' ? undefined : Number(discountValue || 0),
      }),
    onSuccess: (inv) => {
      setInvoice(inv);
      setAmount(inv.grandTotal);
      toast.success('Invoice generated');
    },
    onError,
  });

  const payMut = useMutation({
    mutationFn: () => invoicesApi.pay(invoice!.id, { paymentMethod: method, amount: Number(amount) }),
    onSuccess: (inv) => {
      setInvoice(inv);
      if (inv.paymentStatus === 'PAID') toast.success('Payment received — order completed');
      else toast.success('Partial payment recorded');
    },
    onError,
  });

  const order = orderQuery.data;
  const subtotal = useMemo(() => order?.items.reduce((s, i) => s + Number(i.totalPrice), 0) ?? 0, [order]);
  const isPaid = invoice?.paymentStatus === 'PAID';
  const due = invoice ? Number(invoice.grandTotal) - Number(invoice.paidAmount) : 0;
  const change = Number(amount) > due ? Number(amount) - due : 0;

  if (orderQuery.isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (!order) return <p className="text-destructive">Order not found.</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">{order.orderNumber} · {order.table?.name ?? order.orderType}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {/* Order review */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptIcon className="h-4 w-4 text-primary" /> Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {order.items.map((i) => (
                  <li key={i.id} className="flex justify-between py-2">
                    <span className="text-foreground">{i.quantity}× {dn(i.itemName, i.itemNameAr)}</span>
                    <span className="tabular-nums">{money(i.totalPrice)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Generate invoice */}
          {!invoice && (
            <Card>
              <CardHeader>
                <CardTitle>Customer & Discount</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Customer name</Label>
                    <Input placeholder="Optional" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact</Label>
                    <Input placeholder="Optional" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Discount</Label>
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType | 'NONE')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">No discount</SelectItem>
                        <SelectItem value="PERCENTAGE">Percentage %</SelectItem>
                        <SelectItem value="FIXED">Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {discountType !== 'NONE' && (
                    <div className="space-y-1.5">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <Button className="w-full" disabled={genMut.isPending} onClick={() => genMut.mutate()}>
                  {genMut.isPending ? 'Generating…' : 'Generate Invoice'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment */}
          {invoice && !isPaid && (
            <Card>
              <CardHeader>
                <CardTitle>Receive Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Grand total</span><span className="font-semibold">{money(invoice.grandTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Already paid</span><span>{money(invoice.paidAmount)}</span></div>
                  <div className="flex justify-between border-t pt-1.5 font-medium"><span>Due</span><span className="text-primary">{money(due)}</span></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment method</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{m.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount received</Label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                {change > 0 && (
                  <p className="text-sm text-muted-foreground">Change to return: <span className="font-semibold text-foreground">{money(change)}</span></p>
                )}
                <Button className="w-full" disabled={payMut.isPending || !amount} onClick={() => payMut.mutate()}>
                  {payMut.isPending ? 'Processing…' : 'Receive Payment'}
                </Button>
              </CardContent>
            </Card>
          )}

          {isPaid && (
            <Card className="border-success/40 bg-success/5">
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-center gap-2 font-semibold text-success">
                  <CheckCircle2 className="h-5 w-5" /> Payment complete
                </div>
                <p className="text-sm text-muted-foreground">Change returned: {money(invoice!.changeAmount)}</p>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { invoicesApi.print(invoice!.id).catch(() => undefined); window.print(); }}>
                    <Printer className="h-4 w-4" /> Print Receipt
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/admin/orders')}>Done</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Receipt preview */}
        <div>
          {invoice ? (
            <div className="rounded-lg border bg-muted/30 p-4">
              <Receipt invoice={invoice} />
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              Receipt preview appears after generating the invoice.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
