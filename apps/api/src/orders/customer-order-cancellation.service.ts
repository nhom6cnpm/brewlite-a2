import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { length as hasLength } from 'class-validator';
import { DataSource } from 'typeorm';
import { OrderBenefitsService } from './order-benefits.service';
import { cancellationAction } from './order-cancellation';
import { assertTransition } from './order-status';
import { Order } from './order.entity';
import { OrdersService } from './orders.service';

/** Customer entry points from A1 92a43f4, using #33's core and #34's payment hooks. */
@Injectable()
export class CustomerOrderCancellationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orders: OrdersService,
    private readonly benefits: OrderBenefitsService,
  ) {}

  async cancelOrder(userId: string, id: string) {
    const order = await this.dataSource.transaction(async (manager) => {
      await this.benefits.requireUser(manager, userId);
      const locked = await this.orders.lockById(id, manager);
      if (!locked || locked.userId !== userId)
        throw new NotFoundException('Không tìm thấy đơn hàng');
      if (locked.status === 'CANCELLED') return locked;
      if (await this.orders.expireIfNeeded(locked, manager)) return locked;
      assertTransition(locked.status, 'CANCELLED');
      const received = await this.orders.hasReceivedTransfer(id, manager);
      if (
        cancellationAction(
          locked.status,
          received,
          locked.cancelRequestStatus,
        ) !== 'IMMEDIATE'
      )
        throw new ConflictException({
          code:
            locked.cancelRequestStatus === 'PENDING'
              ? 'CANCELLATION_REQUEST_PENDING'
              : 'CANCELLATION_REQUIRES_REVIEW',
          message: 'Đơn này cần nhân viên xử lý hủy.',
        });
      return this.orders.cancelLocked(
        locked,
        manager,
        'USER_CANCELLED',
        await this.orders.databaseNow(manager),
      );
    });
    return {
      orderId: order.id,
      status: order.status,
      cancelReason: order.cancelReason,
      cancelledAt: order.cancelledAt,
      expiresAt: order.expiresAt,
    };
  }

  async requestCancellation(
    userId: string,
    id: string,
    reason: string,
  ): Promise<void> {
    const trimmed = typeof reason === 'string' ? reason.trim() : '';
    if (!hasLength(trimmed, 1, 500))
      throw new BadRequestException('Lý do hủy phải có 1–500 ký tự.');
    const expired = await this.dataSource.transaction(async (manager) => {
      await this.benefits.requireUser(manager, userId);
      const order = await this.orders.lockById(id, manager);
      if (!order || order.userId !== userId)
        throw new NotFoundException('Không tìm thấy đơn hàng');
      // Commit timeout cleanup before returning an HTTP error, as in A1.
      if (await this.orders.expireIfNeeded(order, manager)) return true;
      if (!['PENDING', 'PAYMENT_FAILED', 'PAID'].includes(order.status))
        throw new BadRequestException('Đơn không còn được phép yêu cầu hủy.');
      if (order.cancelRequestStatus === 'PENDING') return false;
      const received = await this.orders.hasReceivedTransfer(id, manager);
      if (
        cancellationAction(
          order.status,
          received,
          order.cancelRequestStatus,
        ) !== 'REQUEST'
      )
        throw new ConflictException(
          'Đơn chưa có tiền về. Vui lòng dùng thao tác hủy đơn.',
        );
      Object.assign(order, {
        cancelRequestId: randomUUID(),
        cancelRequestedAt: await this.orders.databaseNow(manager),
        cancelRequestReason: trimmed,
        cancelRequestStatus: 'PENDING',
        cancelReviewedAt: null,
        cancelReviewedBy: null,
        cancelReviewNote: null,
      });
      await manager.save(Order, order);
      return false;
    });
    if (expired) throw new ConflictException('Đơn đã hết hạn và được hủy.');
  }
}
