import { EntityManager } from 'typeorm';
import { VouchersService } from './vouchers.service';
import { VoucherUsagesService } from './voucher-usages.service';
import type { Voucher } from './voucher.entity';

const now = new Date('2026-11-11T10:00:00Z');
const sample = {
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
function fixture() {
  const usages = new VoucherUsagesService();
  const availability = jest
    .spyOn(usages, 'availability')
    .mockResolvedValue({
      maxUsesPerUser: 3,
      reservedUses: 0,
      usedUses: 0,
      availableUses: 3,
    });
  const builder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => [sample]),
  };
  const repository = {
    findOne: jest.fn(async () => sample as Voucher | null),
    findOneByOrFail: jest.fn(async () => sample),
    createQueryBuilder: () => builder,
  };
  const query = jest.fn(async () => [{ now }]);
  const manager = {
    getRepository: () => repository,
    query,
    queryRunner: { isTransactionActive: true },
  } as unknown as EntityManager;
  return {
    service: new VouchersService(usages),
    manager,
    repository,
    builder,
    availability,
    usages,
    query,
  };
}

describe('API-T53 — voucher quote service', () => {
  it('normalizes manual codes, including a hidden code looked up explicitly', async () => {
    const f = fixture();
    f.repository.findOne.mockResolvedValue({
      ...sample,
      code: 'NHAP7K',
      isPublic: false,
    });
    const result = await f.service.quote(f.manager, 50000, ' nhap7k ', now);
    expect(f.repository.findOne).toHaveBeenCalledWith({
      where: { code: 'NHAP7K' },
    });
    expect(result).toMatchObject({
      subtotal: 50000,
      discount: 5000,
      total: 45000,
      voucherCode: 'NHAP7K',
      voucherUsage: null,
    });
  });
  it('does not consult account usage for guests and does not reserve a use', async () => {
    const f = fixture();
    const reserve = jest.spyOn(f.usages, 'reserve');
    const result = await f.service.quote(f.manager, 50000, undefined, now);
    expect(result).toMatchObject({
      discount: 0,
      total: 50000,
      voucherCode: null,
    });
    expect(f.availability).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });
  it('marks public codes below the minimum as unavailable', async () => {
    const f = fixture();
    const result = await f.service.quote(f.manager, 10000, undefined, now);
    expect(result.vouchers[0]).toMatchObject({
      discount: 0,
      unavailableReason: expect.stringContaining('30.000'),
    });
  });
  it('rejects a selected code with all uses already consumed', async () => {
    const f = fixture();
    f.availability.mockResolvedValue({
      maxUsesPerUser: 3,
      reservedUses: 0,
      usedUses: 3,
      availableUses: 0,
    });
    await expect(
      f.service.quote(f.manager, 50000, 'THU5K', now, 'verified-user'),
    ).rejects.toThrow(/hết lượt/);
  });
  it('hides used-out codes; keeps held-out codes with a clear reason', async () => {
    const f = fixture();
    f.availability.mockResolvedValue({
      maxUsesPerUser: 3,
      reservedUses: 0,
      usedUses: 3,
      availableUses: 0,
    });
    expect(
      (await f.service.quote(f.manager, 50000, undefined, now, 'verified-user'))
        .vouchers,
    ).toEqual([]);
    f.availability.mockResolvedValue({
      maxUsesPerUser: 3,
      reservedUses: 3,
      usedUses: 0,
      availableUses: 0,
    });
    expect(
      (await f.service.quote(f.manager, 50000, undefined, now, 'verified-user'))
        .vouchers[0],
    ).toMatchObject({
      discount: 0,
      unavailableReason: expect.stringContaining('đang giữ'),
    });
  });
  it('rejects missing/expired codes and invalid trusted subtotals', async () => {
    const f = fixture();
    f.repository.findOne.mockResolvedValue(null);
    await expect(f.service.quote(f.manager, 50000, 'BAD', now)).rejects.toThrow(
      /không tồn tại/,
    );
    f.repository.findOne.mockResolvedValue({ ...sample, endsAt: now });
    await expect(
      f.service.quote(f.manager, 50000, 'THU5K', now),
    ).rejects.toThrow(/hết hạn/);
    for (const amount of [-1, 0.5, Number.NaN, 2_147_483_648])
      await expect(
        f.service.apply(f.manager, amount, undefined, now),
      ).rejects.toThrow(/không hợp lệ/);
  });
  it('rechecks expiry using the database clock after a row-lock wait', async () => {
    const f = fixture();
    f.repository.findOne.mockResolvedValue({ ...sample, endsAt: now });
    await expect(
      f.service.apply(f.manager, 50000, 'THU5K', new Date('2026-11-10'), true),
    ).rejects.toThrow(/hết hạn/);
    expect(f.query).toHaveBeenCalledWith('SELECT clock_timestamp() AS now');
  });
});
