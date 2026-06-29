import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { INVENTORY_UNITS } from './create-inventory-item.dto';

// Note: currentStock is NOT editable here — stock changes go through
// stock-in / stock-out / adjustment so a transaction is always recorded.
export class UpdateInventoryItemDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsIn(INVENTORY_UNITS)
  @IsOptional()
  unit?: (typeof INVENTORY_UNITS)[number];

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  lowStockLimit?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
