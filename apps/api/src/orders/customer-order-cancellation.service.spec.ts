import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import { CustomerOrderCancellationService } from './customer-order-cancellation.service';
import type { OrderBenefitsService } from './order-benefits.service';
import type { OrdersService } from './orders.service';
import type { Order } from './order.entity';
import type { OrderStatus } from './order-status';

const NOW = new Date('2026-11-13T12:00:00Z');
function fixture(status: OrderStatus = 'PENDING') {
  const order = {
    id: 'ORD-1',
    userId: 'owner',
    status,
    expiresAt: new Date(NOW.getTime() + 60000),
    cancelRequestStatus: null,
    cancelReason: null,
    cancelledAt: null,
  } as Order;
  const manager = { save: jest.fn(async () => order) };
  const core = {
    lockById: jest.fn(async () => order as Order | null),
    expireIfNeeded: jest.fn(async () => false),
    hasReceivedTransfer: jest.fn(async () => false),
    databaseNow: jest.fn(async () => NOW),
    cancelLocked: jest.fn(async () =>
      Object.assign(order, {
        status: 'CANCELLED',
        cancelledAt: NOW,
        cancelReason: 'USER_CANCELLED',
      }),
    ),
  };
  const benefits = { requireUser: jest.fn(async () => {}) };
  const transaction = jest.fn(
    async (work: (manager: EntityManager) => Promise<unknown>) =>
      work(manager as unknown as EntityManager),
  );
  const service = new CustomerOrderCancellationService(
    { transaction } as unknown as DataSource,
    core as unknown as OrdersService,
    benefits as unknown as OrderBenefitsService,
  );
  return { order, manager, core, benefits, transaction, service };
}

describe('API-T70 customer cancellation policy and transaction boundary', () => {
  it.each<OrderStatus>(['PENDING', 'PAYMENT_FAILED'])(
    'unpaid %s cancels through the existing transaction core',
    async (status) => {
      const f = fixture(status);
      const result = await f.service.cancelOrder('owner', 'ORD-1');
      expect(result.status).toBe('CANCELLED');
      expect(f.core.cancelLocked).toHaveBeenCalledWith(
        f.order,
        f.manager,
        'USER_CANCELLED',
        NOW,
      );
    },
  );
  it('repeated cancellation of CANCELLED does not release/refund twice', async () => {
    const f = fixture('CANCELLED');
    await f.service.cancelOrder('owner', 'ORD-1');
    expect(f.core.cancelLocked).not.toHaveBeenCalled();
  });
  it.each<OrderStatus>(['PAID', 'PENDING', 'PAYMENT_FAILED'])(
    '%s with received money never uses immediate cancellation',
    async (status) => {
      const f = fixture(status);
      f.core.hasReceivedTransfer.mockResolvedValue(true);
      await expect(
        f.service.cancelOrder('owner', 'ORD-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(f.core.cancelLocked).not.toHaveBeenCalled();
    },
  );
  it.each<OrderStatus>(['PREPARING', 'READY', 'COMPLETED'])(
    'SRS: %s rejects both customer actions with 400',
    async (status) => {
      const f = fixture(status);
      await expect(
        f.service.cancelOrder('owner', 'ORD-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        f.service.requestCancellation('owner', 'ORD-1', 'reason'),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
  it('another account cannot read or mutate cancellation even with a known ID', async () => {
    const f = fixture();
    await expect(
      f.service.cancelOrder('other', 'ORD-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      f.service.requestCancellation('other', 'ORD-1', 'reason'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(f.core.expireIfNeeded).not.toHaveBeenCalled();
    expect(f.manager.save).not.toHaveBeenCalled();
  });
  it('missing order returns 404', async () => {
    const f = fixture();
    f.core.lockById.mockResolvedValue(null);
    await expect(
      f.service.cancelOrder('owner', 'ORD-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('PAID request persists a trimmed reason without changing order state or refunding', async () => {
    const f = fixture('PAID');
    const deadline = f.order.expiresAt;
    await f.service.requestCancellation(
      'owner',
      'ORD-1',
      '  changed schedule  ',
    );
    expect(f.order).toMatchObject({
      status: 'PAID',
      cancelRequestStatus: 'PENDING',
      cancelRequestReason: 'changed schedule',
      expiresAt: deadline,
    });
    expect(f.order.cancelRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(f.core.cancelLocked).not.toHaveBeenCalled();
  });
  it('TRANSFER_RECEIVED still allows requesting after expiresAt', async () => {
    const f = fixture();
    f.order.expiresAt = new Date(NOW.getTime() - 60000);
    f.core.hasReceivedTransfer.mockResolvedValue(true);
    await f.service.requestCancellation('owner', 'ORD-1', 'reason');
    expect(f.order.cancelRequestStatus).toBe('PENDING');
    expect(f.order.status).toBe('PENDING');
  });
  it('pending request is replayed without changing request ID/reason or deadline', async () => {
    const f = fixture('PAID');
    Object.assign(f.order, {
      cancelRequestId: 'original',
      cancelRequestStatus: 'PENDING',
      cancelRequestReason: 'first',
    });
    await f.service.requestCancellation('owner', 'ORD-1', 'second');
    expect(f.order).toMatchObject({
      cancelRequestId: 'original',
      cancelRequestReason: 'first',
    });
    expect(f.manager.save).not.toHaveBeenCalled();
    await expect(
      f.service.cancelOrder('owner', 'ORD-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('unpaid request asks the customer to use immediate cancellation', async () => {
    const f = fixture();
    await expect(
      f.service.requestCancellation('owner', 'ORD-1', 'reason'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it.each(['', '   ', 'x'.repeat(501)])(
    'invalid reason never starts a transaction (%s)',
    async (reason) => {
      const f = fixture();
      await expect(
        f.service.requestCancellation('owner', 'ORD-1', reason),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(f.transaction).not.toHaveBeenCalled();
    },
  );
  it('request timeout cleanup commits before a conflict is reported', async () => {
    const f = fixture();
    f.core.expireIfNeeded.mockResolvedValue(true);
    let committed = false;
    f.transaction.mockImplementation(async (work) => {
      const result = await work(f.manager as unknown as EntityManager);
      committed = true;
      return result;
    });
    await expect(
      f.service.requestCancellation('owner', 'ORD-1', 'reason'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(committed).toBe(true);
    expect(f.manager.save).not.toHaveBeenCalled();
  });
  it('a write failure propagates to the caller transaction for rollback', async () => {
    const f = fixture('PAID');
    f.manager.save.mockRejectedValue(new Error('database failure'));
    await expect(
      f.service.requestCancellation('owner', 'ORD-1', 'reason'),
    ).rejects.toThrow('database failure');
    expect(f.core.cancelLocked).not.toHaveBeenCalled();
  });
  it('uses the same Unicode character limit as the reason DTO', async () => {
    const f = fixture('PAID');
    await f.service.requestCancellation('owner', 'ORD-1', '🧋'.repeat(500));
    expect(Array.from(f.order.cancelRequestReason!)).toHaveLength(500);
  });
});
