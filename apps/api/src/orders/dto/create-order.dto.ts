import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SIZE_IDS,
  TOPPING_IDS,
  type ProductSize,
  type ToppingId,
} from '../../pricing/product-options';

export class OrderItemDto {
  @ApiProperty({ example: 'p2', description: 'Mã món (GET /products)' })
  @IsString()
  @IsNotEmpty({ message: 'productId không được để trống' })
  @MaxLength(64)
  productId!: string;

  @ApiProperty({ enum: SIZE_IDS, example: 'M' })
  @IsIn(SIZE_IDS, { message: 'Size phải thuộc S, M hoặc L' })
  size!: ProductSize;

  @ApiProperty({
    enum: TOPPING_IDS,
    isArray: true,
    example: ['pearls'],
    description: 'Không trùng topping, có thể rỗng',
  })
  @IsArray()
  @ArrayUnique({ message: 'Topping bị trùng' })
  @IsIn(TOPPING_IDS, { each: true, message: 'Topping không hợp lệ' })
  toppingIds!: ToppingId[];

  @ApiProperty({ minimum: 1, maximum: 99, example: 2 })
  @IsInt({ message: 'Số lượng (qty) phải là số nguyên' })
  @Min(1, { message: 'Số lượng (qty) phải lớn hơn hoặc bằng 1' })
  @Max(99, { message: 'Số lượng (qty) tối đa là 99' })
  qty!: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: 'THU5K',
    description: 'Mã giảm giá (không phân biệt hoa thường)',
  })
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

  @ApiProperty({ type: [OrderItemDto], description: '1–100 dòng' })
  @IsArray()
  @ArrayNotEmpty({ message: 'Danh sách items không được để trống' })
  @ArrayMaxSize(100, { message: 'Giỏ hàng tối đa 100 dòng' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
