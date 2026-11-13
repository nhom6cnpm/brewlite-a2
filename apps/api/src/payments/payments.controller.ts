import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentViewDto } from './dto/payment-view.dto';
import { PaymentsService } from './payments.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token hết hạn' })
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Mở phiên thanh toán Ví (QR) hoặc Thẻ (tại quầy) cho đơn',
    description:
      'Số tiền lấy từ đơn hàng. Đơn vẫn PENDING: chỉ nhân viên xác nhận mới thành PAID. ' +
      'Đơn PAYMENT_FAILED được thử lại (về PENDING, giữ nguyên hạn).',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Chuỗi 1–128 ký tự; gửi lại cùng key trả về cùng phiên.',
  })
  @ApiResponse({ status: 201, type: PaymentViewDto })
  @ApiResponse({
    status: 400,
    description:
      'Thiếu Idempotency-Key, key đã dùng cho yêu cầu khác, đơn hết hạn/hủy hoặc không còn chờ thanh toán',
  })
  @ApiResponse({ status: 403, description: 'Đơn của người khác' })
  @ApiResponse({ status: 404, description: 'Không có đơn hàng' })
  createPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.createPayment(
      req.user.userId,
      dto,
      idempotencyKey,
    );
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Trạng thái phiên thanh toán (khách hỏi lại)' })
  @ApiResponse({ status: 200, type: PaymentViewDto })
  @ApiResponse({ status: 403, description: 'Phiên của người khác' })
  @ApiResponse({ status: 404, description: 'Không có phiên này' })
  getPayment(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.paymentsService.getPaymentById(id, req.user.userId);
  }
}
