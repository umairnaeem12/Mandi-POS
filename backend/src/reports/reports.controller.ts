import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { InventoryService } from '../inventory/inventory.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
@RequirePermissions('view_reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly inventory: InventoryService,
  ) {}

  @Get('sales/today')
  salesToday(@CurrentUser('restaurantId') r: string) {
    return this.reports.sales(r, 'today');
  }

  @Get('sales/weekly')
  salesWeekly(@CurrentUser('restaurantId') r: string) {
    return this.reports.sales(r, 'weekly');
  }

  @Get('sales/monthly')
  salesMonthly(@CurrentUser('restaurantId') r: string) {
    return this.reports.sales(r, 'monthly');
  }

  @Get('sales/yearly')
  salesYearly(@CurrentUser('restaurantId') r: string) {
    return this.reports.sales(r, 'yearly');
  }

  @Get('sales-series')
  salesSeries(@CurrentUser('restaurantId') r: string, @Query('period') period?: string) {
    const allowed = ['today', 'weekly', 'monthly', 'yearly'] as const;
    const p = (allowed as readonly string[]).includes(period ?? '') ? (period as (typeof allowed)[number]) : 'today';
    return this.reports.salesSeries(r, p);
  }

  @Get('revenue')
  revenue(
    @CurrentUser('restaurantId') r: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reports.revenue(r, dateFrom, dateTo);
  }

  @Get('orders')
  orders(@CurrentUser('restaurantId') r: string) {
    return this.reports.ordersReport(r);
  }

  @Get('best-selling-items')
  bestSelling(@CurrentUser('restaurantId') r: string, @Query('limit') limit?: string) {
    return this.reports.bestSelling(r, limit ? Number(limit) : undefined);
  }

  @Get('low-stock')
  lowStock(@CurrentUser('restaurantId') r: string) {
    return this.inventory.lowStock(r);
  }

  @Get('staff-performance')
  staffPerformance(@CurrentUser('restaurantId') r: string) {
    return this.reports.staffPerformance(r);
  }

  @Get('table-sales')
  tableSales(@CurrentUser('restaurantId') r: string) {
    return this.reports.tableSales(r);
  }
}
