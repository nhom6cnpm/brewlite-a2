import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { priceCartItems } from '../pricing/price-cart-items';
import { CreateOrderDto } from './dto/create-order.dto';
import type { CreateOrderResponseDto } from './dto/order-mutation-response.dto';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderInventoryReservation } from './order-inventory-reservation.entity';
import { UNPAID_ORDER_STATUSES, type CancellationReason } from './order-expiry';
import { parsePaymentTimeoutMinutes } from './payment-timeout';
import { assertTransition, type OrderStatus } from './order-status';
import { assertNoPendingCancellation } from './order-cancellation';
import { OrderBenefitsService } from './order-benefits.service';
import { BENEFITS_POLICY_VERSIONS } from './benefits-policy';
import { OrderRequestKey } from './order-request-key.entity';
import { orderRequestHash } from './order-request-hash';
import {
  NO_PAYMENT_HOOKS,
  type OrderPaymentHooks,
} from './order-payment-hooks';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class OrdersService {
  private paymentHooks: OrderPaymentHooks = NO_PAYMENT_HOOKS;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly vouchersService: VouchersService,
    private readonly configService: ConfigService,
    private readonly benefits: OrderBenefitsService,
  ) {}

  /** Payments (#34) plug in refund / "money received" checks here. */
  registerPaymentHooks(hooks: OrderPaymentHooks): void {
    this.paymentHooks = hooks;
  }

  async databaseNow(manager: EntityManager): Promise<Date> {
    const rows = await manager.query<Array<{ now: Date }>>(
      'SELECT clock_timestamp() AS now',
    );
    return new Date(rows[0].now);
  }

  private toCreateResponse(order: Order): CreateOrderResponseDto {
    return {
      message: 'Tạo đơn hàng thành công',
      orderId: order.id,
      total: order.total,
      subtotal: order.subtotal,
      discount: order.discount,
      voucherCode: order.voucherCode,
      voucherTitle: order.voucherTitle,
      status: order.status,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
    };
  }

  /** Same key again: the first order, never a second one; another cart: refused. */
  private async replay(
    previous: OrderRequestKey,
    requestHash: string,
    manager: EntityManager,
  ): Promise<Order> {
    if (previous.requestHash !== requestHash)
      throw new ConflictException(
        'Idempotency-Key đã được dùng cho một giỏ hàng khác',
      );
    const order = await manager
      .getRepository(Order)
      .findOneBy({ id: previous.orderId });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  /**
   * POST /orders. The Idempotency-Key is claimed first inside the transaction,
   * so a concurrent duplicate waits on the primary key and then returns the
   * order of the request that won. Prices always come from the database.
   */
  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey: string,
  ): Promise<CreateOrderResponseDto> {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 128)
      throw new BadRequestException('Idempotency-Key phải có 1–128 ký tự');
    const requestHash = orderRequestHash(dto);
    try {
      const savedOrder = await this.dataSource.transaction(async (manager) => {
        await this.benefits.requireUser(manager, userId);
        const keys = manager.getRepository(OrderRequestKey);
        const previous = await keys.findOneBy({ userId, idempotencyKey: key });
        if (previous) return this.replay(previous, requestHash, manager);
        const now = await this.databaseNow(manager);
        const orderId = `ORD-${randomUUID()}`;
        // Claim the key before any stock is reserved (FK is DEFERRABLE)
        await keys.insert({
          userId,
          idempotencyKey: key,
          orderId,
          requestHash,
        });
        const { subtotal, lines } = await priceCartItems(manager, dto.items);
        const items = lines.map((line, index) =>
          manager.getRepository(OrderItem).create({
            ...line,
            id: `${orderId}-${index + 1}`,
            orderId,
          }),
        );
        const timeoutMinutes = parsePaymentTimeoutMinutes(
          this.configService.get<string>('ORDER_PAYMENT_TIMEOUT_MINUTES'),
        );
        const order = manager.getRepository(Order).create({
          id: orderId,
          userId,
          status: 'PENDING',
          benefitsPolicyVersion:
            BENEFITS_POLICY_VERSIONS.VOUCHER_QUOTAS_AND_POINTS,
          subtotal,
          discount: 0,
          total: subtotal,
          items,
          createdAt: now,
          expiresAt: new Date(now.getTime() + timeoutMinutes * 60_000),
        });
        await manager.save(Order, order);
        await this.ensureInventoryReservation(order, manager);
        // Validate after inventory waits; an expired voucher rolls back the whole order.
        Object.assign(
          order,
          await this.vouchersService.apply(
            manager,
            subtotal,
            dto.voucherCode,
            await this.databaseNow(manager),
            true,
          ),
        );
        await this.benefits.reserve(order, manager);
        await manager.save(Order, order);
        return order;
      });
      return this.toCreateResponse(savedOrder);
    } catch (error) {
      // A concurrent request with the same key committed first
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        const winner = await this.dataSource
          .getRepository(OrderRequestKey)
          .findOneBy({ userId, idempotencyKey: key });
        if (winner)
          return this.toCreateResponse(
            await this.replay(winner, requestHash, this.dataSource.manager),
          );
      }
      throw error;
    }
  }

  findById(orderId: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });
  }

  /** Always lock the order before any of its payments or reserved ingredients. */
  lockById(orderId: string, manager: EntityManager): Promise<Order | null> {
    return manager.getRepository(Order).findOne({
      where: { id: orderId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async ensureInventoryReservation(
    order: Order,
    manager: EntityManager,
  ): Promise<void> {
    if (order.inventoryReservedAt) return;
    if (order.inventoryReleasedAt)
      throw new BadRequestException('Đơn hàng đã hết hạn hoặc đã bị hủy');
    const items =
      order.items ??
      (await manager.getRepository(OrderItem).findBy({ orderId: order.id }));
    if (!items.length) throw new BadRequestException('Đơn hàng không có món');
    const amounts = await this.inventoryService.reserveIngredients(
      items,
      manager,
    );
    await manager.getRepository(OrderInventoryReservation).insert(
      [...amounts].map(([ingredientId, amount]) => ({
        orderId: order.id,
        ingredientId,
        amount,
      })),
    );
    order.inventoryReservedAt = await this.databaseNow(manager);
    await manager.save(Order, order);
  }

  hasReceivedTransfer(orderId: string, manager: EntityManager) {
    return this.paymentHooks.hasReceivedTransfer(orderId, manager);
  }

  /**
   * Caller holds the order lock and must commit a timeout result before
   * returning an HTTP error. An order whose money already arrived is never
   * auto-cancelled: the customer paid in time, so staff decide.
   */
  async expireIfNeeded(order: Order, manager: EntityManager): Promise<boolean> {
    if (!(UNPAID_ORDER_STATUSES as readonly string[]).includes(order.status))
      return false;
    const now = await this.databaseNow(manager);
    if (order.expiresAt.getTime() > now.getTime()) return false;
    if (await this.hasReceivedTransfer(order.id, manager)) return false;
    await this.cancelLocked(order, manager, 'PAYMENT_TIMEOUT', now);
    return true;
  }

  /**
   * Cancel an order whose row is already locked: payments hook (refund),
   * give back reserved ingredients, release the voucher use, reverse points.
   */
  async cancelLocked(
    order: Order,
    manager: EntityManager,
    reason: CancellationReason,
    now: Date,
  ): Promise<Order> {
    if (order.status === 'CANCELLED') return order;
    assertTransition(order.status, 'CANCELLED');
    await this.paymentHooks.onOrderCancelled(order, manager, reason, now);
    if (order.cancelRequestStatus === 'PENDING') {
      order.cancelRequestStatus = 'EXPIRED';
      order.cancelReviewedAt = now;
      order.cancelReviewedBy = null;
      order.cancelReviewNote = 'Đơn đã hết hạn thanh toán.';
    }
    if (!order.inventoryReleasedAt) {
      if (order.inventoryReservedAt) {
        const rows = await manager
          .getRepository(OrderInventoryReservation)
          .findBy({ orderId: order.id });
        if (!rows.length)
          throw new ConflictException(
            'Thiếu dữ liệu nguyên liệu đã giữ cho đơn hàng',
          );
        await this.inventoryService.releaseIngredients(
          new Map(rows.map((r) => [r.ingredientId, r.amount])),
          manager,
        );
      }
      order.inventoryReleasedAt = now;
    }
    await this.benefits.reverse(order, manager, now);
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    order.cancelledAt = now;
    return manager.save(Order, order);
  }

  /**
   * State-machine entry point for payments (#34) and staff (#39).
   * With a caller's transaction, returns CANCELLED on expiry so the caller
   * can commit the cleanup before reporting an error.
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    manager?: EntityManager,
  ): Promise<Order> {
    const transition = async (transaction: EntityManager) => {
      const order = await this.lockById(orderId, transaction);
      if (!order)
        throw new BadRequestException(`Đơn hàng ${orderId} không tồn tại`);
      if (await this.expireIfNeeded(order, transaction)) return order;
      assertNoPendingCancellation(order);
      if (status === 'CANCELLED') {
        return this.cancelLocked(
          order,
          transaction,
          'USER_CANCELLED',
          await this.databaseNow(transaction),
        );
      }
      assertTransition(order.status, status);
      if (status === 'PAID' || status === 'PENDING') {
        await this.ensureInventoryReservation(order, transaction);
      }
      order.status = status;
      if (status === 'PAID')
        await this.benefits.award(
          order,
          transaction,
          await this.databaseNow(transaction),
        );
      return transaction.save(Order, order);
    };
    if (manager) return transition(manager);
    const order = await this.dataSource.transaction(transition);
    if (order.status !== status)
      throw new BadRequestException('Đơn đã hết hạn');
    return order;
  }

  /** One transaction per order keeps row/ingredient lock ordering consistent across workers. */
  async expireUnpaidOrders(limit = 100): Promise<number> {
    const candidates = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.id')
      .where('order.status IN (:...statuses)', {
        statuses: [...UNPAID_ORDER_STATUSES],
      })
      .andWhere('order.expiresAt <= clock_timestamp()')
      .orderBy('order.expiresAt', 'ASC')
      .addOrderBy('order.id', 'ASC')
      .take(limit)
      .getMany();
    let expired = 0;
    for (const candidate of candidates) {
      const changed = await this.dataSource.transaction(async (manager) => {
        const order = await manager
          .getRepository(Order)
          .createQueryBuilder('order')
          .where('order.id = :id', { id: candidate.id })
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .getOne();
        return order ? this.expireIfNeeded(order, manager) : false;
      });
      if (changed) expired++;
    }
    return expired;
  }
}
