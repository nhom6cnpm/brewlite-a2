import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import { AdminOrderWorkflowService } from './admin-order-workflow.service';
import type { Order } from './order.entity';
import type { OrdersService } from './orders.service';
import { assertTransition, type OrderStatus } from './order-status';

const NOW = new Date('2026-11-14T07:00:00Z');
function fixture(status: OrderStatus = 'PAID') {
  const order = {
    id: 'ORD-1',
    status,
    cancelRequestId: 'req-1',
    cancelRequestStatus: 'PENDING',
  } as Order;
  const manager = { save: jest.fn(async () => order) };
  const core = {
    lockById: jest.fn(async () => order as Order | null),
    expireIfNeeded: jest.fn(async () => false),
    databaseNow: jest.fn(async () => NOW),
    cancelLocked: jest.fn(async () =>
      Object.assign(order, { status: 'CANCELLED' }),
    ),
    updateOrderStatus: jest.fn(async (_id: string, target: OrderStatus) => {
      assertTransition(order.status, target);
      order.status = target;
      return order;
    }),
  };
  let committed = false;
  const transaction = jest.fn(
    async (work: (em: EntityManager) => Promise<unknown>) => {
      const result = await work(manager as unknown as EntityManager);
      committed = true;
      return result;
    },
  );
  const service = new AdminOrderWorkflowService(
    { transaction } as unknown as DataSource,
    core as unknown as OrdersService,
  );
  return {
    order,
    manager,
    core,
    transaction,
    service,
    committed: () => committed,
  };
}

describe('API-T81 admin review: identity, replay and transaction', () => {
  it('approves through core refund/inventory/benefits hook using the same manager', async () => {
    const f = fixture();
    await f.service.reviewCancellation(
      'admin',
      'ORD-1',
      'req-1',
      'APPROVED',
      '  agreed  ',
    );
    expect(f.order).toMatchObject({
      cancelRequestStatus: 'APPROVED',
      cancelReviewedBy: 'admin',
      cancelReviewedAt: NOW,
      cancelReviewNote: 'agreed',
      status: 'CANCELLED',
    });
    expect(f.core.cancelLocked).toHaveBeenCalledWith(
      f.order,
      f.manager,
      'USER_CANCELLED',
      NOW,
    );
    await f.service.reviewCancellation(
      'other-admin',
      'ORD-1',
      'req-1',
      'APPROVED',
    );
    expect(f.core.cancelLocked).toHaveBeenCalledTimes(1);
    expect(f.order.cancelReviewedBy).toBe('admin');
  });
  it('rejects with trimmed reason without cancelling/refunding; same decision replay preserves audit', async () => {
    const f = fixture();
    await f.service.reviewCancellation(
      'admin',
      'ORD-1',
      'req-1',
      'REJECTED',
      '  continue  ',
    );
    expect(f.order).toMatchObject({
      status: 'PAID',
      cancelRequestStatus: 'REJECTED',
      cancelReviewNote: 'continue',
    });
    expect(f.core.cancelLocked).not.toHaveBeenCalled();
    await f.service.reviewCancellation(
      'other',
      'ORD-1',
      'req-1',
      'REJECTED',
      'different',
    );
    expect(f.manager.save).toHaveBeenCalledTimes(1);
    await expect(
      f.service.reviewCancellation('admin', 'ORD-1', 'req-1', 'APPROVED'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('stale request id never approves a newer request', async () => {
    const f = fixture();
    await expect(
      f.service.reviewCancellation('admin', 'ORD-1', 'old', 'APPROVED'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(f.manager.save).not.toHaveBeenCalled();
  });
  it.each<OrderStatus>(['PREPARING', 'READY', 'COMPLETED'])(
    'refuses cancellation from %s with 400',
    async (status) => {
      const f = fixture(status);
      await expect(
        f.service.reviewCancellation('admin', 'ORD-1', 'req-1', 'APPROVED'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(f.core.cancelLocked).not.toHaveBeenCalled();
    },
  );
  it.each(['', ' ', 'x'.repeat(501)])(
    'invalid rejection reason cannot start a transaction',
    async (reason) => {
      const f = fixture();
      await expect(
        f.service.reviewCancellation(
          'admin',
          'ORD-1',
          'req-1',
          'REJECTED',
          reason,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(f.transaction).not.toHaveBeenCalled();
    },
  );
  it('accepts 500 Unicode characters', async () => {
    const f = fixture();
    await f.service.reviewCancellation(
      'admin',
      'ORD-1',
      'req-1',
      'REJECTED',
      '🧋'.repeat(500),
    );
    expect(Array.from(f.order.cancelReviewNote!)).toHaveLength(500);
  });
  it('expired cleanup commits before HTTP conflict; no second cancel/save', async () => {
    const f = fixture('PENDING');
    f.core.expireIfNeeded.mockResolvedValue(true);
    await expect(
      f.service.reviewCancellation('admin', 'ORD-1', 'req-1', 'APPROVED'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(f.committed()).toBe(true);
    expect(f.manager.save).not.toHaveBeenCalled();
  });
  it('missing order returns 404 and hook failure rolls back transaction', async () => {
    const f = fixture();
    f.core.lockById.mockResolvedValueOnce(null);
    await expect(
      f.service.reviewCancellation('admin', 'missing', 'req-1', 'APPROVED'),
    ).rejects.toBeInstanceOf(NotFoundException);
    f.core.cancelLocked.mockRejectedValueOnce(new Error('hook failed'));
    await expect(
      f.service.reviewCancellation('admin', 'ORD-1', 'req-1', 'APPROVED'),
    ).rejects.toThrow('hook failed');
    expect(f.committed()).toBe(false);
  });
});

describe('API-T82 preparation: only ordered transitions, replay and pending review', () => {
  it('uses core for PAID → PREPARING → READY → COMPLETED, no cancellation hooks', async () => {
    const f = fixture();
    f.order.cancelRequestStatus = null;
    for (const target of ['PREPARING', 'READY', 'COMPLETED'] as const)
      await f.service.advancePreparation('ORD-1', target);
    expect(f.order.status).toBe('COMPLETED');
    expect(f.core.updateOrderStatus).toHaveBeenCalledTimes(3);
    expect(f.core.cancelLocked).not.toHaveBeenCalled();
    expect(f.core.updateOrderStatus).toHaveBeenLastCalledWith(
      'ORD-1',
      'COMPLETED',
      f.manager,
    );
  });
  it('replaying same preparation status does not touch core or award points again', async () => {
    const f = fixture('READY');
    f.order.cancelRequestStatus = null;
    await f.service.advancePreparation('ORD-1', 'READY');
    expect(f.core.updateOrderStatus).not.toHaveBeenCalled();
  });
  it('pending cancellation blocks starting preparation', async () => {
    const f = fixture();
    await expect(
      f.service.advancePreparation('ORD-1', 'PREPARING'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(f.core.updateOrderStatus).not.toHaveBeenCalled();
  });
  it('cannot skip from PAID to READY', async () => {
    const f = fixture();
    f.order.cancelRequestStatus = null;
    await expect(
      f.service.advancePreparation('ORD-1', 'READY'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(f.order.status).toBe('PAID');
  });
  it('missing orders 404; timeout cleanup commits before stale action conflict', async () => {
    const f = fixture('PENDING');
    f.core.lockById.mockResolvedValueOnce(null);
    await expect(
      f.service.advancePreparation('missing', 'PREPARING'),
    ).rejects.toBeInstanceOf(NotFoundException);
    f.core.expireIfNeeded.mockImplementationOnce(async () => {
      f.order.status = 'CANCELLED';
      return true;
    });
    await expect(
      f.service.advancePreparation('ORD-1', 'PREPARING'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(f.committed()).toBe(true);
  });
});
