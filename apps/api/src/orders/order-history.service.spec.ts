import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { User } from '../auth/user.entity';
import type { Payment } from '../payments/entities/payment.entity';
import type { BankLedgerService } from '../mock-bank/bank-ledger.service';
import { OrderHistoryService } from './order-history.service';
import type { OrdersService } from './orders.service';
import type { Order } from './order.entity';

const USER = '12345678-1234-4234-9234-123456789012';
const NOW = new Date('2026-11-13T12:00:00Z');
function fixture() {
  const order = {
    id: 'ORD-1',
    userId: USER,
    status: 'PENDING',
    subtotal: 40000,
    discount: 5000,
    total: 35000,
    voucherCode: 'THU5K',
    voucherTitle: 'Stored offer',
    expiresAt: new Date(NOW.getTime() + 60000),
    cancelRequestStatus: null,
    items: [
      {
        id: 'line-1',
        productId: 'p1',
        productName: 'Stored coffee',
        productImageUrl: '/images/coffee.jpg',
        size: 'M',
        toppingIds: [],
        qty: 1,
        unitPrice: 40000,
        lineTotal: 40000,
      },
    ],
  } as Order;
  const orders = {
    find: jest.fn(async () => [order]),
    findOne: jest.fn(async () => order as Order | null),
  };
  const users = { existsBy: jest.fn(async () => true) };
  const payments = { find: jest.fn(async () => [] as Payment[]) };
  const ledger = {
    refundedByOrder: jest.fn(async () => new Map<string, number>()),
  };
  const clock = { databaseNow: jest.fn(async () => NOW) };
  const service = new OrderHistoryService(
    orders as unknown as Repository<Order>,
    users as unknown as Repository<User>,
    { manager: {} } as DataSource,
    clock as unknown as OrdersService,
    payments as unknown as Repository<Payment>,
    ledger as unknown as BankLedgerService,
  );
  return { order, orders, users, payments, ledger, service };
}
describe('API-T72 history snapshot, payment/refund projection and isolation', () => {
  it('preserves stored item/voucher prices and gets refund from ledger', async () => {
    const f = fixture();
    f.ledger.refundedByOrder.mockResolvedValue(new Map([['ORD-1', 35000]]));
    f.payments.find.mockResolvedValue([
      { orderId: 'ORD-1', status: 'FAILED', method: 'WALLET' },
    ] as Payment[]);
    const result = await f.service.findMine(USER);
    expect(result[0]).toMatchObject({
      subtotal: 40000,
      discount: 5000,
      total: 35000,
      voucherTitle: 'Stored offer',
      paymentMethod: 'WALLET',
      refundedAmount: 35000,
      items: [
        expect.objectContaining({ name: 'Stored coffee', unitPrice: 40000 }),
      ],
    });
    expect(f.orders.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER } }),
    );
  });
  it('prefers successful payment over a newer failed attempt', async () => {
    const f = fixture();
    f.payments.find.mockResolvedValue([
      { orderId: 'ORD-1', status: 'FAILED', method: 'WALLET' },
      { orderId: 'ORD-1', status: 'SUCCESS', method: 'CARD' },
    ] as Payment[]);
    expect((await f.service.findMine(USER))[0].paymentMethod).toBe('CARD');
  });
  it('received transfer after deadline remains requestable, never payable again', async () => {
    const f = fixture();
    f.order.expiresAt = new Date(NOW.getTime() - 60000);
    f.payments.find.mockResolvedValue([
      { orderId: 'ORD-1', status: 'TRANSFER_RECEIVED', method: 'WALLET' },
    ] as Payment[]);
    expect((await f.service.findMine(USER))[0]).toMatchObject({
      transferReceived: true,
      canRequestCancellation: true,
      canCancelImmediately: false,
      canPay: false,
    });
  });
  it('no payment uses explicit null/zero, not fabricated settlement', async () => {
    const f = fixture();
    expect((await f.service.findMine(USER))[0]).toMatchObject({
      paymentMethod: null,
      refundedAmount: 0,
      transferReceived: false,
    });
  });
  it('an empty history does not query payment/ledger', async () => {
    const f = fixture();
    f.orders.find.mockResolvedValue([]);
    expect(await f.service.findMine(USER)).toEqual([]);
    expect(f.payments.find).not.toHaveBeenCalled();
    expect(f.ledger.refundedByOrder).not.toHaveBeenCalled();
  });
  it('deleted or invalid accounts get 401', async () => {
    const f = fixture();
    f.users.existsBy.mockResolvedValue(false);
    await expect(f.service.findMine(USER)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(f.service.findMine('invalid-id')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(f.orders.find).not.toHaveBeenCalled();
  });
  it('detail query scopes the ID to its owner and returns 404 for another account', async () => {
    const f = fixture();
    f.orders.findOne.mockResolvedValue(null);
    await expect(
      f.service.findOwnById(USER, 'ORD-other'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(f.orders.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ORD-other', userId: USER } }),
    );
    expect(f.payments.find).not.toHaveBeenCalled();
  });
});
