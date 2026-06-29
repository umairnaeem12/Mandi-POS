import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions('manage_roles')
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.roles.findAll(restaurantId);
  }

  @Post()
  @RequirePermissions('manage_roles')
  create(@CurrentUser('restaurantId') restaurantId: string, @Body() dto: CreateRoleDto) {
    return this.roles.create(restaurantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('manage_roles')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(restaurantId, id, dto);
  }

  @Post(':id/permissions')
  @RequirePermissions('manage_permissions')
  setPermissions(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: SetPermissionsDto,
  ) {
    return this.roles.setPermissions(restaurantId, id, dto.permissions);
  }

  @Delete(':id')
  @RequirePermissions('manage_roles')
  remove(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.roles.remove(restaurantId, id);
  }
}
