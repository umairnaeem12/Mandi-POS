import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ArrowLeft, CheckCircle2, Printer, Receipt as ReceiptIcon } from 'lucide-react';
import { ordersApi } from '@/api/orders';
import { invoicesApi, type DiscountType, type Invoice, type PaymentMethod } from '@/api/invoices';
import { useRestaurant } from '@/hooks/useRestaurant';
import { t as tNow, useLang } from '@/stores/lang.store';
import { formatMoney } from '@/lib/format';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt } from '@/components/Receipt';
import { PaperSizeSelect, usePaperSize, useReceiptPrint } from '@/components/ReceiptPrint';
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
  const { dn, t, tEnum } = useLang();
  const money = (v: string | number) => formatMoney(v, currency);
  const [paper, setPaper] = usePaperSize();
  const { printReceipt, printPortal } = useReceiptPrint();

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
      e instanceof AxiosError
        ? ((e.response?.data as { message?: string })?.message ?? tNow('common.somethingWentWrong'))
        : tNow('common.somethingWentWrong'),
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
      toast.success(tNow('billing.invoiceGenerated'));
    },
    onError,
  });

  const payMut = useMutation({
    mutationFn: () => invoicesApi.pay(invoice!.id, { paymentMethod: method, amount: Number(amount) }),
    onSuccess: (inv) => {
      setInvoice(inv);
      if (inv.paymentStatus === 'PAID') toast.success(tNow('billing.paymentReceived'));
      else toast.success(tNow('billing.partialPayment'));
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
  if (!order) return <p className="text-destructive">{t('billing.orderNotFound')}</p>;

  return (
    <div className="space-y-5">
      {printPortal}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/admin/orders')}
          aria-label={t('billing.backToOrders')}
          title={t('billing.backToOrders')}
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('billing.title')}</h1>
          <p className="text-sm text-muted-foreground">{order.orderNumber} · {order.table?.name ?? tEnum('orderType', order.orderType)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {/* Order review */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptIcon className="h-4 w-4 text-primary" /> {t('billing.orderItems')}
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
                <span>{t('common.subtotal')}</span>
                <span>{money(subtotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Generate invoice */}
          {!invoice && (
            <Card>
              <CardHeader>
                <CardTitle>{t('billing.customerDiscount')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('billing.customerName')}</Label>
                    <Input placeholder={t('common.optional')} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('billing.contact')}</Label>
                    <Input placeholder={t('common.optional')} value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('common.discount')}</Label>
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType | 'NONE')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">{t('billing.noDiscount')}</SelectItem>
                        <SelectItem value="PERCENTAGE">{t('billing.percentage')}</SelectItem>
                        <SelectItem value="FIXED">{tEnum('discountType', 'FIXED')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {discountType !== 'NONE' && (
                    <div className="space-y-1.5">
                      <Label>{t('billing.value')}</Label>
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
                  {genMut.isPending ? t('billing.generating') : t('billing.generateInvoice')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment */}
          {invoice && !isPaid && (
            <Card>
              <CardHeader>
                <CardTitle>{t('billing.receivePayment')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('billing.grandTotal')}</span><span className="font-semibold">{money(invoice.grandTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('billing.alreadyPaid')}</span><span>{money(invoice.paidAmount)}</span></div>
                  <div className="flex justify-between border-t pt-1.5 font-medium"><span>{t('billing.due')}</span><span className="text-primary">{money(due)}</span></div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('common.paymentMethod')}</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{tEnum('paymentMethod', m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('billing.amountReceived')}</Label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                {change > 0 && (
                  <p className="text-sm text-muted-foreground">{t('billing.changeToReturn')} <span className="font-semibold text-foreground">{money(change)}</span></p>
                )}
                <Button className="w-full" disabled={payMut.isPending || !amount} onClick={() => payMut.mutate()}>
                  {payMut.isPending ? t('billing.processing') : t('billing.receivePayment')}
                </Button>
              </CardContent>
            </Card>
          )}

          {isPaid && (
            <Card className="border-success/40 bg-success/5">
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-center gap-2 font-semibold text-success">
                  <CheckCircle2 className="h-5 w-5" /> {t('billing.paymentComplete')}
                </div>
                <p className="text-sm text-muted-foreground">{t('billing.changeReturned', { amount: money(invoice!.changeAmount) })}</p>
                <div className="flex items-center justify-between gap-3">
                  <Label>{t('shell.paperSize')}</Label>
                  <PaperSizeSelect value={paper} onChange={setPaper} />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      invoicesApi.print(invoice!.id).catch(() => undefined);
                      printReceipt(invoice!, paper);
                    }}
                  >
                    <Printer className="h-4 w-4" /> {t('billing.printReceipt')}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/admin/orders')}>{t('billing.done')}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Receipt preview */}
        <div>
          {invoice ? (
            <div className="overflow-x-auto rounded-lg border bg-muted/30 p-4">
              <Receipt invoice={invoice} paper={paper} />
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              {t('billing.previewHint')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
