import type { Namespace } from '../entry';

export const invoices = {
  description: { en: 'Search, view, and print receipts.', ar: 'ابحث عن الإيصالات واعرضها واطبعها.' },
  searchPlaceholder: {
    en: 'Search invoice # or customer…',
    ar: 'ابحث برقم الفاتورة أو اسم العميل…',
  },
  empty: { en: 'No invoices found', ar: 'لم يتم العثور على فواتير' },
  emptyDesc: { en: 'Generated invoices will appear here.', ar: 'ستظهر الفواتير المُنشأة هنا.' },
  invoice: { en: 'Invoice', ar: 'الفاتورة' },
  method: { en: 'Method', ar: 'طريقة الدفع' },
  printPaper: { en: 'Print ({paper})', ar: 'طباعة ({paper})' },
} satisfies Namespace;
