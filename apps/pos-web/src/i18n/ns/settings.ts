import type { Namespace } from '../entry';

// Labels only. Stored values (receipt header/footer, names) are never translated.
export const settings = {
  title: { en: 'Restaurant Settings', ar: 'إعدادات المطعم' },
  subtitle: {
    en: 'Branding, tax, currency, and receipt configuration.',
    ar: 'الهوية والضريبة والعملة وإعدادات الإيصال.',
  },
  saved: { en: 'Settings saved', ar: 'تم حفظ الإعدادات' },
  logoUpdated: { en: 'Logo updated', ar: 'تم تحديث الشعار' },

  branding: { en: 'Branding', ar: 'الهوية' },
  logoAlt: { en: 'Restaurant logo', ar: 'شعار المطعم' },
  uploadLogo: { en: 'Upload logo', ar: 'رفع الشعار' },
  uploading: { en: 'Uploading…', ar: 'جارٍ الرفع…' },
  restaurantName: { en: 'Restaurant name', ar: 'اسم المطعم' },
  contactNumber: { en: 'Contact number', ar: 'رقم التواصل' },

  taxCurrency: { en: 'Tax & Currency', ar: 'الضريبة والعملة' },
  enableTax: { en: 'Enable tax', ar: 'تفعيل الضريبة' },
  enableTaxHint: { en: 'Apply tax to invoices automatically.', ar: 'تطبيق الضريبة على الفواتير تلقائياً.' },
  currencyCode: { en: 'Currency code', ar: 'رمز العملة' },
  currencySymbol: { en: 'Currency symbol', ar: 'علامة العملة' },
  taxName: { en: 'Tax name', ar: 'اسم الضريبة' },
  taxPercent: { en: 'Tax %', ar: 'نسبة الضريبة %' },

  receiptInvoice: { en: 'Receipt & Invoice', ar: 'الإيصال والفاتورة' },
  invoicePrefix: { en: 'Invoice prefix', ar: 'بادئة رقم الفاتورة' },
  receiptHeader: { en: 'Receipt header', ar: 'رأس الإيصال' },
  receiptFooter: { en: 'Receipt footer', ar: 'تذييل الإيصال' },
} satisfies Namespace;
