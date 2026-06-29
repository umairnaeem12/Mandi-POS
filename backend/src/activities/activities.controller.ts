import { Controller, Get, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  @RequirePermissions('view_recent_activities')
  findRecent(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.activities.findRecent(restaurantId, limit ? Number(limit) : undefined);
  }
}
