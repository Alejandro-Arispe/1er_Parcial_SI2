import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SaleItemDto } from './sale-item.dto.js';

export class CreateInStoreSaleDto {
  @IsUUID('4')
  idempotencyKey: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  branchId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  clientId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  reservationId?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  expectedTotal: number;

  @IsIn(['CASH', 'CARD', 'QR', 'BANK_TRANSFER'])
  paymentMethod: 'CASH' | 'CARD' | 'QR' | 'BANK_TRANSFER';

  @IsOptional()
  @IsString()
  @MaxLength(175)
  paymentReference?: string;
}
