import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { VoucherUsagesService } from '../vouchers/voucher-usages.service';
import { BENEFITS_POLICY_VERSIONS } from './benefits-policy';
import { OrderBenefitsService } from './order-benefits.service';
import { Order } from './order.entity';

const NOW = new Date('2026-11-13T10:00:00Z');
const USER = '0f8fad5b-d9cb-469f-a165-70867728950e';

function fixture() {
  const usages = {
    reserve: jest.fn(async () => undefined),
    markUsed: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
  };
  const users = {
    existsBy: jest.fn(async () => true),
    increment: jest.fn(async () => ({ affected: 1 })),
    decrement: jest.fn(async () => ({ affected: 1 })),
  };
  const manager = {
    getRepository: () => users,
    save: jest.fn(async (_e: unknown, order: Order) => order),
  } as unknown as EntityManager;
  const service = new OrderBenefitsService(
    usages as unknown as VoucherUsagesService,
  );
  return { service, usages, users, manager };
}

const order = (overrides: Partial<Order> = {}) =>
  Object.assign(new Order(), {
    id: 'ORD-1',
    userId: USER,
    status: 'PAID',
    total: 59000,
    benefitsPolicyVersion: BENEFITS_POLICY_VERSIONS.VOUCHER_QUOTAS_AND_POINTS,
    pointsEarned: 0,
    pointsReversed: 0,
    pointsAwardedAt: null,
    pointsReversedAt: null,
    ...overrides,
  });

describe('API-T18 OrderBenefitsService (điểm thưởng 10.000đ = 1 điểm)', () => {
  it('cộng điểm khi PAID, làm tròn xuống và đánh dấu voucher đã dùng', async () => {
    const { service, usages, users, manager } = fixture();
    const paid = order();
    await service.award(paid, manager, NOW);
    expect(users.increment).toHaveBeenCalledWith(
      { id: USER },
      'loyaltyPoints',
      5,
    );
    expect(paid.pointsEarned).toBe(5);
    expect(paid.pointsAwardedAt).toEqual(NOW);
    expect(usages.markUsed).toHaveBeenCalledWith(paid, manager, NOW);
  });

  it('không cộng lần hai', async () => {
    const { service, users, manager } = fixture();
    await service.award(order({ pointsAwardedAt: NOW }), manager, NOW);
    expect(users.increment).not.toHaveBeenCalled();
  });

  it('chỉ cộng điểm khi đơn đã thanh toán', async () => {
    const { service, manager } = fixture();
    await expect(
      service.award(order({ status: 'PENDING' }), manager, NOW),
    ).rejects.toThrow(ConflictException);
  });

  it('hủy đơn thu hồi điểm đã cộng và trả lượt voucher', async () => {
    const { service, usages, users, manager } = fixture();
    const cancelled = order({ pointsEarned: 5, pointsAwardedAt: NOW });
    await service.reverse(cancelled, manager, NOW);
    expect(usages.release).toHaveBeenCalledWith(cancelled, manager, NOW);
    expect(users.decrement).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER }),
      'loyaltyPoints',
      5,
    );
    expect(cancelled).toMatchObject({
      pointsEarned: 0,
      pointsReversed: 5,
      pointsReversedAt: NOW,
    });
  });

  it('hủy đơn chưa thanh toán chỉ trả lượt voucher, không trừ điểm', async () => {
    const { service, usages, users, manager } = fixture();
    await service.reverse(order({ status: 'PENDING' }), manager, NOW);
    expect(usages.release).toHaveBeenCalledTimes(1);
    expect(users.decrement).not.toHaveBeenCalled();
  });

  it('tài khoản không còn tồn tại thì 401', async () => {
    const { service, users, manager } = fixture();
    users.existsBy.mockResolvedValueOnce(false);
    await expect(service.requireUser(manager, USER)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.requireUser(manager, 'not-a-uuid')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
