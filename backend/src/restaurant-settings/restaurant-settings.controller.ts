import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RestaurantSettingsService } from './restaurant-settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { uploadedFileUrl, imageMulterOptions } from '../uploads/multer.config';

@Controller('restaurant-settings')
export class RestaurantSettingsController {
  constructor(private readonly settings: RestaurantSettingsService) {}

  // Readable by any authenticated user (currency/tax display across the app).
  @Get()
  get(@CurrentUser('restaurantId') restaurantId: string) {
    return this.settings.get(restaurantId);
  }

  @Patch()
  @RequirePermissions('manage_restaurant_settings')
  update(@CurrentUser('restaurantId') restaurantId: string, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(restaurantId, dto);
  }

  @Post('logo')
  @RequirePermissions('manage_restaurant_settings')
  @UseInterceptors(FileInterceptor('file', imageMulterOptions))
  uploadLogo(
    @CurrentUser('restaurantId') restaurantId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.settings.updateLogo(restaurantId, uploadedFileUrl(file));
  }
}
