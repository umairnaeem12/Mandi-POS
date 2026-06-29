import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UpdateStaffStatusDto } from './dto/update-staff-status.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('staff')
@RequirePermissions('manage_staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.staff.findAll(restaurantId);
  }

  @Get(':id')
  findOne(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.staff.findOne(restaurantId, id);
  }

  @Post()
  create(@CurrentUser('restaurantId') restaurantId: string, @Body() dto: CreateStaffDto) {
    return this.staff.create(restaurantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staff.update(restaurantId, id, dto);
  }

  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffStatusDto,
  ) {
    return this.staff.setStatus(user.restaurantId, id, dto.status, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.staff.remove(user.restaurantId, id, user.id);
  }
}
