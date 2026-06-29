import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class StockInDto {
  @IsString()
  @IsNotEmpty()
  inventoryItemId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsIn(['STOCK_IN', 'RETURN'])
  @IsOptional()
  type?: 'STOCK_IN' | 'RETURN';

  @IsString()
  @IsOptional()
  notes?: string;
}

export class StockOutDto {
  @IsString()
  @IsNotEmpty()
  inventoryItemId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsIn(['STOCK_OUT', 'WASTAGE'])
  @IsOptional()
  type?: 'STOCK_OUT' | 'WASTAGE';

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AdjustmentDto {
  @IsString()
  @IsNotEmpty()
  inventoryItemId!: string;

  // Absolute target stock after adjustment (e.g. after a physical count).
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  newStock!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
