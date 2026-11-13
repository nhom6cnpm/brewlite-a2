import { Controller, Get, Header, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransferInfoDto } from './dto/payment-view.dto';
import { PaymentsService } from './payments.service';

/**
 * Ngân hàng giả lập (thay cho app ngân hàng của khách khi demo).
 * No login: the page is opened by scanning the payment QR on a phone. Knowing
 * the random payment id only lets someone pay for that order; it can never
 * confirm the payment — staff still decide on the admin page.
 */
@ApiTags('Mock Bank')
@Controller('mock-bank/payments')
export class MockBankController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Thông tin chuyển khoản (số tiền, nội dung, tài khoản quán)',
  })
  @ApiResponse({ status: 200, type: TransferInfoDto })
  @ApiResponse({ status: 404, description: 'Không có phiên này' })
  info(@Param('id') id: string) {
    return this.paymentsService.getTransferInfo(id);
  }

  @Post(':id/transfer')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Khách bấm "Chuyển tiền": tiền vào sao kê, phiên TRANSFER_RECEIVED',
    description:
      'Đơn vẫn PENDING cho tới khi nhân viên xác nhận. Bấm lặp không ghi tiền lần hai.',
  })
  @ApiResponse({ status: 200, type: TransferInfoDto })
  @ApiResponse({
    status: 400,
    description:
      'Phiên thẻ, đơn hết hạn/hủy, hoặc phiên không còn chờ chuyển tiền',
  })
  @ApiResponse({ status: 404, description: 'Không có phiên này' })
  async transfer(@Param('id') id: string) {
    await this.paymentsService.receiveTransfer(id);
    return this.paymentsService.getTransferInfo(id);
  }
}
