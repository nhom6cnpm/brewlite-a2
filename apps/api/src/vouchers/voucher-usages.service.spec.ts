import { EntityManager } from 'typeorm';
import { VoucherUsagesService } from './voucher-usages.service';
import { Voucher } from './voucher.entity';
import { VoucherUsage } from './voucher-usage.entity';
import type { VoucherOrder } from './voucher-order';

const now = new Date('2026-11-11T10:00:00Z');
const voucher = {
  code: 'THU5K',
  title: 'Giảm 5.000đ',
  discountType: 'FIXED',
  discountValue: 5000,
  minSubtotal: 30000,
  maxDiscount: null,
  startsAt: new Date('2026-11-01'),
  endsAt: new Date('2026-12-01'),
  isActive: true,
  isPublic: true,
  maxUsesPerUser: 3,
} satisfies Voucher;
const order: VoucherOrder = {
  id: 'BL1',
  userId: '12345678-1234-4234-9234-123456789012',
  voucherCode: voucher.code,
  subtotal: 30000,
  expiresAt: new Date(now.getTime() + 900000),
};

function fixture() {
  let stored: VoucherUsage | null = null;
  let counts = { reserved: 0, used: 0 };
  const usageRepository = {
    findOneBy: jest.fn(async () => stored),
    findOne: jest.fn(async () => stored),
    insert: jest.fn(async (value: Partial<VoucherUsage>) => {
      stored = { ...value, usedAt: null, releasedAt: null } as VoucherUsage;
    }),
  };
  const voucherRepository = { findOneOrFail: jest.fn(async () => voucher) };
  const quotaRepository = { findOneOrFail: jest.fn(async () => ({})) };
  const query = jest.fn(async (sql: string) =>
    sql.includes('clock_timestamp')
      ? [{ now }]
      : sql.includes('count(*)')
        ? [counts]
        : [],
  );
  const save = jest.fn(async (_entity: unknown, value: VoucherUsage) => {
    stored = value;
  });
  const manager = {
    queryRunner: { isTransactionActive: true },
    query,
    save,
    getRepository: (entity: unknown) =>
      entity === Voucher
        ? voucherRepository
        : entity === VoucherUsage
          ? usageRepository
          : quotaRepository,
  } as unknown as EntityManager;
  return {
    manager,
    query,
    save,
    usageRepository,
    voucherRepository,
    quotaRepository,
    setCounts: (value: typeof counts) => {
      counts = value;
    },
    setStored: (value: VoucherUsage) => {
      stored = value;
    },
    getStored: () => stored,
    service: new VoucherUsagesService(),
  };
}

describe('API-T52 — voucher lifecycle/quota with the caller transaction', () => {
  it('quote availability counts both held and used slots without creating a quota', async () => {
    const f = fixture();
    f.setCounts({ reserved: 1, used: 1 });
    expect(
      await f.service.availability(f.manager, order.userId, voucher.code, 3),
    ).toEqual({
      maxUsesPerUser: 3,
      reservedUses: 1,
      usedUses: 1,
      availableUses: 1,
    });
    expect(f.query).toHaveBeenCalledTimes(1);
    expect(f.save).not.toHaveBeenCalled();
  });
  it.each([
    { reserved: 0, used: 3 },
    { reserved: 2, used: 1 },
    { reserved: 0, used: 4 },
  ])('rejects exhausted or fully held quota %p', async (counts) => {
    const f = fixture();
    f.setCounts(counts);
    await expect(f.service.reserve(order, f.manager)).rejects.toThrow(
      /hết lượt|đang giữ/,
    );
    expect(f.usageRepository.insert).not.toHaveBeenCalled();
  });
  it('locks the account quota before reserving, and replay reserves only once', async () => {
    const f = fixture();
    await f.service.reserve(order, f.manager);
    await f.service.reserve(order, f.manager);
    expect(f.quotaRepository.findOneOrFail).toHaveBeenCalledWith({
      where: { userId: order.userId, voucherCode: voucher.code },
      lock: { mode: 'pessimistic_write' },
    });
    expect(f.usageRepository.insert).toHaveBeenCalledTimes(1);
  });
  it('marks PAID as USED once; cancellation releases it once', async () => {
    const f = fixture();
    await f.service.reserve(order, f.manager);
    await f.service.markUsed(order, f.manager, now);
    await f.service.markUsed(order, f.manager, now);
    expect(f.save).toHaveBeenCalledTimes(1);
    expect(f.getStored()?.status).toBe('USED');
    await f.service.release(order, f.manager, now);
    await f.service.release(order, f.manager, now);
    expect(f.save).toHaveBeenCalledTimes(2);
    expect(f.getStored()?.status).toBe('RELEASED');
    await expect(f.service.markUsed(order, f.manager, now)).rejects.toThrow(
      /đã được trả/,
    );
    await expect(f.service.reserve(order, f.manager)).rejects.toThrow(
      /không còn/,
    );
  });
  it('releases an unpaid reservation without setting usedAt', async () => {
    const f = fixture();
    await f.service.reserve(order, f.manager);
    await f.service.release(order, f.manager, now);
    expect(f.getStored()).toMatchObject({
      status: 'RELEASED',
      usedAt: null,
      releasedAt: now,
    });
  });
  it('rejects mismatched order ownership', async () => {
    const f = fixture();
    await f.service.reserve(order, f.manager);
    await expect(
      f.service.markUsed(
        { ...order, userId: 'different-user' },
        f.manager,
        now,
      ),
    ).rejects.toThrow(/không khớp/);
  });
  it('does not silently create a missing reservation at payment/cancellation', async () => {
    const f = fixture();
    await expect(f.service.markUsed(order, f.manager, now)).rejects.toThrow(
      /Thiếu dữ liệu/,
    );
    await expect(f.service.release(order, f.manager, now)).rejects.toThrow(
      /Thiếu dữ liệu/,
    );
  });
  it('rechecks voucher and order expiry after the quota lock', async () => {
    const f = fixture();
    f.voucherRepository.findOneOrFail.mockResolvedValue({
      ...voucher,
      endsAt: now,
    });
    await expect(f.service.reserve(order, f.manager)).rejects.toThrow(
      /hết hạn/,
    );
    f.voucherRepository.findOneOrFail.mockResolvedValue(voucher);
    await expect(
      f.service.reserve({ ...order, expiresAt: now }, f.manager),
    ).rejects.toThrow(/hết thời gian/);
  });
  it('rejects mutations outside an active transaction', async () => {
    const f = fixture();
    f.manager.queryRunner!.isTransactionActive = false;
    await expect(f.service.reserve(order, f.manager)).rejects.toThrow(
      /caller order transaction/,
    );
    await expect(f.service.markUsed(order, f.manager, now)).rejects.toThrow(
      /caller order transaction/,
    );
    await expect(f.service.release(order, f.manager, now)).rejects.toThrow(
      /caller order transaction/,
    );
  });
  it('has no side effects when the order has no voucher', async () => {
    const f = fixture();
    const plain = { ...order, voucherCode: null };
    await f.service.reserve(plain, f.manager);
    await f.service.markUsed(plain, f.manager, now);
    await f.service.release(plain, f.manager, now);
    expect(f.query).not.toHaveBeenCalled();
    expect(f.save).not.toHaveBeenCalled();
  });
});
