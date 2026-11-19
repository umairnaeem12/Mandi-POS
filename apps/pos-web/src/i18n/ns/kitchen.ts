import type { Namespace } from '../entry';

export const kitchen = {
  title: { en: 'Kitchen Display', ar: 'شاشة المطبخ' },
  colNew: { en: 'New Orders', ar: 'طلبات جديدة' },
  colCooking: { en: 'Cooking', ar: 'قيد الطهي' },
  colServed: { en: 'Served', ar: 'تم التقديم' },
  startCooking: { en: 'Start Cooking', ar: 'بدء الطهي' },
  markServed: { en: 'Mark Ready / Served', ar: 'جاهز / تم التقديم' },
  noOrders: { en: 'No orders', ar: 'لا توجد طلبات' },
  newOrderToast: { en: 'New order received', ar: 'وصل طلب جديد' },
  updateFailed: { en: 'Could not update order', ar: 'تعذر تحديث الطلب' },
} satisfies Namespace;
