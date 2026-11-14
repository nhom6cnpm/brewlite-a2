import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { length as hasLength } from 'class-validator';
import { DataSource } from 'typeorm';
import { assertNoPendingCancellation } from './order-cancellation';
import {
  PREPARATION_TARGETS,
  type PreparationTarget,
} from './dto/preparation.dto';
import { Order } from './order.entity';
import { OrdersService } from './orders.service';

/** Staff workflow from A1 92a43f4; all stock, benefits and refunds use A2 core/hooks. */
@Injectable()
export class AdminOrderWorkflowService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrdersService,
  ) {}

  async advancePreparation(
    id: string,
    target: PreparationTarget,
  ): Promise<void> {
    if (!PREPARATION_TARGETS.includes(target))
      throw new BadRequestException('Trạng thái pha chế không hợp lệ.');
    const updated = await this.dataSource.transaction(async (manager) => {
      const order = await this.orders.lockById(id, manager);
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (await this.orders.expireIfNeeded(order, manager)) return order;
      assertNoPendingCancellation(order);
      if (order.status === target) return order;
      return this.orders.updateOrderStatus(id, target, manager);
    });
    if (updated.status !== target)
      throw new ConflictException(
        'Đơn đã hết hạn hoặc bị hủy. Vui lòng tải lại bảng.',
      );
  }

  async reviewCancellation(
    adminId: string,
    id: string,
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    note?: string,
  ): Promise<void> {
    const trimmed = typeof note === 'string' ? note.trim() : undefined;
    if (
      (decision === 'REJECTED' || note !== undefined) &&
      !hasLength(trimmed ?? '', 1, 500)
    )
      throw new BadRequestException(
        'Ghi chú / lý do từ chối phải có 1–500 ký tự.',
      );
    const expired = await this.dataSource.transaction(async (manager) => {
      const order = await this.orders.lockById(id, manager);
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      // Return first: timeout cleanup must commit even when the action is stale.
      if (await this.orders.expireIfNeeded(order, manager)) return true;
      if (!order.cancelRequestId || order.cancelRequestId !== requestId)
        throw new ConflictException(
          'Yêu cầu hủy đã thay đổi. Vui lòng tải lại danh sách.',
        );
      if (order.cancelRequestStatus === decision) return false;
      if (order.cancelRequestStatus !== 'PENDING')
        throw new ConflictException('Yêu cầu hủy đã được xử lý.');
      if (!['PENDING', 'PAYMENT_FAILED', 'PAID'].includes(order.status))
        throw new BadRequestException(
          'Đơn đã bắt đầu pha chế hoặc không còn được phép hủy.',
        );
      Object.assign(order, {
        cancelRequestStatus: decision,
        cancelReviewedAt: await this.orders.databaseNow(manager),
        cancelReviewedBy: adminId,
        cancelReviewNote: trimmed ?? null,
      });
      await manager.save(Order, order);
      if (decision === 'APPROVED')
        await this.orders.cancelLocked(
          order,
          manager,
          'USER_CANCELLED',
          await this.orders.databaseNow(manager),
        );
      return false;
    });
    if (expired) throw new ConflictException('Đơn đã hết hạn và được hủy.');
  }
}
