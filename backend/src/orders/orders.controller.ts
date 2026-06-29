import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import {
  AddItemDto,
  CancelOrderDto,
  CreateOrderDto,
  UpdateItemDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @RequirePermissions('view_orders')
  findAll(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('status') status?: OrderStatus,
    @Query('tableId') tableId?: string,
    @Query('active') active?: string,
  ) {
    return this.orders.findAll(restaurantId, { status, tableId, active: active === 'true' });
  }

  @Get('table/:tableId/active')
  @RequirePermissions('view_orders')
  activeForTable(@CurrentUser('restaurantId') restaurantId: string, @Param('tableId') tableId: string) {
    return this.orders.activeForTable(restaurantId, tableId);
  }

  @Get(':id')
  @RequirePermissions('view_orders')
  findOne(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.orders.findOne(restaurantId, id);
  }

  @Post()
  @RequirePermissions('create_order')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.restaurantId, user.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('update_order')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.orders.update(restaurantId, id, dto);
  }

  @Post(':id/items')
  @RequirePermissions('update_order')
  addItem(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    return this.orders.addItem(restaurantId, id, dto);
  }

  @Patch(':id/items/:itemId')
  @RequirePermissions('update_order')
  updateItem(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.orders.updateItem(restaurantId, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @RequirePermissions('update_order')
  removeItem(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.orders.removeItem(restaurantId, id, itemId);
  }

  @Patch(':id/status')
  @RequirePermissions('update_order_status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.setStatus(user.restaurantId, id, dto.status as OrderStatus, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('cancel_order')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancel(user.restaurantId, id, dto.reason, user.id);
  }
}
