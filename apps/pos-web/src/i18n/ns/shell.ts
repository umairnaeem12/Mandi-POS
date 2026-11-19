import type { Namespace } from '../entry';

// App chrome: sidebar, top bars, route guards and shared widgets.
export const shell = {
  appName: { en: 'Restaurant POS', ar: 'نظام نقاط البيع' },
  pointOfSale: { en: 'Point of Sale', ar: 'نقطة البيع' },
  version: { en: 'v0.1.0 · Local network', ar: 'الإصدار 0.1.0 · شبكة محلية' },

  groupOverview: { en: 'Overview', ar: 'نظرة عامة' },
  groupOperations: { en: 'Operations', ar: 'العمليات' },
  groupCatalog: { en: 'Catalog', ar: 'القائمة والمخزون' },
  groupPeople: { en: 'People', ar: 'الفريق' },
  groupInsights: { en: 'Insights', ar: 'التحليلات' },
  groupSystem: { en: 'System', ar: 'النظام' },

  navDashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  navPos: { en: 'POS', ar: 'نقطة البيع' },
  navKitchen: { en: 'Kitchen', ar: 'المطبخ' },
  navTables: { en: 'Tables', ar: 'الطاولات' },
  navOrders: { en: 'Orders', ar: 'الطلبات' },
  navInvoices: { en: 'Invoices', ar: 'الفواتير' },
  navCustomers: { en: 'Customers', ar: 'العملاء' },
  navMenu: { en: 'Menu', ar: 'قائمة الطعام' },
  navCategories: { en: 'Categories', ar: 'الفئات' },
  navInventory: { en: 'Inventory', ar: 'المخزون' },
  navStaff: { en: 'Staff', ar: 'الموظفون' },
  navRoles: { en: 'Roles', ar: 'الأدوار' },
  navReports: { en: 'Reports', ar: 'التقارير' },
  navSettings: { en: 'Settings', ar: 'الإعدادات' },
  navMyOrders: { en: 'My Orders', ar: 'طلباتي' },

  backToDashboard: { en: 'Back to dashboard', ar: 'العودة إلى لوحة التحكم' },
  logout: { en: 'Logout', ar: 'تسجيل الخروج' },
  openMenu: { en: 'Open menu', ar: 'فتح القائمة' },
  toggleSidebar: { en: 'Toggle sidebar', ar: 'إظهار أو إخفاء الشريط الجانبي' },
  language: { en: 'Language', ar: 'اللغة' },

  recentActivity: { en: 'Recent activity', ar: 'النشاط الأخير' },
  allCaughtUp: { en: "You're all caught up", ar: 'لا يوجد جديد' },
  notifications: { en: 'Notifications', ar: 'الإشعارات' },

  accessDenied: { en: 'Access denied', ar: 'الوصول مرفوض' },
  noPermission: {
    en: "You don't have permission to view this page.",
    ar: 'ليس لديك صلاحية لعرض هذه الصفحة.',
  },

  justNow: { en: 'just now', ar: 'الآن' },
  minAgo: { en: '{n} min ago', ar: 'منذ {n} دقيقة' },
  hoursAgo: { en: '{n}h ago', ar: 'منذ {n} ساعة' },
  daysAgo: { en: '{n}d ago', ar: 'منذ {n} يوم' },
  minutesShort: { en: '{n} min', ar: '{n} د' },

  paperSize: { en: 'Paper size', ar: 'حجم الورق' },
  paperHint80: { en: 'Thermal roll (standard)', ar: 'لفافة حرارية (قياسية)' },
  paperHint58: { en: 'Thermal roll (narrow)', ar: 'لفافة حرارية (ضيقة)' },
  paperHintA4: { en: 'Office printer, full page', ar: 'طابعة مكتبية، صفحة كاملة' },
} satisfies Namespace;
