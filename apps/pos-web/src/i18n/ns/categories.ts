import type { Namespace } from '../entry';

export const categories = {
  subtitle: { en: 'Organize your menu into categories.', ar: 'نظّم قائمة الطعام في فئات.' },
  addCategory: { en: 'Add Category', ar: 'إضافة فئة' },
  editCategory: { en: 'Edit Category', ar: 'تعديل الفئة' },
  emptyTitle: { en: 'No categories yet', ar: 'لا توجد فئات بعد' },
  emptyDesc: {
    en: 'Create your first category to group menu items.',
    ar: 'أنشئ أول فئة لتجميع أصناف القائمة.',
  },
  namePlaceholder: { en: 'e.g. Grill', ar: 'مثال: Grill' },
  descriptionOptional: { en: 'Description (optional)', ar: 'الوصف (اختياري)' },
  categoryAdded: { en: 'Category added', ar: 'تمت إضافة الفئة' },
  categoryUpdated: { en: 'Category updated', ar: 'تم تحديث الفئة' },
  categoryDeleted: { en: 'Category deleted', ar: 'تم حذف الفئة' },
  deleteTitle: { en: 'Delete {name}?', ar: 'حذف {name}؟' },
  deleteDesc: {
    en: 'This category will be removed. Items in it will need re-assigning.',
    ar: 'سيتم حذف هذه الفئة، ويجب نقل أصنافها إلى فئة أخرى.',
  },
} satisfies Namespace;
