import { voucherDiscount, voucherUnavailableReason } from './voucher-pricing';
import type { Voucher } from './voucher.entity';

const now = new Date('2026-11-11T10:00:00Z');
const voucher = {
  code: 'BREW10',
  title: 'Giảm 10%',
  discountType: 'PERCENT',
  discountValue: 10,
  minSubtotal: 50000,
  maxDiscount: 10000,
  startsAt: new Date('2026-11-01T00:00:00Z'),
  endsAt: new Date('2026-12-01T00:00:00Z'),
  isActive: true,
  isPublic: true,
  maxUsesPerUser: 3,
} satisfies Voucher;

describe('API-T50 — voucher pricing (FR-13)', () => {
  it('accepts the minimum subtotal and start time inclusively', () => {
    expect(
      voucherUnavailableReason(voucher, 50000, voucher.startsAt),
    ).toBeNull();
  });
  it('rejects expired codes, including the exact expiry instant', () => {
    expect(voucherUnavailableReason(voucher, 50000, voucher.endsAt)).toMatch(
      /hết hạn/,
    );
  });
  it('rejects a future or disabled code', () => {
    expect(
      voucherUnavailableReason(
        { ...voucher, startsAt: new Date(now.getTime() + 1) },
        50000,
        now,
      ),
    ).toMatch(/chưa đến/);
    expect(
      voucherUnavailableReason({ ...voucher, isActive: false }, 50000, now),
    ).toMatch(/không hoạt động/);
  });
  it('explains the minimum purchase requirement', () => {
    expect(voucherUnavailableReason(voucher, 49999, now)).toContain('50.000');
  });
  it('caps a percentage discount', () => {
    expect(voucherDiscount(voucher, 200000)).toBe(10000);
  });
  it('rounds percentage discounts down to whole VND', () => {
    expect(voucherDiscount(voucher, 50009)).toBe(5000);
  });
  it('never discounts more than the subtotal', () => {
    expect(
      voucherDiscount(
        {
          ...voucher,
          discountType: 'FIXED',
          discountValue: 15000,
          maxDiscount: null,
        },
        5000,
      ),
    ).toBe(5000);
  });
});
