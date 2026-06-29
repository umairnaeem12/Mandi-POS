import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ReportsModule } from '../reports/reports.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [ReportsModule, InventoryModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
