import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Định nghĩa trực tiếp các size và topping chuẩn trong hệ thống (khớp với pricing.ts)
export const SIZE_IDS = ['S', 'M', 'L'] as const;
export type ProductSize = (typeof SIZE_IDS)[number];

export const TOPPING_IDS = ['cream', 'pearls'] as const;
export type ToppingId = (typeof TOPPING_IDS)[number];

export class AvailabilityLineDto {
  @ApiProperty({ example: 'p1', description: 'Mã sản phẩm (ví: p1 đến p6)' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'S', description: 'Kích thước ly', enum: SIZE_IDS })
  @IsIn(SIZE_IDS)
  size: ProductSize = 'S';

  @ApiProperty({
    example: ['cream', 'pearls'],
    description: 'Danh sách topping kèm theo',
    enum: TOPPING_IDS,
    required: false,
  })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? (value === '' ? [] : value.split(',')) : value,
  )
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(TOPPING_IDS.length)
  @IsIn(TOPPING_IDS, { each: true })
  toppingIds: ToppingId[] = [];

  @ApiProperty({ example: 1, description: 'Số lượng sản phẩm' })
  @IsNumber()
  @Min(1)
  qty: number = 1;
}

export class SelectionAvailabilityQuery {
  @ApiProperty({ example: 'S', description: 'Kích thước ly', enum: SIZE_IDS, required: false })
  @IsIn(SIZE_IDS)
  size: ProductSize = 'S';

  @ApiProperty({
    example: ['cream', 'pearls'],
    description: 'Danh sách topping kèm theo',
    enum: TOPPING_IDS,
    required: false,
  })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? (value === '' ? [] : value.split(',')) : value,
  )
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(TOPPING_IDS.length)
  @IsIn(TOPPING_IDS, { each: true })
  toppingIds: ToppingId[] = [];
}

export class CartAvailabilityDto {
  @ApiProperty({
    type: [AvailabilityLineDto],
    description: 'Danh sách các mục sản phẩm trong giỏ hàng cần kiểm tra tồn kho',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityLineDto)
  items!: AvailabilityLineDto[];
}