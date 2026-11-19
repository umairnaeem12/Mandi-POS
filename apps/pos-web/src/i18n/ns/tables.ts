import type { Namespace } from '../entry';

export const tables = {
  title: { en: 'Tables', ar: 'الطاولات' },
  subtitle: {
    en: 'Manage your restaurant floor and table status.',
    ar: 'إدارة صالة المطعم وحالة الطاولات.',
  },
  addTable: { en: 'Add Table', ar: 'إضافة طاولة' },
  editTable: { en: 'Edit Table', ar: 'تعديل الطاولة' },
  emptyTitle: { en: 'No tables yet', ar: 'لا توجد طاولات بعد' },
  emptyDesc: {
    en: 'Add your first table to start taking dine-in orders.',
    ar: 'أضف أول طاولة لبدء استقبال طلبات الصالة.',
  },
  seats: { en: '{n} seats', ar: 'السعة: {n}' },
  tableOptions: { en: 'Table options', ar: 'خيارات الطاولة' },
  setStatus: { en: 'Set status', ar: 'تغيير الحالة' },
  viewActiveOrder: { en: 'View active order', ar: 'عرض الطلب الحالي' },
  noActiveOrder: { en: 'No active order', ar: 'لا يوجد طلب حالي' },
  added: { en: 'Table added', ar: 'تمت إضافة الطاولة' },
  updated: { en: 'Table updated', ar: 'تم تحديث الطاولة' },
  removed: { en: 'Table removed', ar: 'تم حذف الطاولة' },
  deleteTitle: { en: 'Delete {name}?', ar: 'حذف {name}؟' },
  deleteDesc: {
    en: 'This table will be removed. Tables with active orders cannot be deleted.',
    ar: 'سيتم حذف هذه الطاولة. لا يمكن حذف طاولة عليها طلب حالي.',
  },
  tableName: { en: 'Table name', ar: 'اسم الطاولة' },
  tableNamePlaceholder: { en: 'e.g. Family Table 1', ar: 'مثال: طاولة العائلة 1' },
  tableNumber: { en: 'Table number', ar: 'رقم الطاولة' },
  numberLocked: { en: "Number can't be changed.", ar: 'لا يمكن تغيير الرقم.' },
  capacity: { en: 'Capacity', ar: 'السعة' },
} satisfies Namespace;
