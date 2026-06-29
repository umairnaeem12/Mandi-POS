import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export const INVENTORY_UNITS = ['KG', 'GRAM', 'LITER', 'ML', 'PIECE', 'PACKET', 'BOX', 'BOTTLE'] as const;

export class CreateInventoryItemDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(INVENTORY_UNITS)
  unit!: (typeof INVENTORY_UNITS)[number];

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  currentStock?: number; // opening stock; recorded as a STOCK_IN transaction

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  lowStockLimit?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
