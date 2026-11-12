import { ApiProperty } from '@nestjs/swagger';

export class PublicVoucherDto {
  @ApiProperty({ example: 'BREW10' }) code!: string;
  @ApiProperty({ example: 'Giảm 10%, tối đa 10.000đ' }) title!: string;
  @ApiProperty({ enum: ['FIXED', 'PERCENT'] }) discountType!:
    'FIXED' | 'PERCENT';
  @ApiProperty({ example: 10 }) discountValue!: number;
  @ApiProperty({ example: 50000 }) minSubtotal!: number;
  @ApiProperty({ type: Number, nullable: true, example: 10000 }) maxDiscount!:
    number | null;
  @ApiProperty({ format: 'date-time' }) startsAt!: Date;
  @ApiProperty({ format: 'date-time' }) endsAt!: Date;
  @ApiProperty({ example: true }) isActive!: boolean;
  @ApiProperty({ example: true }) isPublic!: boolean;
  @ApiProperty({ example: 3, maximum: 3 }) maxUsesPerUser!: number;
}
