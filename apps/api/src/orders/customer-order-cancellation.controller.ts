import {
  BadRequestException,
  Body,
  Controller,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CustomerOrderCancellationService } from './customer-order-cancellation.service';
import { CancelOrderDto, RequestCancellationDto } from './dto/cancellation.dto';
import {
  CustomerOrderViewDto,
  CancelOrderViewDto,
} from './dto/customer-order-view.dto';
import { OrderHistoryService } from './order-history.service';

// Object metadata preserves the raw body until the parameter's strict pipe runs;
// main's global whitelist otherwise silently strips forged fields first.
type CancellationBody = Pick<
  RequestCancellationDto,
  keyof RequestCancellationDto
>;
type EmptyBody = Record<string, never>;
interface CustomerRequest {
  user: AuthenticatedUser;
}

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 401,
  description: 'Chưa đăng nhập hoặc tài khoản không hợp lệ.',
})
@ApiResponse({
  status: 404,
  description: 'Không có đơn này hoặc đơn không thuộc tài khoản.',
})
@ApiResponse({
  status: 400,
  description: 'Dữ liệu sai hoặc đơn đã bắt đầu pha chế/hoàn tất/hủy.',
})
@ApiResponse({
  status: 409,
  description: 'Quyền hủy đã thay đổi, đơn hết hạn hoặc đang chờ duyệt hủy.',
})
@ApiParam({ name: 'id', example: 'ORD-6f1c2a4e-1b7d-4c55-9a3e-2d1f0b9c8e77' })
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class CustomerOrderCancellationController {
  constructor(
    private readonly cancellations: CustomerOrderCancellationService,
    private readonly history: OrderHistoryService,
  ) {}

  @Post(':id/cancel')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Hủy ngay đơn của tôi khi chưa có tiền về',
    description:
      'Khóa đơn, kiểm tra quyền sở hữu và trạng thái. Trả nguyên liệu/lượt voucher đúng một lần; không cho khách hủy ngay đơn PAID/đã có tiền về.',
  })
  @ApiBody({ type: CancelOrderDto, required: false })
  @ApiResponse({ status: 200, type: CancelOrderViewDto })
  cancel(
    @Req() req: CustomerRequest,
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        expectedType: CancelOrderDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: false,
      }),
    )
    body: EmptyBody,
  ) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Dữ liệu hủy đơn phải là một object rỗng.');
    return this.cancellations.cancelOrder(req.user.userId, id);
  }

  @Post(':id/cancel-request')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Gửi yêu cầu hủy đơn đã có tiền về hoặc PAID',
    description:
      'Đơn chưa bị hủy, chưa hoàn tiền. Nhân viên xử lý ở #39. Gửi lặp khi đang chờ giữ nguyên yêu cầu đầu tiên.',
  })
  @ApiBody({ type: RequestCancellationDto })
  @ApiResponse({ status: 200, type: CustomerOrderViewDto })
  async request(
    @Req() req: CustomerRequest,
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        expectedType: RequestCancellationDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: CancellationBody,
  ) {
    await this.cancellations.requestCancellation(
      req.user.userId,
      id,
      body.reason,
    );
    return this.history.findOwnById(req.user.userId, id);
  }
}
