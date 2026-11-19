import type { Namespace } from '../entry';

export const customers = {
  subtitle: { en: 'Customer directory and order history.', ar: 'دليل العملاء وسجل طلباتهم.' },
  addCustomer: { en: 'Add Customer', ar: 'إضافة عميل' },
  searchPlaceholder: { en: 'Search name or contact…', ar: 'ابحث بالاسم أو رقم التواصل…' },
  emptyTitle: { en: 'No customers', ar: 'لا يوجد عملاء' },
  emptyDesc: {
    en: 'Customers are created here or during billing.',
    ar: 'يُضاف العملاء من هنا أو أثناء إصدار الفاتورة.',
  },
  contact: { en: 'Contact', ar: 'رقم التواصل' },
  totalSpent: { en: 'Total Spent', ar: 'إجمالي الإنفاق' },
  lastOrder: { en: 'Last Order', ar: 'آخر طلب' },
  orderHistory: { en: 'Order history', ar: 'سجل الطلبات' },
  historyTitle: { en: 'Order history: {name}', ar: 'سجل الطلبات: {name}' },
  noOrders: { en: 'No orders yet.', ar: 'لا توجد طلبات بعد.' },
  adding: { en: 'Adding…', ar: 'جارٍ الإضافة…' },
  customerAdded: { en: 'Customer added', ar: 'تمت إضافة العميل' },
  customerDeleted: { en: 'Customer deleted', ar: 'تم حذف العميل' },
  deleteTitle: { en: 'Delete {name}?', ar: 'حذف {name}؟' },
  deleteDesc: {
    en: 'This customer will be removed from the directory.',
    ar: 'سيتم حذف هذا العميل من الدليل.',
  },
} satisfies Namespace;
