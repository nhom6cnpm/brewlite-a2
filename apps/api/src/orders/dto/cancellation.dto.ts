import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

/** A1 92a43f4 RequestCancellationDto; staff review DTOs belong to #39. */
export class RequestCancellationDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 500,
    example: 'Tôi cần đổi lịch nhận món.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 500)
  reason!: string;
}

/** Cancellation identity, money and state always come from the stored order. */
export class CancelOrderDto {}
