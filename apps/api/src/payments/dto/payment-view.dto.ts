import { ApiProperty } from '@nestjs/swagger';
import { ORDER_STATUSES, type OrderStatus } from '../../orders/order-status';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentMethod,
  type PaymentStatus,
} from '../entities/payment.entity';

/** Swagger shape of a payment session as the customer / staff see it. */
export class PaymentViewDto {
  @ApiProperty({ example: 'PAY-2b1f…' }) paymentId!: string;
  @ApiProperty({ example: 'ORD-6f1c…' }) orderId!: string;
  @ApiProperty({ example: 79000, description: 'VNĐ, bằng tổng đơn' })
  amount!: number;
  @ApiProperty({ enum: PAYMENT_METHODS }) method!: PaymentMethod;
  @ApiProperty({ enum: PAYMENT_STATUSES }) status!: PaymentStatus;
  @ApiProperty({ type: Date, nullable: true }) receivedAt!: Date | null;
  @ApiProperty({ type: String, nullable: true, example: 'Chưa nhận được tiền' })
  reviewNote!: string | null;
  @ApiProperty() cancellationPending!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ enum: ORDER_STATUSES, nullable: true })
  orderStatus!: OrderStatus | null;
  @ApiProperty({ type: Date, nullable: true }) expiresAt!: Date | null;
  @ApiProperty() serverTime!: Date;
}

class ShopBankAccountDto {
  @ApiProperty({ example: 'BrewLite Bank (giả lập)' }) bankName!: string;
  @ApiProperty({ example: '0123 456 789' }) accountNumber!: string;
  @ApiProperty({ example: 'BREWLITE COFFEE' }) accountName!: string;
}

export class TransferInfoDto {
  @ApiProperty() paymentId!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty({ example: 79000 }) amount!: number;
  @ApiProperty({ enum: PAYMENT_METHODS }) method!: PaymentMethod;
  @ApiProperty({ enum: PAYMENT_STATUSES }) status!: PaymentStatus;
  @ApiProperty({ enum: ORDER_STATUSES, nullable: true })
  orderStatus!: OrderStatus | null;
  @ApiProperty({ type: Date, nullable: true }) expiresAt!: Date | null;
  @ApiProperty({ type: Date, nullable: true }) receivedAt!: Date | null;
  @ApiProperty({ description: 'Nội dung chuyển khoản = mã đơn' })
  transferContent!: string;
  @ApiProperty({ type: ShopBankAccountDto }) account!: ShopBankAccountDto;
  @ApiProperty() serverTime!: Date;
}
