import type { Namespace } from '../entry';

// Orders list and order detail. itemCount is also used by the POS and kitchen screens.
export const orders = {
  pageDescription: { en: 'Track and manage all orders.', ar: 'متابعة جميع الطلبات وإدارتها.' },
  searchPlaceholder: {
    en: 'Search order #, table, customer…',
    ar: 'ابحث برقم الطلب أو الطاولة أو العميل…',
  },
  emptyTitle: { en: 'No orders found', ar: 'لا توجد طلبات' },
  emptyDescription: {
    en: "Orders will appear here as they're created.",
    ar: 'ستظهر الطلبات هنا فور إنشائها.',
  },
  tableOrType: { en: 'Table / Type', ar: 'الطاولة / النوع' },
  itemCount: { en: 'Items: {n}', ar: 'الأصناف: {n}' },
  bill: { en: 'Bill', ar: 'الفاتورة' },
  generateBill: { en: 'Generate Bill', ar: 'إصدار الفاتورة' },
  actionFailed: { en: 'Action failed', ar: 'تعذر تنفيذ العملية' },

  cancelOrder: { en: 'Cancel order', ar: 'إلغاء الطلب' },
  cancelTitle: { en: 'Cancel {order}?', ar: 'إلغاء الطلب {order}؟' },
  cancelReasonPrompt: {
    en: 'Please provide a reason for cancelling this order.',
    ar: 'يرجى ذكر سبب إلغاء هذا الطلب.',
  },
  cancelReasonExample: {
    en: 'e.g. Customer left, duplicate order…',
    ar: 'مثال: غادر العميل، طلب مكرر…',
  },
  reasonPlaceholder: { en: 'Reason…', ar: 'السبب…' },
  keepOrder: { en: 'Keep order', ar: 'الإبقاء على الطلب' },
  cancelling: { en: 'Cancelling…', ar: 'جارٍ الإلغاء…' },
  cancelled: { en: 'Order cancelled', ar: 'تم إلغاء الطلب' },

  notFound: { en: 'Order not found.', ar: 'الطلب غير موجود.' },
  createdOn: { en: 'Created {date}', ar: 'أُنشئ في {date}' },
  unitPrice: { en: 'Unit', ar: 'سعر الوحدة' },
  grandTotal: { en: 'Grand Total', ar: 'الإجمالي الكلي' },
  timeline: { en: 'Timeline', ar: 'سجل الحالة' },
  contact: { en: 'Contact', ar: 'رقم التواصل' },
  noCustomer: { en: 'No customer attached to this order.', ar: 'لا يوجد عميل مرتبط بهذا الطلب.' },
} satisfies Namespace;
