import { IsIn } from 'class-validator';

// Kitchen can only move orders to PREPARING or SERVED.
export class KitchenStatusDto {
  @IsIn(['PREPARING', 'SERVED'])
  status!: 'PREPARING' | 'SERVED';
}
