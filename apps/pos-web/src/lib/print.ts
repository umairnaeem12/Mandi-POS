// Receipt paper sizes and the print routine shared by every page that prints.
// Each counter has its own printer, so the choice is remembered per device.

export type PaperSize = '80mm' | '58mm' | 'A4';

export const PAPER_SIZES: { value: PaperSize; label: string; hint: string }[] = [
  { value: '80mm', label: '80 mm', hint: 'Thermal roll (standard)' },
  { value: '58mm', label: '58 mm', hint: 'Thermal roll (narrow)' },
  { value: 'A4', label: 'A4', hint: 'Office printer, full page' },
];

const ROLL_WIDTH_MM: Record<Exclude<PaperSize, 'A4'>, number> = { '80mm': 80, '58mm': 58 };
const PX_PER_MM = 96 / 25.4;
// Spare paper below the footer so the cutter does not clip the last line.
const ROLL_TAIL_MM = 4;

const STORAGE_KEY = 'receiptPaperSize';
const DEFAULT_PAPER: PaperSize = '80mm';

export function isPaperSize(v: unknown): v is PaperSize {
  return PAPER_SIZES.some((p) => p.value === v);
}

export function getSavedPaperSize(): PaperSize {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isPaperSize(v) ? v : DEFAULT_PAPER;
  } catch {
    return DEFAULT_PAPER;
  }
}

export function savePaperSize(size: PaperSize): void {
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    // Private mode or blocked storage: the choice just won't be remembered.
  }
}

// Chrome ignores `size: 80mm auto`, so a roll gets the receipt's measured length.
// #print-root is laid out off-screen at print width (index.css), so this matches.
function pageRule(size: PaperSize, root: HTMLElement): string {
  if (size === 'A4') return 'size: A4 portrait; margin: 12mm;';
  const receipt = root.querySelector<HTMLElement>('.receipt');
  const heightMm = receipt ? Math.ceil(receipt.getBoundingClientRect().height / PX_PER_MM) + ROLL_TAIL_MM : 297;
  return `size: ${ROLL_WIDTH_MM[size]}mm ${heightMm}mm; margin: 0;`;
}

// @page cannot be switched by a class, so the rule is (re)written before each print.
function applyPageRule(rule: string): void {
  let el = document.getElementById('print-page-rule') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'print-page-rule';
    document.head.appendChild(el);
  }
  el.textContent = `@page { ${rule} }`;
}

// A freshly mounted receipt may still be loading the logo; printing early drops it.
function waitForImages(root: HTMLElement, timeoutMs = 3000): Promise<void> {
  const pending = Array.from(root.querySelectorAll('img'))
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([Promise.all(pending).then(() => undefined), timeout]);
}

export async function printElement(root: HTMLElement, size: PaperSize): Promise<void> {
  // Measure only once the logo and fonts are in, or the roll comes out short.
  await waitForImages(root);
  await document.fonts?.ready;
  applyPageRule(pageRule(size, root));
  window.print();
}
