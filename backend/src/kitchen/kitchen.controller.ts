import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { KitchenStatusDto } from './dto/kitchen-status.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('kitchen')
export class KitchenController {
  constructor(private readonly orders: OrdersService) {}

  // Active orders the kitchen needs to act on (PENDING / PREPARING / SERVED).
  @Get('orders')
  @RequirePermissions('view_orders')
  orders_(@CurrentUser('restaurantId') restaurantId: string) {
    return this.orders.findAll(restaurantId, { active: true });
  }

  @Patch('orders/:id/status')
  @RequirePermissions('update_order_status')
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: KitchenStatusDto) {
    return this.orders.setStatus(user.restaurantId, id, dto.status as OrderStatus, user.id);
  }
}
