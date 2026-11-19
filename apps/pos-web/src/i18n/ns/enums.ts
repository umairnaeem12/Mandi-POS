import type { Namespace } from '../entry';

// Labels for backend enum values and seeded role names. Read these through
// tEnum() so an unknown value falls back to the raw string.
export const enums = {
  'orderStatus.PENDING': { en: 'Pending', ar: 'قيد الانتظار' },
  'orderStatus.PREPARING': { en: 'Preparing', ar: 'قيد التحضير' },
  'orderStatus.SERVED': { en: 'Served', ar: 'تم التقديم' },
  'orderStatus.COMPLETED': { en: 'Completed', ar: 'مكتمل' },
  'orderStatus.CANCELLED': { en: 'Cancelled', ar: 'ملغى' },

  'paymentStatus.UNPAID': { en: 'Unpaid', ar: 'غير مدفوع' },
  'paymentStatus.PARTIAL': { en: 'Partial', ar: 'مدفوع جزئياً' },
  'paymentStatus.PAID': { en: 'Paid', ar: 'مدفوع' },
  'paymentStatus.REFUNDED': { en: 'Refunded', ar: 'مسترد' },

  'tableStatus.AVAILABLE': { en: 'Available', ar: 'متاحة' },
  'tableStatus.OCCUPIED': { en: 'Occupied', ar: 'مشغولة' },
  'tableStatus.RESERVED': { en: 'Reserved', ar: 'محجوزة' },
  'tableStatus.CLEANING': { en: 'Cleaning', ar: 'قيد التنظيف' },

  'orderType.DINE_IN': { en: 'Dine-in', ar: 'داخل المطعم' },
  'orderType.TAKEAWAY': { en: 'Takeaway', ar: 'سفري' },
  'orderType.DELIVERY': { en: 'Delivery', ar: 'توصيل' },

  'paymentMethod.CASH': { en: 'Cash', ar: 'نقداً' },
  'paymentMethod.CARD': { en: 'Card', ar: 'بطاقة' },
  'paymentMethod.BANK_TRANSFER': { en: 'Bank transfer', ar: 'تحويل بنكي' },
  'paymentMethod.ONLINE': { en: 'Online', ar: 'دفع إلكتروني' },
  'paymentMethod.SPLIT': { en: 'Split', ar: 'دفع مقسّم' },

  'discountType.FIXED': { en: 'Fixed amount', ar: 'مبلغ ثابت' },
  'discountType.PERCENTAGE': { en: 'Percentage', ar: 'نسبة مئوية' },

  'staffStatus.ACTIVE': { en: 'Active', ar: 'نشط' },
  'staffStatus.INACTIVE': { en: 'Inactive', ar: 'غير نشط' },
  'staffStatus.DELETED': { en: 'Deleted', ar: 'محذوف' },

  'unit.KG': { en: 'kg', ar: 'كغ' },
  'unit.GRAM': { en: 'g', ar: 'غ' },
  'unit.LITER': { en: 'L', ar: 'لتر' },
  'unit.ML': { en: 'ml', ar: 'مل' },
  'unit.PIECE': { en: 'pcs', ar: 'قطعة' },
  'unit.PACKET': { en: 'packet', ar: 'عبوة' },
  'unit.BOX': { en: 'box', ar: 'صندوق' },
  'unit.BOTTLE': { en: 'bottle', ar: 'زجاجة' },

  'stockTx.STOCK_IN': { en: 'Stock in', ar: 'إضافة مخزون' },
  'stockTx.STOCK_OUT': { en: 'Stock out', ar: 'صرف مخزون' },
  'stockTx.ORDER_CONSUMPTION': { en: 'Order consumption', ar: 'استهلاك الطلبات' },
  'stockTx.WASTAGE': { en: 'Wastage', ar: 'هدر' },
  'stockTx.ADJUSTMENT': { en: 'Adjustment', ar: 'تسوية' },
  'stockTx.RETURN': { en: 'Return', ar: 'مرتجع' },

  'role.Admin': { en: 'Admin', ar: 'مسؤول النظام' },
  'role.Manager': { en: 'Manager', ar: 'المدير' },
  'role.Cashier': { en: 'Cashier', ar: 'الكاشير' },
  'role.Waiter': { en: 'Waiter', ar: 'النادل' },
  'role.Kitchen': { en: 'Kitchen', ar: 'المطبخ' },
  'role.Inventory': { en: 'Inventory', ar: 'مسؤول المخزون' },

  'module.orders': { en: 'Orders', ar: 'الطلبات' },
  'module.invoices': { en: 'Invoices', ar: 'الفواتير' },
} satisfies Namespace;
