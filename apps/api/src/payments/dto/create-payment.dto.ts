import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from '../entities/payment.entity';

export type { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: 'ORD-6f1c2a4e-1b7d-4c55-9a3e-2d1f0b9c8e77' })
  @IsString({ message: 'orderId phải là chuỗi' })
  @IsNotEmpty({ message: 'orderId không được để trống' })
  @MaxLength(64, { message: 'orderId tối đa 64 ký tự' })
  orderId!: string;

  @ApiProperty({
    enum: PAYMENT_METHODS,
    description: 'WALLET = quét QR ngân hàng giả lập, CARD = quẹt thẻ tại quầy',
  })
  @IsIn(PAYMENT_METHODS, { message: 'Phương thức phải là WALLET hoặc CARD' })
  method!: PaymentMethod;
}
