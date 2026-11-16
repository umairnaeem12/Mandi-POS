import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const TOKEN_TTL_SECONDS = 60 * 60;

@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Short-lived token the browser hands to Supabase Realtime. The RLS policy on
  // realtime.messages only lets it read topics carrying its own restaurant_id.
  @Get('token')
  async token(
    @CurrentUser('id') userId: string,
    @CurrentUser('restaurantId') restaurantId: string,
  ): Promise<{ token: string; restaurantId: string; expiresIn: number }> {
    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');
    if (!secret) throw new ServiceUnavailableException('Supabase Realtime is not configured');

    const token = await this.jwt.signAsync(
      { sub: userId, role: 'authenticated', restaurant_id: restaurantId },
      { secret, algorithm: 'HS256', audience: 'authenticated', expiresIn: TOKEN_TTL_SECONDS },
    );
    return { token, restaurantId, expiresIn: TOKEN_TTL_SECONDS };
  }
}
