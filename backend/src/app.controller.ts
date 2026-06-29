import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health(): { status: string; service: string; time: string } {
    return {
      status: 'ok',
      service: 'restaurant-pos-backend',
      time: new Date().toISOString(),
    };
  }
}
