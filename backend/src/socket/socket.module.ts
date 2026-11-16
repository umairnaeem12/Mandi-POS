import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';

// Global so any feature module can inject RealtimeService to emit events.
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [RealtimeController],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class SocketModule {}
