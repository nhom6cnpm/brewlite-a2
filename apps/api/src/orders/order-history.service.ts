import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { DataSource, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Order } from './order.entity';
import type { OrderHistoryResponseDto } from './dto/order-history-response.dto';
import { cancellationCapabilities } from './order-cancellation';
import { OrdersService } from './orders.service';

/** Customer views: GET /orders/me and GET /orders/:id (admin views belong to #39). */
@Injectable()
export class OrderHistoryService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly ordersService: OrdersService,
  ) {}

  private async requireUser(userId: string): Promise<void> {
    if (!isUUID(userId) || !(await this.users.existsBy({ id: userId }))) {
      throw new UnauthorizedException('Vui lòng đăng nhập lại để xem đơn hàng');
    }
  }

  async findMine(userId: string): Promise<OrderHistoryResponseDto[]> {
    await this.requireUser(userId);
    const orders = await this.orders.find({
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return this.toResponses(orders);
  }

  async findOwnById(
    userId: string,
    id: string,
  ): Promise<OrderHistoryResponseDto> {
    await this.requireUser(userId);
    const order = await this.orders.findOne({
      where: { id, userId },
      relations: { items: true },
    });
    // Someone else's order looks exactly like a missing one
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return (await this.toResponses([order]))[0];
  }

  private async toResponses(
    orders: Order[],
  ): Promise<OrderHistoryResponseDto[]> {
    if (!orders.length) return [];
    const now = await this.ordersService.databaseNow(this.dataSource.manager);
    return Promise.all(
      orders.map(async (order) => {
        const transferReceived = await this.ordersService.hasReceivedTransfer(
          order.id,
          this.dataSource.manager,
        );
        return {
          ...cancellationCapabilities(order, transferReceived, now),
          // Money arrived but staff have not decided: never auto-expired
          transferReceived,
          id: order.id,
          status: order.status,
          total: order.total,
          subtotal: order.subtotal,
          discount: order.discount,
          voucherCode: order.voucherCode,
          voucherTitle: order.voucherTitle,
          benefitsPolicyVersion: order.benefitsPolicyVersion,
          pointsEarned: order.pointsEarned,
          pointsReversed: order.pointsReversed,
          pointsAwardedAt: order.pointsAwardedAt,
          pointsReversedAt: order.pointsReversedAt,
          createdAt: order.createdAt,
          expiresAt: order.expiresAt,
          cancelledAt: order.cancelledAt,
          cancelReason: order.cancelReason,
          serverTime: now,
          canPay:
            ['PENDING', 'PAYMENT_FAILED'].includes(order.status) &&
            order.cancelRequestStatus !== 'PENDING' &&
            order.expiresAt > now,
          items: [...order.items]
            .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
            .map((item) => ({
              id: item.id,
              productId: item.productId,
              name:
                item.productName ??
                `Món ${item.productId} (thông tin cũ không còn)`,
              imageUrl: item.productImageUrl,
              size: item.size,
              toppingIds: item.toppingIds,
              qty: item.qty,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
        };
      }),
    );
  }
}
