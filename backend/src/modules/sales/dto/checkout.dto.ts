import { Type } from 'class-transformer';
import { IsIn, IsInt, IsUUID, Matches, Max, Min } from 'class-validator';

export class CheckoutPreviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  cartId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  branchId: number;
}

export class CheckoutDto extends CheckoutPreviewDto {
  @IsUUID('4')
  idempotencyKey: string;

  @IsIn(['WEB', 'MOBILE'])
  channel: 'WEB' | 'MOBILE';

  @Matches(/^[a-f0-9]{64}$/)
  quoteHash: string;
}
