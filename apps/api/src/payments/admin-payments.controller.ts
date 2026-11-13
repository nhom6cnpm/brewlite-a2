import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { PaymentsService } from './payments.service';
import { ListAdminPaymentsDto } from './dto/list-admin-payments.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { PaymentViewDto } from './dto/payment-view.dto';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

// Store staff only: customers get 403
@ApiTags('Admin Payments')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
@ApiResponse({ status: 403, description: 'Không phải ADMIN' })
@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Phiên thanh toán cho nhân viên đối chiếu',
    description:
      'Mặc định ACTIVE (PENDING + TRANSFER_RECEIVED còn hạn); phiên đã có tiền về lên đầu.',
  })
  @ApiResponse({ status: 200, type: [PaymentViewDto] })
  list(@Query() query: ListAdminPaymentsDto) {
    return this.paymentsService.listForAdmin(query);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Xác nhận đã nhận tiền: phiên SUCCESS, đơn PAID',
    description:
      'Thẻ tại quầy (chưa có tiền trong sao kê) được ghi tiền vào sao kê khi xác nhận.',
  })
  @ApiResponse({ status: 200, type: PaymentViewDto })
  @ApiResponse({
    status: 400,
    description: 'Đơn hết hạn/hủy hoặc không còn chờ xác nhận',
  })
  @ApiResponse({ status: 404, description: 'Không có phiên này' })
  confirm(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto?: ReviewPaymentDto,
  ) {
    return this.paymentsService.review(
      req.user.userId,
      id,
      'CONFIRM',
      dto?.note,
    );
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Từ chối: phiên FAILED, đơn PAYMENT_FAILED, hoàn tiền đã nhận',
  })
  @ApiResponse({ status: 200, type: PaymentViewDto })
  @ApiResponse({
    status: 400,
    description: 'Đơn hết hạn/hủy hoặc không còn chờ xác nhận',
  })
  @ApiResponse({ status: 404, description: 'Không có phiên này' })
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto?: ReviewPaymentDto,
  ) {
    return this.paymentsService.review(
      req.user.userId,
      id,
      'REJECT',
      dto?.note,
    );
  }
}
