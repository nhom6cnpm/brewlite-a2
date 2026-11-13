import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  PAYMENT_STATUSES,
  type PaymentStatus,
} from '../entities/payment.entity';

export type AdminPaymentFilter = 'ACTIVE' | 'ALL' | PaymentStatus;

export class ListAdminPaymentsDto {
  // ACTIVE (default) = PENDING + TRANSFER_RECEIVED
  @ApiPropertyOptional({
    enum: ['ACTIVE', 'ALL', ...PAYMENT_STATUSES],
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'ALL', ...PAYMENT_STATUSES])
  status?: AdminPaymentFilter;

  // Order code read from the customer's QR
  @ApiPropertyOptional({ description: 'Lọc theo mã đơn (quét QR của khách)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderId?: string;
}
