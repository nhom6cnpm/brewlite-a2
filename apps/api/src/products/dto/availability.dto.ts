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

// Định nghĩa trực tiếp các size và topping chuẩn trong hệ thống
export const SIZE_IDS = ['S', 'M', 'L'] as const;
export type ProductSize = (typeof SIZE_IDS)[number];

export const TOPPING_IDS = ['t1', 't2', 't3', 't4'] as const; // Hoặc điều chỉnh mã topping theo DB của bạn
export type ToppingId = (typeof TOPPING_IDS)[number];

export class AvailabilityLineDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsIn(SIZE_IDS)
  size: ProductSize = 'S';

  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? (value === '' ? [] : value.split(',')) : value,
  )
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(TOPPING_IDS.length)
  @IsIn(TOPPING_IDS, { each: true })
  toppingIds: ToppingId[] = [];

  @IsNumber()
  @Min(1)
  qty: number = 1;
}

export class SelectionAvailabilityQuery {
  @IsIn(SIZE_IDS)
  size: ProductSize = 'S';

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
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AvailabilityLineDto)
  items!: AvailabilityLineDto[];
}