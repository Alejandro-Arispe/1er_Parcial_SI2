import { Type, Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent = 0;

  @IsOptional()
  @IsDateString()
  promotionStart?: string;

  @IsOptional()
  @IsDateString()
  promotionEnd?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  seasonId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  collectionId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  supplierId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  sizeIds: number[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  colorIds: number[];
}
