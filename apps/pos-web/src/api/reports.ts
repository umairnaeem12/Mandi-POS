import { api } from '@/lib/axios';

export interface SalesReport {
  from: string;
  to: string;
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  totalPaidAmount: number;
  cashPayments: number;
  cardPayments: number;
  onlinePayments: number;
  averageOrderValue: number;
}

export interface BestSellingItem {
  menuItemId: string | null;
  itemName: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface StaffPerf {
  staffId: string;
  staffName: string;
  role: string;
  ordersCreated: number;
  invoicesGenerated: number;
  totalSales: number;
}

export interface TableSale {
  tableId: string;
  name: string;
  tableNumber: number;
  completedOrders: number;
  totalSales: number;
}

export type Period = 'today' | 'weekly' | 'monthly' | 'yearly';

export interface SalesSeries {
  period: Period;
  granularity: 'hour' | 'day' | 'month';
  points: { label: string; revenue: number; orders: number }[];
  totalRevenue: number;
  totalOrders: number;
}

export const reportsApi = {
  sales: (period: Period) => api.get<SalesReport>(`/reports/sales/${period}`).then((r) => r.data),
  salesSeries: (period: Period) =>
    api.get<SalesSeries>('/reports/sales-series', { params: { period } }).then((r) => r.data),
  bestSelling: (limit = 10) =>
    api.get<BestSellingItem[]>('/reports/best-selling-items', { params: { limit } }).then((r) => r.data),
  staffPerformance: () => api.get<StaffPerf[]>('/reports/staff-performance').then((r) => r.data),
  tableSales: () => api.get<TableSale[]>('/reports/table-sales').then((r) => r.data),
};
