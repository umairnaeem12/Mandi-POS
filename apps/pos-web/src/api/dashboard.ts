import { api } from '@/lib/axios';
import type { Period } from '@/api/reports';

export interface DashboardSummary {
  todaySales: number;
  totalOrdersToday: number;
  totalRevenueToday: number;
  pendingOrders: number;
  completedOrdersToday: number;
  cancelledOrdersToday: number;
  lowStockItems: number;
  activeStaff: number;
  occupiedTables: number;
}

export interface Activity {
  id: string;
  action: string;
  module: string;
  description: string;
  createdAt: string;
}

export interface SalesSeriesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface SalesSeries {
  period: Period;
  granularity: 'hour' | 'day' | 'month';
  points: SalesSeriesPoint[];
  totalRevenue: number;
  totalOrders: number;
}

export interface InventoryStatus {
  totalItems: number;
  lowStockCount: number;
  lowStockItems: {
    id: string;
    name: string;
    unit: string;
    currentStock: string;
    lowStockLimit: string;
  }[];
}

export interface StaffOverview {
  total: number;
  active: number;
  inactive: number;
  staff: { id: string; fullName: string; status: string; role: { name: string } }[];
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
  recentActivities: () => api.get<Activity[]>('/dashboard/recent-activities').then((r) => r.data),
  salesSeries: (period: Period) =>
    api.get<SalesSeries>('/dashboard/sales-series', { params: { period } }).then((r) => r.data),
  inventoryStatus: () => api.get<InventoryStatus>('/dashboard/inventory-status').then((r) => r.data),
  staffOverview: () => api.get<StaffOverview>('/dashboard/staff-overview').then((r) => r.data),
};
