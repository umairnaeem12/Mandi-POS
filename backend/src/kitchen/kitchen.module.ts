import { Module } from '@nestjs/common';
import { KitchenController } from './kitchen.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [KitchenController],
})
export class KitchenModule {}
