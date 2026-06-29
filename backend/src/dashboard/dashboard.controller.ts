import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
@RequirePermissions('view_dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser('restaurantId') r: string) {
    return this.dashboard.summary(r);
  }

  @Get('recent-activities')
  recentActivities(@CurrentUser('restaurantId') r: string) {
    return this.dashboard.recentActivities(r);
  }

  @Get('sales-series')
  salesSeries(@CurrentUser('restaurantId') r: string, @Query('period') period?: string) {
    return this.dashboard.salesSeries(r, period);
  }

  @Get('inventory-status')
  inventoryStatus(@CurrentUser('restaurantId') r: string) {
    return this.dashboard.inventoryStatus(r);
  }

  @Get('staff-overview')
  staffOverview(@CurrentUser('restaurantId') r: string) {
    return this.dashboard.staffOverview(r);
  }
}
