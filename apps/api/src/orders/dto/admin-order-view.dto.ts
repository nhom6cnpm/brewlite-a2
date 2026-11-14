import { ApiProperty } from '@nestjs/swagger';
import { CustomerOrderViewDto } from './customer-order-view.dto';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentMethod,
  type PaymentStatus,
} from '../../payments/entities/payment.entity';

export class AdminOrderViewDto extends CustomerOrderViewDto {
  @ApiProperty({ type: String, nullable: true }) customerEmail!: string | null;
}

export class AdminOrderPageDto {
  @ApiProperty({ type: [AdminOrderViewDto] }) items!: AdminOrderViewDto[];
  @ApiProperty({ minimum: 0 }) total!: number;
  @ApiProperty({ minimum: 1 }) page!: number;
  @ApiProperty({ minimum: 1, maximum: 50 }) pageSize!: number;
}

export class AdminPaymentRecordDto {
  @ApiProperty() paymentId!: string;
  @ApiProperty({ enum: PAYMENT_METHODS }) method!: PaymentMethod;
  @ApiProperty({ enum: PAYMENT_STATUSES }) status!: PaymentStatus;
  @ApiProperty({ minimum: 0 }) amount!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: Date, nullable: true }) receivedAt!: Date | null;
  @ApiProperty({ type: Date, nullable: true }) reviewedAt!: Date | null;
  @ApiProperty({ type: String, nullable: true }) reviewedByEmail!:
    string | null;
  @ApiProperty({ type: String, nullable: true }) reviewNote!: string | null;
}

export class AdminOrderDetailDto extends AdminOrderViewDto {
  @ApiProperty({ type: String, nullable: true }) cancelReviewedByEmail!:
    string | null;
  @ApiProperty({ type: [AdminPaymentRecordDto] })
  payments!: AdminPaymentRecordDto[];
}
