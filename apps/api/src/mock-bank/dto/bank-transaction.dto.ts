import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { BANK_TRANSACTION_TYPES } from '../bank-transaction.entity';

export class ListBankTransactionsDto {
  @ApiPropertyOptional({ description: 'Chỉ lấy giao dịch của một đơn' })
  @IsOptional()
  @IsString({ message: 'orderId phải là chuỗi' })
  @MaxLength(64, { message: 'orderId tối đa 64 ký tự' })
  orderId?: string;
}

export class BankTransactionDto {
  @ApiProperty({ example: 'TXN-3f2a…' }) id!: string;
  @ApiProperty({ enum: BANK_TRANSACTION_TYPES }) type!: string;
  @ApiProperty({ example: 84000, description: 'Luôn dương (VNĐ)' })
  amount!: number;
  @ApiProperty({ example: 'ORD-6f1c…' }) orderId!: string;
  @ApiProperty({ type: String, nullable: true }) paymentId!: string | null;
  @ApiProperty({ example: 'ORD-6f1c…', description: 'Nội dung chuyển khoản' })
  content!: string;
  @ApiProperty() createdAt!: Date;
}
