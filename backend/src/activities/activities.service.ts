import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../socket/realtime.gateway';

interface LogInput {
  restaurantId: string;
  userId?: string;
  action: string;
  module: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // Fire-and-forget: never let audit logging break the main flow.
  async log(input: LogInput): Promise<void> {
    try {
      const activity = await this.prisma.activity.create({
        data: {
          restaurantId: input.restaurantId,
          userId: input.userId,
          action: input.action,
          module: input.module,
          description: input.description,
          metadata: input.metadata,
        },
      });
      this.realtime.toRestaurant(input.restaurantId, 'dashboard.recent_activity_created', activity);
    } catch (err) {
      this.logger.warn(`Failed to log activity: ${String(err)}`);
    }
  }

  findRecent(restaurantId: string, limit = 30) {
    return this.prisma.activity.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
