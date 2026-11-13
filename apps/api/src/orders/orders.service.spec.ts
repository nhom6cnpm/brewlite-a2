import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { InventoryService } from '../inventory/inventory.service';
import { Product } from '../products/product.entity';
import type { VouchersService } from '../vouchers/vouchers.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { OrderBenefitsService } from './order-benefits.service';
import { OrderInventoryReservation } from './order-inventory-reservation.entity';
import { OrderItem } from './order-item.entity';
import { orderRequestHash } from './order-request-hash';
import { OrderRequestKey } from './order-request-key.entity';
import { InvalidOrderTransitionException } from './order-status';
import { Order } from './order.entity';
import { OrdersService } from './orders.service';

const NOW = new Date('2026-11-13T10:00:00Z');
const USER = '0f8fad5b-d9cb-469f-a165-70867728950e';
const cart: CreateOrderDto = {
  items: [
    { productId: 'p2', size: 'M', toppingIds: ['pearls'], qty: 2 },
    { productId: 'p1', size: 'S', toppingIds: [], qty: 1 },
  ],
};
const products: Product[] = [
  { id: 'p1', name: 'Americano', price: 30000, imageUrl: '/p1.png' },
  { id: 'p2', name: 'Bạc xỉu', price: 29000, imageUrl: '/p2.png' },
] as Product[];

function makeOrder(overrides: Partial<Order> = {}): Order {
  return Object.assign(new Order(), {
    id: 'ORD-1',
    userId: USER,
    status: 'PENDING',
    subtotal: 60000,
    discount: 0,
    total: 60000,
    voucherCode: null,
    createdAt: NOW,
    expiresAt: new Date(NOW.getTime() - 1000),
    inventoryReservedAt: NOW,
    inventoryReleasedAt: null,
    cancelRequestStatus: null,
    ...overrides,
  });
}

function fixture(options: { timeout?: string; now?: Date } = {}) {
  const keys: OrderRequestKey[] = [];
  const orders = new Map<string, Order>();
  const reservations: OrderInventoryReservation[] = [];
  const repositories = new Map<unknown, Record<string, jest.Mock>>([
    [
      OrderRequestKey,
      {
        findOneBy: jest.fn(
          async ({ userId, idempotencyKey }: Partial<OrderRequestKey>) =>
            keys.find(
              (k) => k.userId === userId && k.idempotencyKey === idempotencyKey,
            ) ?? null,
        ),
        insert: jest.fn(async (row: OrderRequestKey) => {
          keys.push(row);
        }),
      },
    ],
    [
      Order,
      {
        create: jest.fn((data: Partial<Order>) =>
          Object.assign(new Order(), data),
        ),
        findOneBy: jest.fn(
          async ({ id }: { id: string }) => orders.get(id) ?? null,
        ),
        findOne: jest.fn(
          async ({ where }: { where: { id: string } }) =>
            orders.get(where.id) ?? null,
        ),
      },
    ],
    [
      OrderItem,
      {
        create: jest.fn((data: Partial<OrderItem>) =>
          Object.assign(new OrderItem(), data),
        ),
        findBy: jest.fn(async () => []),
      },
    ],
    [
      Product,
      {
        findBy: jest.fn(async () => products),
      },
    ],
    [
      OrderInventoryReservation,
      {
        insert: jest.fn(async (rows: OrderInventoryReservation[]) => {
          reservations.push(...rows);
        }),
        findBy: jest.fn(async () => reservations),
      },
    ],
  ]);
  const manager = {
    getRepository: (entity: unknown) => repositories.get(entity),
    query: jest.fn(async () => [{ now: options.now ?? NOW }]),
    save: jest.fn(async (_entity: unknown, order: Order) => {
      orders.set(order.id, order);
      return order;
    }),
    queryRunner: { isTransactionActive: true },
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn((work: (m: EntityManager) => unknown) =>
      work(manager),
    ),
    manager,
    getRepository: (entity: unknown) => repositories.get(entity),
  } as unknown as DataSource;
  const inventory = {
    reserveIngredients: jest.fn(async () => new Map([['coffee', 38]])),
    releaseIngredients: jest.fn(async () => undefined),
  };
  const vouchers = {
    apply: jest.fn(async (_m: EntityManager, subtotal: number) => ({
      subtotal,
      discount: 0,
      total: subtotal,
      voucherCode: null,
      voucherTitle: null,
    })),
  };
  const benefits = {
    requireUser: jest.fn(async () => undefined),
    reserve: jest.fn(async () => undefined),
    award: jest.fn(async () => undefined),
    reverse: jest.fn(async () => undefined),
  };
  const config = new ConfigService(
    options.timeout ? { ORDER_PAYMENT_TIMEOUT_MINUTES: options.timeout } : {},
  );
  const service = new OrdersService(
    {} as Repository<Order>,
    dataSource,
    inventory as unknown as InventoryService,
    vouchers as unknown as VouchersService,
    config,
    benefits as unknown as OrderBenefitsService,
  );
  return {
    service,
    manager,
    keys,
    orders,
    reservations,
    inventory,
    vouchers,
    benefits,
  };
}

describe('API-T15 OrdersService.createOrder (POST /orders)', () => {
  it('tạo đơn PENDING với giá do server tính, hạn 15 phút', async () => {
    const { service, inventory, benefits, reservations } = fixture();
    const result = await service.createOrder(USER, cart, 'key-1');
    // p2 M + pearls: 29000 + 5000 + 5000 = 39000 × 2; p1 S: 30000
    expect(result.subtotal).toBe(108000);
    expect(result.total).toBe(108000);
    expect(result.status).toBe('PENDING');
    expect(result.orderId).toMatch(/^ORD-/);
    expect(result.expiresAt.getTime() - NOW.getTime()).toBe(15 * 60_000);
    expect(inventory.reserveIngredients).toHaveBeenCalledTimes(1);
    expect(reservations).toEqual([
      { orderId: result.orderId, ingredientId: 'coffee', amount: 38 },
    ]);
    expect(benefits.reserve).toHaveBeenCalledTimes(1);
  });

  it('đọc ORDER_PAYMENT_TIMEOUT_MINUTES', async () => {
    const { service } = fixture({ timeout: '5' });
    const result = await service.createOrder(USER, cart, 'key-1');
    expect(result.expiresAt.getTime() - NOW.getTime()).toBe(5 * 60_000);
  });

  it('cùng key + cùng giỏ trả về đơn cũ, không giữ kho lần hai', async () => {
    const { service, inventory, keys } = fixture();
    const first = await service.createOrder(USER, cart, 'key-1');
    const second = await service.createOrder(USER, cart, 'key-1');
    expect(second.orderId).toBe(first.orderId);
    expect(keys).toHaveLength(1);
    expect(inventory.reserveIngredients).toHaveBeenCalledTimes(1);
  });

  it('cùng key nhưng khác giỏ bị từ chối 409', async () => {
    const { service } = fixture();
    await service.createOrder(USER, cart, 'key-1');
    await expect(
      service.createOrder(
        USER,
        { items: [{ productId: 'p1', size: 'L', toppingIds: [], qty: 3 }] },
        'key-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it.each(['', '   ', 'x'.repeat(129)])(
    'thiếu hoặc sai Idempotency-Key (%j) bị 400',
    async (key) => {
      const { service, inventory } = fixture();
      await expect(service.createOrder(USER, cart, key)).rejects.toThrow(
        BadRequestException,
      );
      expect(inventory.reserveIngredients).not.toHaveBeenCalled();
    },
  );

  it('món không tồn tại bị 400', async () => {
    const { service } = fixture();
    await expect(
      service.createOrder(
        USER,
        { items: [{ productId: 'p99', size: 'S', toppingIds: [], qty: 1 }] },
        'key-2',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('áp voucher do server kiểm tra (tổng = tạm tính - giảm)', async () => {
    const { service, vouchers } = fixture();
    vouchers.apply.mockResolvedValueOnce({
      subtotal: 108000,
      discount: 5000,
      total: 103000,
      voucherCode: 'THU5K',
      voucherTitle: 'Giảm 5.000đ',
    });
    const result = await service.createOrder(
      USER,
      { ...cart, voucherCode: 'THU5K' },
      'key-3',
    );
    expect(result).toMatchObject({
      subtotal: 108000,
      discount: 5000,
      total: 103000,
      voucherCode: 'THU5K',
    });
  });

  it('lần gửi đồng thời thua khóa chính nhận lại đơn của lần thắng', async () => {
    const { service, manager, keys, orders } = fixture();
    const winner = makeOrder({ id: 'ORD-winner' });
    orders.set(winner.id, winner);
    const duplicate = Object.assign(new Error('duplicate key'), {
      driverError: { code: '23505' },
    });
    Object.setPrototypeOf(
      duplicate,
      (await import('typeorm')).QueryFailedError.prototype,
    );
    const repo = manager.getRepository(OrderRequestKey) as unknown as {
      insert: jest.Mock;
    };
    repo.insert.mockImplementationOnce(async () => {
      keys.push({
        userId: USER,
        idempotencyKey: 'key-4',
        orderId: winner.id,
        requestHash: orderRequestHash(cart),
      } as OrderRequestKey);
      throw duplicate;
    });
    const result = await service.createOrder(USER, cart, 'key-4');
    expect(result.orderId).toBe('ORD-winner');
  });
});

describe('API-T16 OrdersService.expireIfNeeded (tự hủy đơn quá hạn)', () => {
  it('hủy đơn PENDING quá hạn, hoàn nguyên liệu và lượt voucher', async () => {
    const { service, manager, inventory, benefits, reservations } = fixture();
    reservations.push({
      orderId: 'ORD-1',
      ingredientId: 'coffee',
      amount: 38,
    } as OrderInventoryReservation);
    const order = makeOrder();
    await expect(service.expireIfNeeded(order, manager)).resolves.toBe(true);
    expect(order.status).toBe('CANCELLED');
    expect(order.cancelReason).toBe('PAYMENT_TIMEOUT');
    expect(order.inventoryReleasedAt).toEqual(NOW);
    expect(inventory.releaseIngredients).toHaveBeenCalledWith(
      new Map([['coffee', 38]]),
      manager,
    );
    expect(benefits.reverse).toHaveBeenCalledWith(order, manager, NOW);
  });

  it('không hủy đơn còn hạn', async () => {
    const { service, manager } = fixture();
    const order = makeOrder({ expiresAt: new Date(NOW.getTime() + 60_000) });
    await expect(service.expireIfNeeded(order, manager)).resolves.toBe(false);
    expect(order.status).toBe('PENDING');
  });

  it.each(['PAID', 'PREPARING', 'CANCELLED'] as const)(
    'không đụng tới đơn %s',
    async (status) => {
      const { service, manager } = fixture();
      const order = makeOrder({ status });
      await expect(service.expireIfNeeded(order, manager)).resolves.toBe(false);
      expect(order.status).toBe(status);
    },
  );

  it('không hủy đơn đã có tiền về (hook thanh toán #34)', async () => {
    const { service, manager, inventory } = fixture();
    const onOrderCancelled = jest.fn(async () => undefined);
    service.registerPaymentHooks({
      hasReceivedTransfer: async () => true,
      onOrderCancelled,
    });
    const order = makeOrder();
    await expect(service.expireIfNeeded(order, manager)).resolves.toBe(false);
    expect(order.status).toBe('PENDING');
    expect(inventory.releaseIngredients).not.toHaveBeenCalled();
    expect(onOrderCancelled).not.toHaveBeenCalled();
  });

  it('gọi hook hoàn tiền của thanh toán khi hủy', async () => {
    const { service, manager, reservations } = fixture();
    reservations.push({
      orderId: 'ORD-1',
      ingredientId: 'coffee',
      amount: 1,
    } as OrderInventoryReservation);
    const onOrderCancelled = jest.fn(async () => undefined);
    service.registerPaymentHooks({
      hasReceivedTransfer: async () => false,
      onOrderCancelled,
    });
    const order = makeOrder();
    await service.expireIfNeeded(order, manager);
    expect(onOrderCancelled).toHaveBeenCalledWith(
      order,
      manager,
      'PAYMENT_TIMEOUT',
      NOW,
    );
  });
});

describe('API-T17 OrdersService.updateOrderStatus (máy trạng thái)', () => {
  it('chặn chuyển trạng thái sai (READY -> PAID)', async () => {
    const { service, orders } = fixture();
    orders.set(
      'ORD-1',
      makeOrder({
        status: 'READY',
        expiresAt: new Date(NOW.getTime() + 60_000),
      }),
    );
    await expect(service.updateOrderStatus('ORD-1', 'PAID')).rejects.toThrow(
      InvalidOrderTransitionException,
    );
  });

  it('PENDING -> PAID cộng điểm', async () => {
    const { service, orders, benefits } = fixture();
    orders.set(
      'ORD-1',
      makeOrder({ expiresAt: new Date(NOW.getTime() + 60_000) }),
    );
    const order = await service.updateOrderStatus('ORD-1', 'PAID');
    expect(order.status).toBe('PAID');
    expect(benefits.award).toHaveBeenCalledTimes(1);
  });

  it('đơn đã quá hạn: hủy và báo lỗi thay vì thanh toán', async () => {
    const { service, orders, reservations } = fixture();
    reservations.push({
      orderId: 'ORD-1',
      ingredientId: 'coffee',
      amount: 1,
    } as OrderInventoryReservation);
    orders.set('ORD-1', makeOrder());
    await expect(service.updateOrderStatus('ORD-1', 'PAID')).rejects.toThrow(
      'Đơn đã hết hạn',
    );
    expect(orders.get('ORD-1')?.status).toBe('CANCELLED');
  });

  it('đơn không tồn tại bị 400', async () => {
    const { service } = fixture();
    await expect(service.updateOrderStatus('ORD-x', 'PAID')).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('API-T15 replay', () => {
  it('key trỏ tới đơn đã mất thì 404', async () => {
    const { service, keys } = fixture();
    keys.push({
      userId: USER,
      idempotencyKey: 'key-5',
      orderId: 'ORD-gone',
      requestHash: orderRequestHash(cart),
    } as OrderRequestKey);
    await expect(service.createOrder(USER, cart, 'key-5')).rejects.toThrow(
      NotFoundException,
    );
  });
});
