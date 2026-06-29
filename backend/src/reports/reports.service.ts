import { Injectable } from '@nestjs/common';
import { Prisma, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type Period = 'today' | 'weekly' | 'monthly' | 'yearly';
type Granularity = 'hour' | 'day' | 'month';

function num(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d) : 0;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Date range for a named period (server local time).
  rangeFor(period: Period, now = new Date()): { from: Date; to: Date } {
    const to = now;
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    if (period === 'weekly') from.setDate(from.getDate() - 6);
    else if (period === 'monthly') from.setDate(1);
    else if (period === 'yearly') {
      from.setMonth(0, 1);
    }
    return { from, to };
  }

  async salesSummary(restaurantId: string, from: Date, to: Date) {
    const where: Prisma.InvoiceWhereInput = { restaurantId, createdAt: { gte: from, lte: to } };

    const all = await this.prisma.invoice.aggregate({
      where,
      _count: true,
      _sum: { discountAmount: true, taxAmount: true, paidAmount: true },
    });
    const paid = await this.prisma.invoice.aggregate({
      where: { ...where, paymentStatus: 'PAID' },
      _sum: { grandTotal: true },
    });
    const payments = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: { restaurantId, createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    const byMethod = (m: PaymentMethod) =>
      num(payments.find((p) => p.paymentMethod === m)?._sum.amount ?? null);

    const totalOrders = all._count;
    const totalRevenue = num(paid._sum.grandTotal);

    return {
      from,
      to,
      totalOrders,
      totalRevenue,
      totalDiscount: num(all._sum.discountAmount),
      totalTax: num(all._sum.taxAmount),
      totalPaidAmount: num(all._sum.paidAmount),
      cashPayments: byMethod('CASH'),
      cardPayments: byMethod('CARD'),
      onlinePayments: byMethod('ONLINE') + byMethod('BANK_TRANSFER'),
      averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
    };
  }

  sales(restaurantId: string, period: Period) {
    const { from, to } = this.rangeFor(period);
    return this.salesSummary(restaurantId, from, to);
  }

  // Time-bucketed paid revenue for the dashboard sales chart.
  // today -> hourly, weekly/monthly -> daily, yearly -> monthly.
  async salesSeries(restaurantId: string, period: Period) {
    const { from, to } = this.rangeFor(period);
    const granularity: Granularity = period === 'today' ? 'hour' : period === 'yearly' ? 'month' : 'day';

    const invoices = await this.prisma.invoice.findMany({
      where: { restaurantId, paymentStatus: 'PAID', createdAt: { gte: from, lte: to } },
      select: { grandTotal: true, createdAt: true },
    });

    const buckets = this.buildBuckets(from, to, granularity, period);
    for (const inv of invoices) {
      const b = buckets.get(this.bucketKey(inv.createdAt, granularity));
      if (b) {
        b.revenue += num(inv.grandTotal);
        b.orders += 1;
      }
    }
    const points = [...buckets.values()];
    return {
      period,
      granularity,
      points,
      totalRevenue: points.reduce((s, p) => s + p.revenue, 0),
      totalOrders: points.reduce((s, p) => s + p.orders, 0),
    };
  }

  private buildBuckets(from: Date, to: Date, g: Granularity, period: Period) {
    const map = new Map<string, { label: string; revenue: number; orders: number }>();
    const cur = new Date(from);
    if (g === 'hour') cur.setMinutes(0, 0, 0);
    else if (g === 'day') cur.setHours(0, 0, 0, 0);
    else {
      cur.setDate(1);
      cur.setHours(0, 0, 0, 0);
    }
    while (cur <= to) {
      map.set(this.bucketKey(cur, g), { label: this.bucketLabel(cur, g, period), revenue: 0, orders: 0 });
      if (g === 'hour') cur.setHours(cur.getHours() + 1);
      else if (g === 'day') cur.setDate(cur.getDate() + 1);
      else cur.setMonth(cur.getMonth() + 1);
    }
    return map;
  }

  private bucketKey(date: Date, g: Granularity): string {
    const d = new Date(date);
    if (g === 'hour') return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    if (g === 'day') return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return `${d.getFullYear()}-${d.getMonth()}`;
  }

  private bucketLabel(d: Date, g: Granularity, period: Period): string {
    if (g === 'hour') {
      const h = d.getHours();
      const ampm = h < 12 ? 'AM' : 'PM';
      const hr = h % 12 === 0 ? 12 : h % 12;
      return `${hr} ${ampm}`;
    }
    if (g === 'day') {
      return period === 'weekly'
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short' });
  }

  revenue(restaurantId: string, dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : this.rangeFor('monthly').from;
    const to = dateTo ? new Date(dateTo) : new Date();
    return this.salesSummary(restaurantId, from, to);
  }

  async ordersReport(restaurantId: string) {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      where: { restaurantId },
      _count: true,
    });
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
    return {
      pending: byStatus.PENDING ?? 0,
      preparing: byStatus.PREPARING ?? 0,
      served: byStatus.SERVED ?? 0,
      completed: byStatus.COMPLETED ?? 0,
      cancelled: byStatus.CANCELLED ?? 0,
      total: grouped.reduce((s, g) => s + g._count, 0),
    };
  }

  async bestSelling(restaurantId: string, limit = 10) {
    const grouped = await this.prisma.invoiceItem.groupBy({
      by: ['menuItemId', 'itemName'],
      where: { invoice: { restaurantId } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });
    return grouped.map((g) => ({
      menuItemId: g.menuItemId,
      itemName: g.itemName,
      totalQuantitySold: g._sum.quantity ?? 0,
      totalRevenue: num(g._sum.totalPrice),
    }));
  }

  async staffPerformance(restaurantId: string) {
    const users = await this.prisma.user.findMany({
      where: { restaurantId, status: { not: 'DELETED' } },
      select: { id: true, fullName: true, role: { select: { name: true } } },
    });
    const ordersByUser = await this.prisma.order.groupBy({
      by: ['createdById'],
      where: { restaurantId },
      _count: true,
    });
    const invByUser = await this.prisma.invoice.groupBy({
      by: ['createdById'],
      where: { restaurantId },
      _count: true,
      _sum: { grandTotal: true },
    });
    return users.map((u) => {
      const o = ordersByUser.find((x) => x.createdById === u.id);
      const inv = invByUser.find((x) => x.createdById === u.id);
      return {
        staffId: u.id,
        staffName: u.fullName,
        role: u.role.name,
        ordersCreated: o?._count ?? 0,
        invoicesGenerated: inv?._count ?? 0,
        totalSales: num(inv?._sum.grandTotal ?? null),
      };
    });
  }

  async tableSales(restaurantId: string) {
    const tables = await this.prisma.restaurantTable.findMany({
      where: { restaurantId },
      orderBy: { tableNumber: 'asc' },
    });
    const grouped = await this.prisma.order.groupBy({
      by: ['tableId'],
      where: { restaurantId, status: 'COMPLETED' },
      _count: true,
      _sum: { grandTotal: true },
    });
    return tables.map((t) => {
      const g = grouped.find((x) => x.tableId === t.id);
      return {
        tableId: t.id,
        name: t.name,
        tableNumber: t.tableNumber,
        completedOrders: g?._count ?? 0,
        totalSales: num(g?._sum.grandTotal ?? null),
      };
    });
  }
}
