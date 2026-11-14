import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { AdminOrderWorkflowService } from './admin-order-workflow.service';
import { OrderHistoryService } from './order-history.service';
import { AdminOrderHistoryQueryDto } from './dto/admin-order-history.dto';
import {
  ApproveCancellationDto,
  RejectCancellationDto,
} from './dto/admin-cancellation.dto';
import {
  AdvancePreparationDto,
  ListAdminOrdersDto,
} from './dto/preparation.dto';
import { CustomerOrderViewDto } from './dto/customer-order-view.dto';
import {
  AdminOrderDetailDto,
  AdminOrderPageDto,
} from './dto/admin-order-view.dto';

// Keep Object metadata until the strict parameter pipe runs: global whitelist
// otherwise silently discards forged fields before they can be rejected.
const strict = (expectedType: new () => object) =>
  new ValidationPipe({
    expectedType,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
type Input<T> = Pick<T, keyof T>;

@ApiTags('Admin Orders')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Cần JWT hợp lệ.' })
@ApiResponse({ status: 403, description: 'Chỉ ADMIN được thao tác.' })
@ApiResponse({
  status: 400,
  description: 'Dữ liệu sai hoặc chuyển trạng thái không hợp lệ.',
})
@ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng.' })
@ApiResponse({
  status: 409,
  description: 'Yêu cầu đã đổi/đã xử lý, đơn hết hạn hoặc chờ duyệt hủy.',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly workflow: AdminOrderWorkflowService,
    private readonly history: OrderHistoryService,
  ) {}

  @Get('history')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Lịch sử mọi đơn: lọc trạng thái, tìm mã/email, phân trang',
  })
  @ApiQuery({ type: AdminOrderHistoryQueryDto })
  @ApiResponse({ status: 200, type: AdminOrderPageDto })
  historyList(
    @Query(strict(AdminOrderHistoryQueryDto))
    query: Input<AdminOrderHistoryQueryDto>,
  ) {
    return this.history.findForAdminHistory(query);
  }

  @Get(':id/detail')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary:
      'Snapshot đơn, người duyệt hủy và mọi phiên thanh toán; sao kê dùng GET /admin/bank-transactions',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: AdminOrderDetailDto })
  detail(@Param('id') id: string) {
    return this.history.findAdminDetail(id);
  }

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Danh sách yêu cầu hủy PENDING hoặc bảng pha chế (cũ nhất trước)',
  })
  @ApiQuery({ type: ListAdminOrdersDto })
  @ApiResponse({ status: 200, type: [CustomerOrderViewDto] })
  list(@Query(strict(ListAdminOrdersDto)) query: Input<ListAdminOrdersDto>) {
    if (query.status && query.cancelRequestStatus)
      throw new BadRequestException(
        'Vui lòng truy vấn riêng yêu cầu hủy và bảng pha chế.',
      );
    return query.cancelRequestStatus
      ? this.history.findCancellationRequests(query.cancelRequestStatus)
      : this.history.findPreparationOrders(query.status);
  }

  @Patch(':id/status')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Pha chế: PAID → PREPARING → READY → COMPLETED',
    description:
      'Khóa đơn, chặn nhảy bước và đơn đang chờ duyệt hủy; gửi lặp cùng trạng thái an toàn.',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: AdvancePreparationDto })
  @ApiResponse({ status: 200, type: CustomerOrderViewDto })
  async advance(
    @Param('id') id: string,
    @Body(strict(AdvancePreparationDto)) dto: Input<AdvancePreparationDto>,
  ) {
    await this.workflow.advancePreparation(id, dto.status);
    return this.history.findForAdminById(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary:
      'Duyệt đúng yêu cầu hủy: hoàn tiền, trả kho/voucher, thu hồi điểm trong một giao dịch',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: ApproveCancellationDto })
  @ApiResponse({ status: 200, type: CustomerOrderViewDto })
  async approve(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body(strict(ApproveCancellationDto)) dto: Input<ApproveCancellationDto>,
  ) {
    await this.workflow.reviewCancellation(
      req.user.userId,
      id,
      dto.requestId,
      'APPROVED',
      dto.note,
    );
    return this.history.findForAdminById(id);
  }

  @Post(':id/cancel-request/reject')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary:
      'Từ chối đúng yêu cầu hủy; bắt buộc lý do, giữ nguyên tiền/kho/điểm',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: RejectCancellationDto })
  @ApiResponse({ status: 200, type: CustomerOrderViewDto })
  async reject(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body(strict(RejectCancellationDto)) dto: Input<RejectCancellationDto>,
  ) {
    await this.workflow.reviewCancellation(
      req.user.userId,
      id,
      dto.requestId,
      'REJECTED',
      dto.reason,
    );
    return this.history.findForAdminById(id);
  }
}
