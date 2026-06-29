import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto, UpdateTableStatusDto } from './dto/table.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  // Reads are available to any authenticated user (waiters/kitchen see the grid).
  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.tables.findAll(restaurantId);
  }

  @Get(':id')
  findOne(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.tables.findOne(restaurantId, id);
  }

  @Get(':id/current-order')
  currentOrder(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.tables.currentOrder(restaurantId, id);
  }

  // Table config (create/edit/delete) is an admin task.
  @Post()
  @RequirePermissions('manage_restaurant_settings')
  create(@CurrentUser('restaurantId') restaurantId: string, @Body() dto: CreateTableDto) {
    return this.tables.create(restaurantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('manage_restaurant_settings')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tables.update(restaurantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('manage_restaurant_settings')
  remove(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.tables.remove(restaurantId, id);
  }

  // Operational status change (e.g. mark CLEANING) — available to order staff.
  @Patch(':id/status')
  @RequirePermissions('view_orders')
  setStatus(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.tables.setStatus(restaurantId, id, dto.status);
  }
}
