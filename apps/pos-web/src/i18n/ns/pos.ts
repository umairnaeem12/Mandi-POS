import type { Namespace } from '../entry';

// Waiter tables grid and the POS order-taking screen.
export const pos = {
  tablesDescription: {
    en: 'Select a table to start or view an order.',
    ar: 'اختر طاولة لبدء طلب أو عرضه.',
  },
  noTables: { en: 'No tables', ar: 'لا توجد طاولات' },
  noTablesMatch: { en: 'No tables match this filter.', ar: 'لا توجد طاولات مطابقة لهذه التصفية.' },
  seats: { en: '{n} seats', ar: 'المقاعد: {n}' },
  tapToStart: { en: 'Tap to start an order', ar: 'اضغط لبدء طلب' },

  allItems: { en: 'All Items', ar: 'جميع الأصناف' },
  searchMenu: { en: 'Search menu items…', ar: 'ابحث في قائمة الطعام…' },
  noMenuItems: { en: 'No menu items found', ar: 'لا توجد أصناف' },
  noMenuItemsHint: {
    en: 'Try another category or search term.',
    ar: 'جرّب فئة أخرى أو كلمة بحث مختلفة.',
  },
  outOfStock: { en: 'Out of stock', ar: 'نفد المخزون' },

  newOrder: { en: 'New', ar: 'جديد' },
  each: { en: '{price} each', ar: '{price} للوحدة' },
  addNote: { en: 'Add note', ar: 'إضافة ملاحظة' },
  removeItem: { en: 'Remove item', ar: 'حذف الصنف' },
  emptyCartTitle: { en: 'No items yet', ar: 'لا توجد أصناف بعد' },
  emptyCartHint: {
    en: 'Tap menu items to build this order.',
    ar: 'اضغط على أصناف القائمة لإضافتها إلى الطلب.',
  },
  sentHint: {
    en: 'Sent to kitchen. Tap items to add more.',
    ar: 'أُرسل إلى المطبخ. اضغط على الأصناف لإضافة المزيد.',
  },
  sendToKitchen: { en: 'Send to Kitchen', ar: 'إرسال إلى المطبخ' },
  sending: { en: 'Sending…', ar: 'جارٍ الإرسال…' },
  sentToKitchen: { en: 'Order sent to kitchen', ar: 'تم إرسال الطلب إلى المطبخ' },

  noteFor: { en: 'Note for {name}', ar: 'ملاحظة على {name}' },
  notePlaceholder: { en: 'e.g. No mayo, extra spicy…', ar: 'مثال: بدون مايونيز، حار جداً…' },
  saveNote: { en: 'Save note', ar: 'حفظ الملاحظة' },
} satisfies Namespace;
