import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService, type Period } from '../reports/reports.service';
import { InventoryService } from '../inventory/inventory.service';
import { ActivitiesService } from '../activities/activities.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly inventory: InventoryService,
    private readonly activities: ActivitiesService,
  ) {}

  async summary(restaurantId: string) {
    const { from, to } = this.reports.rangeFor('today');
    const todayWhere = { restaurantId, createdAt: { gte: from, lte: to } };

    const [
      sales,
      ordersToday,
      pendingOrders,
      completedToday,
      cancelledToday,
      lowStock,
      activeStaff,
      occupiedTables,
    ] = await Promise.all([
      this.reports.sales(restaurantId, 'today'),
      this.prisma.order.count({ where: todayWhere }),
      this.prisma.order.count({ where: { restaurantId, status: { in: ['PENDING', 'PREPARING', 'SERVED'] } } }),
      this.prisma.order.count({ where: { ...todayWhere, status: 'COMPLETED' } }),
      this.prisma.order.count({ where: { ...todayWhere, status: 'CANCELLED' } }),
      this.inventory.lowStock(restaurantId),
      this.prisma.user.count({ where: { restaurantId, status: 'ACTIVE' } }),
      this.prisma.restaurantTable.count({ where: { restaurantId, status: 'OCCUPIED' } }),
    ]);

    return {
      todaySales: sales.totalRevenue,
      totalOrdersToday: ordersToday,
      totalRevenueToday: sales.totalRevenue,
      pendingOrders,
      completedOrdersToday: completedToday,
      cancelledOrdersToday: cancelledToday,
      lowStockItems: lowStock.length,
      activeStaff,
      occupiedTables,
    };
  }

  recentActivities(restaurantId: string) {
    return this.activities.findRecent(restaurantId, 20);
  }

  salesSeries(restaurantId: string, period?: string) {
    const allowed: Period[] = ['today', 'weekly', 'monthly', 'yearly'];
    const p: Period = allowed.includes(period as Period) ? (period as Period) : 'today';
    return this.reports.salesSeries(restaurantId, p);
  }

  async inventoryStatus(restaurantId: string) {
    const [totalItems, lowStock] = await Promise.all([
      this.prisma.inventoryItem.count({ where: { restaurantId, deletedAt: null, isActive: true } }),
      this.inventory.lowStock(restaurantId),
    ]);
    return { totalItems, lowStockCount: lowStock.length, lowStockItems: lowStock };
  }

  async staffOverview(restaurantId: string) {
    const staff = await this.prisma.user.findMany({
      where: { restaurantId, status: { not: 'DELETED' } },
      select: { id: true, fullName: true, status: true, role: { select: { name: true } } },
      orderBy: { fullName: 'asc' },
    });
    const active = staff.filter((s) => s.status === 'ACTIVE').length;
    return { total: staff.length, active, inactive: staff.length - active, staff };
  }
}
