import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('customers')
@RequirePermissions('manage_customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.customers.findAll(restaurantId);
  }

  @Get('search')
  search(@CurrentUser('restaurantId') restaurantId: string, @Query('q') q = '') {
    return this.customers.search(restaurantId, q);
  }

  @Get(':id')
  findOne(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.customers.findOne(restaurantId, id);
  }

  @Get(':id/orders')
  orders(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.customers.orders(restaurantId, id);
  }

  @Post()
  create(@CurrentUser('restaurantId') restaurantId: string, @Body() dto: CreateCustomerDto) {
    return this.customers.create(restaurantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(restaurantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.customers.remove(restaurantId, id);
  }
}
