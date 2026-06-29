import { Module } from '@nestjs/common';
import { RestaurantSettingsService } from './restaurant-settings.service';
import { RestaurantSettingsController } from './restaurant-settings.controller';

@Module({
  controllers: [RestaurantSettingsController],
  providers: [RestaurantSettingsService],
  exports: [RestaurantSettingsService],
})
export class RestaurantSettingsModule {}
