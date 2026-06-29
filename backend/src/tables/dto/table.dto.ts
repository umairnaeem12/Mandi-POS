import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateTableDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(1)
  tableNumber!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}

export class UpdateTableDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}

export const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'] as const;

export class UpdateTableStatusDto {
  @IsIn(TABLE_STATUSES)
  status!: (typeof TABLE_STATUSES)[number];
}
