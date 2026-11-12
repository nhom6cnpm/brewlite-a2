import { ApiProperty, OmitType } from '@nestjs/swagger';
import { PublicVoucherDto } from './public-voucher.dto';

export class VoucherUsageDto {
  @ApiProperty({ example: 3 }) maxUsesPerUser!: number;
  @ApiProperty({ example: 0 }) reservedUses!: number;
  @ApiProperty({ example: 0 }) usedUses!: number;
  @ApiProperty({ example: 3 }) availableUses!: number;
}

export class VoucherOptionDto extends OmitType(PublicVoucherDto, [
  'isActive',
  'isPublic',
] as const) {
  @ApiProperty({ type: String, nullable: true, example: null })
  unavailableReason!: string | null;
  @ApiProperty({ example: 5000 }) discount!: number;
  @ApiProperty({
    type: VoucherUsageDto,
    nullable: true,
    description: 'null khi chưa có danh tính đã xác thực.',
  })
  usage!: VoucherUsageDto | null;
}

export class VoucherQuoteDto {
  @ApiProperty({ example: 60000 }) subtotal!: number;
  @ApiProperty({ example: 5000 }) discount!: number;
  @ApiProperty({ example: 55000 }) total!: number;
  @ApiProperty({ type: String, nullable: true, example: 'THU5K' })
  voucherCode!: string | null;
  @ApiProperty({ type: String, nullable: true, example: 'Giảm 5.000đ' })
  voucherTitle!: string | null;
  @ApiProperty({ format: 'date-time' }) serverTime!: Date;
  @ApiProperty({ type: [VoucherOptionDto] }) vouchers!: VoucherOptionDto[];
  @ApiProperty({
    type: VoucherUsageDto,
    nullable: true,
    description:
      'null khi chưa chọn mã hoặc chưa đăng nhập; có JWT hợp lệ thì trả lượt riêng của tài khoản.',
  })
  voucherUsage!: VoucherUsageDto | null;
}
