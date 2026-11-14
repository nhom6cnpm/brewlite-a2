import { ApiProperty } from '@nestjs/swagger';
import { ORDER_STATUSES, type OrderStatus } from '../order-status';
import type { CancellationReason } from '../order-expiry';
import type { CancelRequestStatus } from '../order-cancellation';
import type { ProductSize, ToppingId } from '../../pricing/product-options';
import type { BenefitsPolicyVersion } from '../benefits-policy';
import type { OrderHistoryResponseDto } from './order-history-response.dto';

class CustomerOrderItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) imageUrl!: string | null;
  @ApiProperty({ enum: ['S', 'M', 'L'] }) size!: ProductSize;
  @ApiProperty({ type: [String] }) toppingIds!: ToppingId[];
  @ApiProperty({ minimum: 1 }) qty!: number;
  @ApiProperty({ minimum: 0 }) unitPrice!: number;
  @ApiProperty({ minimum: 0 }) lineTotal!: number;
}

class CustomerCancelRequestDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] })
  status!: CancelRequestStatus;
  @ApiProperty() reason!: string;
  @ApiProperty() requestedAt!: Date;
  @ApiProperty({ type: Date, nullable: true }) reviewedAt!: Date | null;
  @ApiProperty({ type: String, nullable: true }) reviewedBy!: string | null;
  @ApiProperty({ type: String, nullable: true }) reviewNote!: string | null;
}

/** Explicit HTTP schema for the existing GETs and the new request endpoint. */
export class CustomerOrderViewDto implements OrderHistoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ minimum: 0 }) subtotal!: number;
  @ApiProperty({ minimum: 0 }) discount!: number;
  @ApiProperty({ minimum: 0 }) total!: number;
  @ApiProperty({ type: String, nullable: true }) voucherCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) voucherTitle!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty() serverTime!: Date;
  @ApiProperty({ type: Date, nullable: true }) cancelledAt!: Date | null;
  @ApiProperty({ type: String, nullable: true })
  cancelReason!: CancellationReason | null;
  @ApiProperty({ type: String, enum: ['WALLET', 'CARD'], nullable: true })
  paymentMethod!: 'WALLET' | 'CARD' | null;
  @ApiProperty({ minimum: 0 }) refundedAmount!: number;
  @ApiProperty() transferReceived!: boolean;
  @ApiProperty() canPay!: boolean;
  @ApiProperty() canCancelImmediately!: boolean;
  @ApiProperty() canRequestCancellation!: boolean;
  @ApiProperty({ type: CustomerCancelRequestDto, nullable: true })
  cancelRequest!: CustomerCancelRequestDto | null;
  @ApiProperty({ type: [CustomerOrderItemDto] }) items!: CustomerOrderItemDto[];
  @ApiProperty({ enum: [0, 1] }) benefitsPolicyVersion!: BenefitsPolicyVersion;
  @ApiProperty({ minimum: 0 }) pointsEarned!: number;
  @ApiProperty({ minimum: 0 }) pointsReversed!: number;
  @ApiProperty({ type: Date, nullable: true }) pointsAwardedAt!: Date | null;
  @ApiProperty({ type: Date, nullable: true }) pointsReversedAt!: Date | null;
}

export class CancelOrderViewDto {
  @ApiProperty() orderId!: string;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ type: String, nullable: true })
  cancelReason!: CancellationReason | null;
  @ApiProperty({ type: Date, nullable: true }) cancelledAt!: Date | null;
  @ApiProperty() expiresAt!: Date;
}
