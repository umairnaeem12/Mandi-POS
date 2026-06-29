import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { envValidationSchema } from './config/env.validation';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RestaurantSettingsModule } from './restaurant-settings/restaurant-settings.module';
import { CategoriesModule } from './categories/categories.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { InventoryModule } from './inventory/inventory.module';
import { SocketModule } from './socket/socket.module';
import { TablesModule } from './tables/tables.module';
import { OrdersModule } from './orders/orders.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CustomersModule } from './customers/customers.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ActivitiesModule } from './activities/activities.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    SocketModule,
    ActivitiesModule,
    AuthModule,
    StaffModule,
    RolesModule,
    PermissionsModule,
    RestaurantSettingsModule,
    CategoriesModule,
    MenuItemsModule,
    InventoryModule,
    TablesModule,
    OrdersModule,
    KitchenModule,
    InvoicesModule,
    CustomersModule,
    ReportsModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
