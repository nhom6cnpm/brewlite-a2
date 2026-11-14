import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ApproveCancellationDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Định danh yêu cầu hủy đang được duyệt, không phải mã đơn.',
  })
  @IsUUID()
  requestId!: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 500 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  note?: string;
}

export class RejectCancellationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  requestId!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 500,
    example: 'Khách xác nhận tiếp tục nhận món.',
  })
  @Transform(trim)
  @IsString()
  @Length(1, 500)
  reason!: string;
}
