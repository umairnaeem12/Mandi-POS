import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Printer, Search } from 'lucide-react';
import { invoicesApi, type Invoice, type PaymentStatus } from '@/api/invoices';
import { useSocketEvent } from '@/lib/socket';
import { formatDateTime, formatMoney } from '@/lib/format';
import { paymentStatusVariant } from '@/lib/status';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { Receipt } from '@/components/Receipt';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const STATUS_FILTERS: (PaymentStatus | 'ALL')[] = ['ALL', 'PAID', 'PARTIAL', 'UNPAID', 'REFUNDED'];

export function InvoicesPage() {
  const qc = useQueryClient();
  const [term, setTerm] = useState('');
  const [active, setActive] = useState('');
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<Invoice | null>(null);

  const filtering = !!active || status !== 'ALL';
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', active, status],
    queryFn: () => {
      if (!filtering) return invoicesApi.list();
      const params: Record<string, string> = {};
      if (active) params.invoiceNumber = active;
      if (active) params.customerName = active;
      if (status !== 'ALL') params.paymentStatus = status;
      return invoicesApi.search(params);
    },
  });

  useSocketEvent('invoice.created', () => qc.invalidateQueries({ queryKey: ['invoices'] }));
  useSocketEvent('invoice.paid', () => qc.invalidateQueries({ queryKey: ['invoices'] }));

  const money = (v: string | number, c?: string) => formatMoney(v, c ?? 'Rs');
  const invoices = data ?? [];

  const printReceipt = (inv: Invoice) => {
    setSelected(inv);
    invoicesApi.print(inv.id).catch(() => undefined);
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Invoices" description="Search, view, and print receipts." />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                status === s ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
              )}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <form
          className="relative lg:w-72"
          onSubmit={(e) => {
            e.preventDefault();
            setActive(term.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search invoice # or customer…"
            className="pl-9 pr-16"
          />
          {active && (
            <button
              type="button"
              onClick={() => { setTerm(''); setActive(''); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices found" description="Generated invoices will appear here." />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelected(inv)}
                  className="cursor-pointer border-b last:border-0 transition-colors hover:bg-accent/50"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.customerName ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">{money(inv.grandTotal, inv.currencySymbol)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{money(inv.paidAmount, inv.currencySymbol)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={paymentStatusVariant[inv.paymentStatus]}>{inv.paymentStatus}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.payments[0]?.paymentMethod ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(inv.createdAt)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => setSelected(inv)} title="View">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => printReceipt(inv)} title="Print">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm p-0">
          <div className="max-h-[80vh] overflow-auto p-4">{selected && <Receipt invoice={selected} />}</div>
          <div className="flex justify-end gap-2 border-t p-3 print:hidden">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <Button onClick={() => selected && printReceipt(selected)}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
