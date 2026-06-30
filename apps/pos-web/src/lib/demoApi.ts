import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const DEMO_SESSION_KEY = 'demoAuthUser';

const now = new Date();
const iso = now.toISOString();

const settings = {
  restaurantId: 'demo-restaurant',
  restaurantName: 'Mandi Bukhari Restaurant',
  logoUrl: null,
  address: 'Demo Branch, Main Road',
  contactNumber: '+92 300 0000000',
  email: 'info@mandibukhari.local',
  currencyCode: 'PKR',
  currencySymbol: 'Rs',
  taxName: 'GST',
  taxPercentage: 16,
  isTaxEnabled: true,
  receiptHeader: 'Mandi Bukhari Restaurant',
  receiptFooter: 'Thank you for your visit.',
  invoicePrefix: 'MBR',
};

const tables = [
  { id: 't1', name: 'Table 1', tableNumber: 1, capacity: 4, status: 'AVAILABLE', activeOrder: null },
  { id: 't2', name: 'Table 2', tableNumber: 2, capacity: 6, status: 'OCCUPIED', activeOrder: null },
  { id: 't3', name: 'Family Room', tableNumber: 3, capacity: 8, status: 'RESERVED', activeOrder: null },
  { id: 't4', name: 'Outdoor 1', tableNumber: 4, capacity: 4, status: 'CLEANING', activeOrder: null },
];

const salesReport = {
  from: iso,
  to: iso,
  totalOrders: 24,
  totalRevenue: 186500,
  totalDiscount: 4500,
  totalTax: 25724,
  totalPaidAmount: 182000,
  cashPayments: 92000,
  cardPayments: 56000,
  onlinePayments: 34000,
  averageOrderValue: 7771,
};

const salesSeries = {
  period: 'today',
  granularity: 'hour',
  totalRevenue: 186500,
  totalOrders: 24,
  points: [
    { label: '10 AM', revenue: 12000, orders: 2 },
    { label: '12 PM', revenue: 36000, orders: 5 },
    { label: '2 PM', revenue: 28500, orders: 4 },
    { label: '4 PM', revenue: 18000, orders: 3 },
    { label: '6 PM', revenue: 42000, orders: 6 },
    { label: '8 PM', revenue: 50000, orders: 4 },
  ],
};

function demoData(path: string, method: string): unknown {
  if (path === '/dashboard/summary') {
    return {
      todaySales: 186500,
      totalOrdersToday: 24,
      totalRevenueToday: 186500,
      pendingOrders: 5,
      completedOrdersToday: 17,
      cancelledOrdersToday: 2,
      lowStockItems: 3,
      activeStaff: 8,
      occupiedTables: 4,
    };
  }

  if (path === '/dashboard/sales-series' || path === '/reports/sales-series') return salesSeries;
  if (path.startsWith('/reports/sales/')) return salesReport;
  if (path === '/reports/best-selling-items') {
    return [
      { menuItemId: 'm1', itemName: 'Chicken Mandi', totalQuantitySold: 18, totalRevenue: 54000 },
      { menuItemId: 'm2', itemName: 'Mutton Mandi', totalQuantitySold: 12, totalRevenue: 72000 },
      { menuItemId: 'm3', itemName: 'Kunafa', totalQuantitySold: 9, totalRevenue: 13500 },
    ];
  }
  if (path === '/dashboard/inventory-status') {
    return {
      totalItems: 18,
      lowStockCount: 3,
      lowStockItems: [
        { id: 'i1', name: 'Basmati Rice', unit: 'kg', currentStock: '8', lowStockLimit: '20' },
        { id: 'i2', name: 'Mutton', unit: 'kg', currentStock: '4', lowStockLimit: '10' },
        { id: 'i3', name: 'Mint Sauce', unit: 'ltr', currentStock: '2', lowStockLimit: '5' },
      ],
    };
  }
  if (path === '/dashboard/recent-activities') {
    return [
      { id: 'a1', action: 'ORDER_CREATED', module: 'Orders', description: 'Demo order #1024 created', createdAt: iso },
      { id: 'a2', action: 'INVOICE_PAID', module: 'Billing', description: 'Invoice MBR-104 paid in cash', createdAt: iso },
      { id: 'a3', action: 'TABLE_UPDATED', module: 'Tables', description: 'Table 2 marked occupied', createdAt: iso },
    ];
  }
  if (path === '/restaurant-settings') return settings;
  if (path === '/tables') return tables;
  if (path.startsWith('/tables/')) return tables.find((table) => path.endsWith(table.id)) ?? tables[0];

  if (method === 'get') return [];
  return { id: 'demo', success: true };
}

function normalizePath(config: InternalAxiosRequestConfig): string {
  const rawUrl = config.url ?? '/';
  const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, 'http://demo.local');
  return url.pathname.replace(/^\/api/, '');
}

export function getDemoAdapter(): AxiosAdapter | undefined {
  if (!localStorage.getItem(DEMO_SESSION_KEY)) return undefined;

  return async (adapterConfig) => {
    const response: AxiosResponse = {
      data: demoData(normalizePath(adapterConfig), (adapterConfig.method ?? 'get').toLowerCase()),
      status: 200,
      statusText: 'OK',
      headers: {},
      config: adapterConfig,
    };
    return response;
  };
}
