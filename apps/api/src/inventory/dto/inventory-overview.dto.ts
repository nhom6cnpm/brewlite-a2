import { ApiProperty } from '@nestjs/swagger';

export class IngredientOverviewDto {
  @ApiProperty({ example: 'coffee' }) id!: string;
  @ApiProperty({ example: 'Cà phê' }) name!: string;
  @ApiProperty({ example: 'g' }) unit!: string;
  @ApiProperty({
    example: 1896,
    description: 'Còn trong kho (đã trừ phần giữ)',
  })
  quantity!: number;
  @ApiProperty({ example: 104, description: 'Đang giữ cho đơn chờ thanh toán' })
  reserved!: number;
  @ApiProperty({ type: Number, nullable: true, example: 105 })
  cupsLeft!: number | null;
  @ApiProperty() low!: boolean;
  @ApiProperty({ type: [String], example: ['Americano', 'Bạc xỉu'] })
  usedBy!: string[];
}

export class ProductStockDto {
  @ApiProperty({ example: 'p1' }) id!: string;
  @ApiProperty({ example: 'Americano' }) name!: string;
  @ApiProperty({ example: 105, description: 'Size S, không topping' })
  sellableCups!: number;
  @ApiProperty({ type: String, nullable: true, example: 'coffee' })
  limitingIngredientId!: string | null;
}

export class InventoryOverviewDto {
  @ApiProperty({ example: 10 }) lowStockCups!: number;
  @ApiProperty({ type: [IngredientOverviewDto] })
  ingredients!: IngredientOverviewDto[];
  @ApiProperty({ type: [ProductStockDto] }) products!: ProductStockDto[];
}
