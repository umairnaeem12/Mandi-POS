import type { Invoice } from '@/api/invoices';
import { assetUrl } from '@/lib/assets';

// 80mm-style receipt. Print styles live in index.css (@media print).
export function Receipt({ invoice }: { invoice: Invoice }) {
  const c = invoice.currencySymbol;
  const money = (v: string | number) => `${c} ${Number(v).toFixed(2)}`;

  return (
    <div className="receipt mx-auto w-[320px] bg-white p-4 font-mono text-xs text-black">
      <div className="text-center">
        {invoice.restaurantLogoUrl && (
          <img src={assetUrl(invoice.restaurantLogoUrl)} alt="" className="mx-auto mb-1 h-12 object-contain" />
        )}
        <div className="text-sm font-bold">{invoice.restaurantName}</div>
        {invoice.restaurantAddress && <div>{invoice.restaurantAddress}</div>}
        {invoice.restaurantContact && <div>{invoice.restaurantContact}</div>}
      </div>

      <div className="my-2 border-t border-dashed" />

      <div className="flex justify-between">
        <span>Invoice:</span>
        <span>{invoice.invoiceNumber}</span>
      </div>
      <div className="flex justify-between">
        <span>Date:</span>
        <span>{new Date(invoice.createdAt).toLocaleString()}</span>
      </div>
      {invoice.order?.table && (
        <div className="flex justify-between">
          <span>Table:</span>
          <span>{invoice.order.table.name}</span>
        </div>
      )}
      {invoice.customerName && (
        <div className="flex justify-between">
          <span>Customer:</span>
          <span>{invoice.customerName}</span>
        </div>
      )}
      {invoice.customerContact && (
        <div className="flex justify-between">
          <span>Contact:</span>
          <span>{invoice.customerContact}</span>
        </div>
      )}

      <div className="my-2 border-t border-dashed" />

      <table className="w-full">
        <thead>
          <tr className="border-b border-dashed">
            <th className="text-left">Item</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it) => (
            <tr key={it.id}>
              <td className="text-left">
                {it.itemName}
                {it.itemNameAr && <div dir="rtl" className="text-[10px] text-black/70">{it.itemNameAr}</div>}
              </td>
              <td className="text-center align-top">{it.quantity}</td>
              <td className="text-right align-top">{Number(it.unitPrice).toFixed(2)}</td>
              <td className="text-right align-top">{Number(it.totalPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed" />

      <div className="flex justify-between"><span>Subtotal</span><span>{money(invoice.subtotal)}</span></div>
      {Number(invoice.discountAmount) > 0 && (
        <div className="flex justify-between">
          <span>Discount{invoice.discountType === 'PERCENTAGE' ? ` (${invoice.discountValue}%)` : ''}</span>
          <span>-{money(invoice.discountAmount)}</span>
        </div>
      )}
      {Number(invoice.taxAmount) > 0 && (
        <div className="flex justify-between">
          <span>{invoice.taxName} ({Number(invoice.taxPercentage)}%)</span>
          <span>{money(invoice.taxAmount)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between border-t border-dashed pt-1 font-bold">
        <span>Grand Total</span>
        <span>{money(invoice.grandTotal)}</span>
      </div>
      <div className="flex justify-between"><span>Paid</span><span>{money(invoice.paidAmount)}</span></div>
      <div className="flex justify-between"><span>Change</span><span>{money(invoice.changeAmount)}</span></div>
      {invoice.payments[0] && (
        <div className="flex justify-between"><span>Method</span><span>{invoice.payments[0].paymentMethod}</span></div>
      )}

      <div className="my-2 border-t border-dashed" />
      <div className="text-center">Thank you for dining with us!</div>
      <div dir="rtl" className="text-center">شكراً لزيارتكم</div>
    </div>
  );
}
