import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerContact?: string;

  @IsIn(['FIXED', 'PERCENTAGE'])
  @IsOptional()
  discountType?: 'FIXED' | 'PERCENTAGE';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discountValue?: number;
}

export class PayInvoiceDto {
  @IsIn(['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'SPLIT'])
  paymentMethod!: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE' | 'SPLIT';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsString()
  @IsOptional()
  referenceNumber?: string;
}
