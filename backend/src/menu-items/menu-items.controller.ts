import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { uploadedFileUrl, imageMulterOptions } from '../uploads/multer.config';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItems: MenuItemsService) {}

  @Get()
  findAll(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('availableOnly') availableOnly?: string,
  ) {
    return this.menuItems.findAll(restaurantId, {
      categoryId,
      availableOnly: availableOnly === 'true',
    });
  }

  @Get(':id')
  findOne(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.menuItems.findOne(restaurantId, id);
  }

  @Post()
  @RequirePermissions('manage_menu_items')
  create(@CurrentUser('restaurantId') restaurantId: string, @Body() dto: CreateMenuItemDto) {
    return this.menuItems.create(restaurantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('manage_menu_items')
  update(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuItems.update(restaurantId, id, dto);
  }

  @Patch(':id/availability')
  @RequirePermissions('manage_menu_items')
  setAvailability(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.menuItems.setAvailability(restaurantId, id, dto.status);
  }

  @Post(':id/image')
  @RequirePermissions('manage_menu_items')
  @UseInterceptors(FileInterceptor('file', imageMulterOptions))
  uploadImage(
    @CurrentUser('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.menuItems.addImage(restaurantId, id, uploadedFileUrl(file));
  }

  @Delete(':id')
  @RequirePermissions('manage_menu_items')
  remove(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.menuItems.remove(restaurantId, id);
  }
}
