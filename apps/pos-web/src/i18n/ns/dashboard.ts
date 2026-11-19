import type { Namespace } from '../entry';

// Dashboard page plus the shared chart and stat card widgets.
export const dashboard = {
  welcome: {
    en: "Welcome back, {name}. Here's today's overview.",
    ar: 'مرحباً بعودتك {name}، إليك نظرة عامة على اليوم.',
  },

  periodWeek: { en: 'Week', ar: 'الأسبوع' },
  periodMonth: { en: 'Month', ar: 'الشهر' },
  periodYear: { en: 'Year', ar: 'السنة' },

  todaySales: { en: "Today's Sales", ar: 'مبيعات اليوم' },
  ordersToday: { en: 'Orders Today', ar: 'طلبات اليوم' },
  completedToday: { en: 'Completed Today', ar: 'المكتملة اليوم' },
  pendingOrders: { en: 'Pending Orders', ar: 'الطلبات المعلقة' },
  avgOrderValue: { en: 'Avg Order Value', ar: 'متوسط قيمة الطلب' },
  occupiedTables: { en: 'Occupied Tables', ar: 'الطاولات المشغولة' },
  lowStockItems: { en: 'Low Stock Items', ar: 'أصناف منخفضة المخزون' },
  activeStaff: { en: 'Active Staff', ar: 'الموظفون النشطون' },

  salesOverview: { en: 'Sales Overview', ar: 'نظرة عامة على المبيعات' },
  revenueOrders: { en: '{revenue} · {n} orders', ar: '{revenue} · الطلبات: {n}' },
  revenueByPayment: { en: 'Revenue by Payment', ar: 'الإيرادات حسب طريقة الدفع' },
  byPaymentMethod: { en: 'By payment method', ar: 'حسب طريقة الدفع' },
  onlineBank: { en: 'Online / Bank', ar: 'إلكتروني / بنكي' },
  orderCountOverTime: { en: 'Order count over time', ar: 'عدد الطلبات عبر الوقت' },
  bestSelling: { en: 'Best Selling Items', ar: 'الأصناف الأكثر مبيعاً' },
  byQuantitySold: { en: 'By quantity sold', ar: 'حسب الكمية المباعة' },
  tableStatus: { en: 'Table Status', ar: 'حالة الطاولات' },
  currentFloor: { en: 'Current floor', ar: 'الوضع الحالي للصالة' },
  liveFeed: { en: 'Live operations feed', ar: 'سجل العمليات المباشر' },
  noActivity: { en: 'No activity yet', ar: 'لا يوجد نشاط بعد' },
  noActivityDesc: {
    en: 'Operations will appear here as they happen.',
    ar: 'ستظهر العمليات هنا فور حدوثها.',
  },
  inventoryAlerts: { en: 'Inventory Alerts', ar: 'تنبيهات المخزون' },
  lowOutOfStock: { en: 'Low & out of stock', ar: 'منخفض أو نافد' },
  stockHealthy: { en: 'Stock looks healthy', ar: 'المخزون بحالة جيدة' },
  noLowStock: { en: 'No low-stock items.', ar: 'لا توجد أصناف منخفضة المخزون.' },

  // Charts
  noDataYet: { en: 'No data yet', ar: 'لا توجد بيانات بعد' },
  revenue: { en: 'Revenue', ar: 'الإيرادات' },
} satisfies Namespace;
