import { ApiProperty } from '@nestjs/swagger';
import { ORDER_STATUSES, type OrderStatus } from '../order-status';

export class CreateOrderResponseDto {
  @ApiProperty({ example: 'Tạo đơn hàng thành công' })
  message!: string;

  @ApiProperty({ example: 'ORD-6f1c2a4e-1b7d-4c55-9a3e-2d1f0b9c8e77' })
  orderId!: string;

  @ApiProperty({ example: 55000, description: 'Tổng tiền sau giảm (VNĐ)' })
  total!: number;

  @ApiProperty({ example: 60000, description: 'Tạm tính do server tính lại' })
  subtotal!: number;

  @ApiProperty({ example: 5000 })
  discount!: number;

  @ApiProperty({ type: String, nullable: true, example: 'THU5K' })
  voucherCode!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Giảm 5.000đ' })
  voucherTitle!: string | null;

  @ApiProperty({ enum: ORDER_STATUSES, example: 'PENDING' })
  status!: OrderStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ description: 'Hạn thanh toán (mặc định 15 phút)' })
  expiresAt!: Date;
}
