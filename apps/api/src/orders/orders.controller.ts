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
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderResponseDto } from './dto/order-mutation-response.dto';
import { OrderHistoryService } from './order-history.service';
import { OrdersService } from './orders.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token hết hạn' })
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly history: OrderHistoryService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo đơn PENDING từ giỏ hàng',
    description:
      'Server tính lại giá, giữ nguyên liệu và lượt voucher trong cùng giao dịch. ' +
      'Đơn tự hủy nếu không thanh toán trước expiresAt.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Chuỗi 1–128 ký tự (ví dụ UUID). Gửi lại cùng key + cùng giỏ trả về đơn cũ.',
  })
  @ApiResponse({
    status: 201,
    description: 'Đã tạo đơn (hoặc trả lại đơn của cùng Idempotency-Key)',
    type: CreateOrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Thiếu Idempotency-Key, dữ liệu sai, món không tồn tại, hết nguyên liệu hoặc voucher không dùng được',
  })
  @ApiResponse({
    status: 409,
    description:
      'Idempotency-Key đã dùng cho giỏ khác, hoặc tồn kho đang thay đổi',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ): Promise<CreateOrderResponseDto> {
    return this.ordersService.createOrder(
      req.user.userId,
      dto,
      idempotencyKey ?? '',
    );
  }

  @Get('me')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Danh sách đơn của tôi (mới nhất trước)' })
  @ApiResponse({ status: 200, description: 'Danh sách đơn kèm món' })
  mine(@Req() req: AuthenticatedRequest) {
    return this.history.findMine(req.user.userId);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Chi tiết một đơn của tôi' })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn' })
  @ApiResponse({
    status: 404,
    description: 'Không có đơn này hoặc đơn của người khác',
  })
  detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.history.findOwnById(req.user.userId, id);
  }
}
