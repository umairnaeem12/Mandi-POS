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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  // Readable by any authenticated user (waiters build orders from categories).
  @Get()
  findAll(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.categories.findAll(restaurantId, includeInactive === 'true');
  }

  @Get(':id')
  findOne(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.categories.findOne(restaurantId, id);
  }

  @Post()
  @RequirePermissions('manage_categories')
  create(@CurrentUser('restaurantId') restaurantId: string, @Body() dto: CreateCategoryDto) {
    return this.categories.create(restaurantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('manage_categories')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(restaurantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('manage_categories')
  remove(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.categories.remove(restaurantId, id);
  }
}
