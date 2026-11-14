import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles';
import { BankLedgerService } from './bank-ledger.service';
import {
  BankTransactionDto,
  ListBankTransactionsDto,
} from './dto/bank-transaction.dto';

/** GET /admin/bank-transactions — sao kê tài khoản của quán (chỉ ADMIN). */
@ApiTags('Admin Payments')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
@ApiResponse({ status: 403, description: 'Không phải ADMIN' })
@Controller('admin/bank-transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBankController {
  constructor(private readonly ledger: BankLedgerService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary:
      'Sao kê ngân hàng giả lập của quán (mới nhất trước, tối đa 200 dòng)',
    description:
      'IN = tiền vào (khách chuyển khoản hoặc thẻ tại quầy khi xác nhận), REFUND = quán hoàn tiền.',
  })
  @ApiResponse({ status: 200, type: [BankTransactionDto] })
  list(@Query() query: ListBankTransactionsDto) {
    return this.ledger.list(query.orderId?.trim() || undefined);
  }
}
