import type { Namespace } from '../entry';

export const reports = {
  description: {
    en: 'Sales, items, tables, and staff performance.',
    ar: 'المبيعات والأصناف والطاولات وأداء الموظفين.',
  },
  avgOrder: { en: 'Avg Order', ar: 'متوسط الطلب' },
  salesOverTime: { en: 'Sales Over Time', ar: 'المبيعات عبر الوقت' },
  noSales: { en: 'No sales yet', ar: 'لا توجد مبيعات بعد' },
  tableSales: { en: 'Table-wise Sales', ar: 'المبيعات حسب الطاولة' },
  completedOrdersRevenue: { en: 'Completed orders revenue', ar: 'إيرادات الطلبات المكتملة' },
  sales: { en: 'Sales', ar: 'المبيعات' },
  staffPerformance: { en: 'Staff Performance', ar: 'أداء الموظفين' },
  staff: { en: 'Staff', ar: 'الموظف' },
  invoices: { en: 'Invoices', ar: 'الفواتير' },
} satisfies Namespace;
