import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { User } from '../auth/user.entity';
import type { Payment } from '../payments/entities/payment.entity';
import type { BankLedgerService } from '../mock-bank/bank-ledger.service';
import { OrderHistoryService } from './order-history.service';
import type { OrdersService } from './orders.service';
import type { Order } from './order.entity';

const ID = '12345678-1234-4234-9234-123456789012';
const STAFF = '22345678-1234-4234-9234-123456789012';
function fixture() {
  const now = new Date('2026-11-14T07:00:00Z');
  const order = {
    id: 'ORD-1',
    userId: ID,
    status: 'CANCELLED',
    subtotal: 40000,
    discount: 5000,
    total: 35000,
    voucherCode: 'THU5K',
    voucherTitle: 'Stored offer',
    expiresAt: now,
    cancelRequestId: 'req',
    cancelRequestStatus: 'APPROVED',
    cancelRequestedAt: now,
    cancelRequestReason: 'changed plans',
    cancelReviewedAt: now,
    cancelReviewedBy: STAFF,
    items: [
      {
        id: 'line-1',
        productId: 'p1',
        productName: 'Stored coffee',
        productImageUrl: '/old.jpg',
        size: 'M',
        toppingIds: [],
        qty: 1,
        unitPrice: 40000,
        lineTotal: 40000,
      },
    ],
  } as Order;
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(async () => [[order], 21]),
  };
  const orders = {
    find: jest.fn(async () => [order]),
    findOne: jest.fn(async () => order as Order | null),
    createQueryBuilder: jest.fn(() => qb),
  };
  const users = {
    find: jest.fn(async () => [
      { id: ID, email: 'customer@test.vn' },
      { id: STAFF, email: 'staff@test.vn' },
    ]),
  };
  const payments = {
    find: jest.fn(
      async () =>
        [
          {
            id: 'PAY-1',
            orderId: 'ORD-1',
            status: 'FAILED',
            method: 'WALLET',
            amount: 35000,
            reviewedBy: STAFF,
            receivedAt: now,
            reviewedAt: now,
            createdAt: now,
            reviewNote: 'Cancelled',
          },
        ] as Payment[],
    ),
  };
  const ledger = {
    refundedByOrder: jest.fn(async () => new Map([['ORD-1', 35000]])),
  };
  const service = new OrderHistoryService(
    orders as unknown as Repository<Order>,
    users as unknown as Repository<User>,
    { manager: {} } as DataSource,
    { databaseNow: async () => now } as OrdersService,
    payments as unknown as Repository<Payment>,
    ledger as unknown as BankLedgerService,
  );
  return { service, order, orders, users, payments, qb };
}
describe('API-T83 admin history queries and snapshot/audit privacy', () => {
  it('filters every status, escapes literal wildcards, uses stable pagination', async () => {
    const f = fixture();
    const result = await f.service.findForAdminHistory({
      status: 'CANCELLED',
      q: '%_\\',
      page: 2,
      pageSize: 20,
    });
    expect(f.qb.skip).toHaveBeenCalledWith(20);
    expect(f.qb.take).toHaveBeenCalledWith(20);
    expect(f.qb.orderBy).toHaveBeenCalledWith('o.createdAt', 'DESC');
    expect(f.qb.addOrderBy).toHaveBeenCalledWith('o.id', 'DESC');
    expect(f.qb.andWhere).toHaveBeenCalledWith(
      'o.status = :status',
      expect.objectContaining({ status: 'CANCELLED' }),
    );
    expect(f.qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      { search: '%\\%\\_\\\\%' },
    );
    expect(result).toMatchObject({
      total: 21,
      page: 2,
      pageSize: 20,
      items: [
        {
          customerEmail: 'customer@test.vn',
          subtotal: 40000,
          discount: 5000,
          total: 35000,
          refundedAmount: 35000,
        },
      ],
    });
  });
  it('detail exposes only explicit user/payment projection, never password or idempotency keys', async () => {
    const f = fixture();
    const result = await f.service.findAdminDetail('ORD-1');
    expect(result).toMatchObject({
      customerEmail: 'customer@test.vn',
      cancelReviewedByEmail: 'staff@test.vn',
      voucherTitle: 'Stored offer',
      payments: [
        {
          paymentId: 'PAY-1',
          status: 'FAILED',
          amount: 35000,
          reviewedByEmail: 'staff@test.vn',
        },
      ],
    });
    expect(f.users.find).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, email: true } }),
    );
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|idempotencyKey/);
    expect(result.items[0]).toMatchObject({
      name: 'Stored coffee',
      unitPrice: 40000,
    });
  });
  it('pending requests and preparation orders are oldest-first, queried separately', async () => {
    const f = fixture();
    await f.service.findCancellationRequests('PENDING');
    expect(f.orders.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cancelRequestStatus: 'PENDING' },
        order: { cancelRequestedAt: 'ASC', id: 'ASC' },
      }),
    );
    await f.service.findPreparationOrders();
    expect(f.orders.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ order: { createdAt: 'ASC', id: 'ASC' } }),
    );
  });
  it('missing admin detail/mutation response is 404', async () => {
    const f = fixture();
    f.orders.findOne.mockResolvedValue(null);
    await expect(f.service.findAdminDetail('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(f.service.findForAdminById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
