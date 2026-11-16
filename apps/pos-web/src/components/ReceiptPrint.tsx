import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Invoice } from '@/api/invoices';
import { Receipt } from '@/components/Receipt';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAPER_SIZES, getSavedPaperSize, isPaperSize, printElement, savePaperSize, type PaperSize } from '@/lib/print';
import { cn } from '@/lib/utils';

// Paper size for this device, remembered between visits.
export function usePaperSize(): [PaperSize, (size: PaperSize) => void] {
  const [paper, setPaper] = useState<PaperSize>(getSavedPaperSize);
  const update = useCallback((size: PaperSize) => {
    setPaper(size);
    savePaperSize(size);
  }, []);
  return [paper, update];
}

export function PaperSizeSelect({
  value,
  onChange,
  className,
}: {
  value: PaperSize;
  onChange: (size: PaperSize) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => isPaperSize(v) && onChange(v)}>
      <SelectTrigger className={cn('w-[150px]', className)} aria-label="Paper size">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAPER_SIZES.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            <span className="font-medium">{p.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">{p.hint}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Prints from a dedicated copy of the receipt mounted directly under <body>.
// Printing the on-screen preview instead breaks inside dialogs (fixed position
// repeats on every page) and leaves the hidden app taking up blank A4 pages.
export function useReceiptPrint() {
  const [job, setJob] = useState<{ invoice: Invoice; paper: PaperSize; seq: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!job || !rootRef.current) return;
    void printElement(rootRef.current, job.paper);
  }, [job]);

  const printReceipt = useCallback((invoice: Invoice, paper: PaperSize) => {
    setJob((prev) => ({ invoice, paper, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  // Stays mounted after printing: mobile Safari prints asynchronously and would
  // capture an empty page if the copy were removed as soon as print() returned.
  const printPortal = job
    ? createPortal(
        <div id="print-root" ref={rootRef} aria-hidden>
          <Receipt invoice={job.invoice} paper={job.paper} />
        </div>,
        document.body,
      )
    : null;

  return { printReceipt, printPortal };
}
