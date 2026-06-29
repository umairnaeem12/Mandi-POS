import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemInputDto {
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderDto {
  @IsIn(['DINE_IN', 'TAKEAWAY'])
  orderType!: 'DINE_IN' | 'TAKEAWAY';

  // Required for DINE_IN, omitted for TAKEAWAY.
  @IsString()
  @IsOptional()
  tableId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  @ArrayMinSize(1)
  items!: OrderItemInputDto[];
}

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  tableId?: string;
}

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateItemDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @IsIn(['PENDING', 'PREPARING', 'SERVED', 'COMPLETED'])
  status!: 'PENDING' | 'PREPARING' | 'SERVED' | 'COMPLETED';
}

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
