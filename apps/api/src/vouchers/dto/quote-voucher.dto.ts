import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SIZE_IDS,
  TOPPING_IDS,
  type ProductSize,
  type ToppingId,
} from '../../pricing/product-options';

/** Same item fields as Mai's CartItem, deliberately excludes client prices. */
export class VoucherCartItemDto {
  @ApiProperty({ example: 'p1', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  productId!: string;

  @ApiProperty({ enum: SIZE_IDS })
  @IsIn(SIZE_IDS, { message: 'Size phải thuộc S, M hoặc L.' })
  size!: ProductSize;

  @ApiProperty({
    type: String,
    enum: TOPPING_IDS,
    isArray: true,
    example: ['cream'],
  })
  @IsArray()
  @ArrayMaxSize(TOPPING_IDS.length)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(64, { each: true })
  @IsIn(TOPPING_IDS, { each: true, message: 'Topping không hợp lệ.' })
  toppingIds!: ToppingId[];

  @ApiProperty({ minimum: 1, maximum: 99, example: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  qty!: number;
}

export class QuoteVoucherDto {
  @ApiProperty({ type: [VoucherCartItemDto], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => VoucherCartItemDto)
  items!: VoucherCartItemDto[];

  @ApiPropertyOptional({ example: 'NHAP7K', maxLength: 32 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{0,31}$/, {
    message:
      'Mã giảm giá phải có 1–32 ký tự chữ, số, dấu gạch ngang hoặc gạch dưới.',
  })
  voucherCode?: string;
}
