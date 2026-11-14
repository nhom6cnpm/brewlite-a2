import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

export const PREPARATION_TARGETS = ['PREPARING', 'READY', 'COMPLETED'] as const;
export type PreparationTarget = (typeof PREPARATION_TARGETS)[number];

export class AdvancePreparationDto {
  @ApiProperty({ enum: PREPARATION_TARGETS })
  @IsIn(PREPARATION_TARGETS)
  status!: PreparationTarget;
}

export class ListAdminOrdersDto {
  @ApiPropertyOptional({ example: 'PAID,PREPARING,READY' })
  @IsOptional()
  @Matches(/^(PAID|PREPARING|READY)(,(PAID|PREPARING|READY))*$/)
  status?: string;

  @ApiPropertyOptional({ enum: ['PENDING'] })
  @IsOptional()
  @IsIn(['PENDING'])
  cancelRequestStatus?: 'PENDING';
}
