import type { Invoice } from '@/api/invoices';
import { assetUrl } from '@/lib/assets';
import { useRestaurant } from '@/hooks/useRestaurant';

// 80mm thermal receipt, laid out to match the client's existing printed bill:
// logo + Arabic wordmark, address/mobile, then Item/Qty/Price/Total columns and
// a "Grand Total" block. Print styles live in index.css (@media print).
export function Receipt({ invoice }: { invoice: Invoice }) {
  const { settings } = useRestaurant();
  const c = invoice.currencySymbol;
  const money = (v: string | number) => `${c} ${Number(v).toFixed(2)}`;
  const num = (v: string | number) => Number(v).toFixed(2);

  const dt = new Date(invoice.createdAt);
  const stamp = `${dt.toLocaleDateString()}, ${dt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })}`;

  // The invoice snapshots branding at creation time; fall back to current
  // settings so older invoices still print the logo/header the client expects.
  const logoUrl = invoice.restaurantLogoUrl ?? settings?.logoUrl ?? null;
  const address = invoice.restaurantAddress ?? settings?.address ?? null;
  const contact = invoice.restaurantContact ?? settings?.contactNumber ?? null;
  // receiptHeader carries the bilingual name (EN line + AR line).
  const headerLines = (settings?.receiptHeader ?? invoice.restaurantName ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const footerLines = (settings?.receiptFooter ?? 'Thank you for dining with us!')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="receipt mx-auto w-[302px] bg-white px-3 py-4 font-mono text-[11px] leading-relaxed text-black">
      {/* ---- Header: logo, bilingual name, address, mobile ---- */}
      <header className="receipt-header text-center">
        {logoUrl && (
          <img
            src={assetUrl(logoUrl)}
            alt=""
            className="receipt-logo mx-auto mb-2 max-h-28 w-auto max-w-[85%] object-contain"
          />
        )}
        {headerLines.map((line, i) => (
          <div
            key={i}
            dir={isArabic(line) ? 'rtl' : 'ltr'}
            className={
              i === 0
                ? 'text-[15px] font-bold uppercase tracking-[0.1em]'
                : 'mt-0.5 text-[13px] font-bold'
            }
          >
            {line}
          </div>
        ))}
        {address && (
          <div className="mt-2 whitespace-pre-line px-1 text-[10px] font-semibold leading-snug">
            {address}
          </div>
        )}
        {contact && <div className="mt-1 text-[10px] font-semibold">Mobile: {contact}</div>}
      </header>

      {/* Heavy rule under the header, as on the printed bill. */}
      <div className="my-2.5 border-t-[3px] border-black" />

      {/* ---- Meta ---- */}
      <section className="space-y-1">
        <Row label="Invoice:" value={invoice.invoiceNumber} />
        <Row label="Date:" value={stamp} />
        {invoice.order?.table && <Row label="Table:" value={invoice.order.table.name} />}
        {invoice.customerName && <Row label="Customer:" value={invoice.customerName} />}
        {invoice.customerContact && <Row label="Contact:" value={invoice.customerContact} />}
      </section>

      <Rule className="my-2" />

      {/* ---- Items: Item | Qty | Price | Total ---- */}
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[13%]" />
          <col className="w-[22%]" />
          <col className="w-[24%]" />
        </colgroup>
        <thead>
          <tr>
            <th className="pb-1.5 pr-2 text-left font-bold">Item</th>
            <th className="pb-1.5 pr-1 text-center font-bold">Qty</th>
            <th className="pb-1.5 pr-2 text-right font-bold">Price</th>
            <th className="pb-1.5 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it) => (
            <tr key={it.id} className="receipt-item align-top">
              <td className="py-1.5 pr-2 text-left">
                <div className="break-words">{it.itemName}</div>
                {it.itemNameAr && (
                  <div dir="rtl" className="mt-0.5 break-words text-[10px] leading-snug">
                    {it.itemNameAr}
                  </div>
                )}
              </td>
              <td className="py-1.5 pr-1 text-center tabular-nums">{it.quantity}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{num(it.unitPrice)}</td>
              <td className="py-1.5 text-right tabular-nums">{num(it.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Rule className="my-2" />

      {/* ---- Totals ---- */}
      <section className="space-y-1">
        <Row label="Subtotal" value={money(invoice.subtotal)} />
        {Number(invoice.discountAmount) > 0 && (
          <Row
            label={`Discount${invoice.discountType === 'PERCENTAGE' ? ` (${Number(invoice.discountValue)}%)` : ''}`}
            value={`- ${money(invoice.discountAmount)}`}
          />
        )}
        {Number(invoice.taxAmount) > 0 && (
          <Row
            label={`${invoice.taxName ?? 'Tax'} (${Number(invoice.taxPercentage)}%)`}
            value={money(invoice.taxAmount)}
          />
        )}
      </section>

      <Rule className="my-2" />

      <section className="space-y-1">
        <div className="flex items-baseline justify-between gap-3 text-[13px] font-bold">
          <span>Grand Total</span>
          <span className="tabular-nums">{money(invoice.grandTotal)}</span>
        </div>
        <Row label="Paid" value={money(invoice.paidAmount)} />
        <Row label="Change" value={money(invoice.changeAmount)} />
        {invoice.payments[0] && <Row label="Method" value={prettyMethod(invoice.payments[0].paymentMethod)} />}
      </section>

      {/* ---- Footer ---- */}
      <Rule className="my-2.5" />
      <footer className="text-center">
        {footerLines.map((line, i) => (
          <div
            key={i}
            dir={isArabic(line) ? 'rtl' : 'ltr'}
            className={i === 0 ? 'text-[11px] font-bold' : 'mt-1 text-[11px] font-bold'}
          >
            {line}
          </div>
        ))}
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}

function Rule({ className = '' }: { className?: string }) {
  return <div className={`border-t border-dashed border-black/70 ${className}`} />;
}

function isArabic(s: string) {
  return /[؀-ۿ]/.test(s);
}

function prettyMethod(m: string) {
  return m
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}
