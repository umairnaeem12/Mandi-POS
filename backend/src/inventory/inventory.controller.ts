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
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { AdjustmentDto, StockInDto, StockOutDto } from './dto/stock-movement.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('items')
  @RequirePermissions('view_inventory')
  findAll(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.inventory.findAll(restaurantId, includeInactive === 'true');
  }

  @Get('items/:id')
  @RequirePermissions('view_inventory')
  findOne(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.inventory.findOne(restaurantId, id);
  }

  @Post('items')
  @RequirePermissions('manage_inventory')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInventoryItemDto) {
    return this.inventory.create(user.restaurantId, user.id, dto);
  }

  @Patch('items/:id')
  @RequirePermissions('manage_inventory')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventory.update(restaurantId, id, dto);
  }

  @Delete('items/:id')
  @RequirePermissions('manage_inventory')
  remove(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.inventory.remove(restaurantId, id);
  }

  @Post('stock-in')
  @RequirePermissions('manage_inventory')
  stockIn(@CurrentUser() user: AuthUser, @Body() dto: StockInDto) {
    return this.inventory.stockIn(user.restaurantId, user.id, dto);
  }

  @Post('stock-out')
  @RequirePermissions('manage_inventory')
  stockOut(@CurrentUser() user: AuthUser, @Body() dto: StockOutDto) {
    return this.inventory.stockOut(user.restaurantId, user.id, dto);
  }

  @Post('adjustment')
  @RequirePermissions('manage_inventory')
  adjustment(@CurrentUser() user: AuthUser, @Body() dto: AdjustmentDto) {
    return this.inventory.adjustment(user.restaurantId, user.id, dto);
  }

  @Get('transactions')
  @RequirePermissions('view_inventory')
  transactions(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('inventoryItemId') inventoryItemId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventory.transactions(restaurantId, {
      inventoryItemId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('low-stock')
  @RequirePermissions('view_inventory')
  lowStock(@CurrentUser('restaurantId') restaurantId: string) {
    return this.inventory.lowStock(restaurantId);
  }
}
