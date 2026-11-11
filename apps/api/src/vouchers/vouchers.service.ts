import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Voucher } from './voucher.entity';
import { VoucherUsagesService } from './voucher-usages.service';
import { voucherDiscount, voucherUnavailableReason } from './voucher-pricing';
import type { VoucherUsageAvailability } from './voucher-usage';

export interface VoucherTotals {
  subtotal: number;
  discount: number;
  total: number;
  voucherCode: string | null;
  voucherTitle: string | null;
}

/** Ported from A1. Caller supplies server-priced subtotal, verified identity and DB clock. */
@Injectable()
export class VouchersService {
  constructor(private readonly usages: VoucherUsagesService) {}

  async apply(
    manager: EntityManager,
    subtotal: number,
    code: string | undefined,
    now: Date,
    lock = false,
  ): Promise<VoucherTotals> {
    if (
      !Number.isSafeInteger(subtotal) ||
      subtotal < 0 ||
      subtotal > 2_147_483_647
    )
      throw new BadRequestException('Tổng tiền giỏ hàng không hợp lệ.');
    if (!code)
      return {
        subtotal,
        discount: 0,
        total: subtotal,
        voucherCode: null,
        voucherTitle: null,
      };
    if (lock && !manager.queryRunner?.isTransactionActive)
      throw new Error(
        'Locked voucher pricing requires the caller order transaction.',
      );
    const voucher = await manager.getRepository(Voucher).findOne({
      where: { code: code.trim().toUpperCase() },
      ...(lock ? { lock: { mode: 'pessimistic_read' as const } } : {}),
    });
    if (!voucher) throw new BadRequestException('Mã giảm giá không tồn tại.');
    // A row-lock wait can cross the expiry boundary.
    const checkedAt = lock
      ? new Date(
          (
            await manager.query<Array<{ now: Date }>>(
              'SELECT clock_timestamp() AS now',
            )
          )[0].now,
        )
      : now;
    const reason = voucherUnavailableReason(voucher, subtotal, checkedAt);
    if (reason) throw new BadRequestException(reason);
    const discount = voucherDiscount(voucher, subtotal);
    return {
      subtotal,
      discount,
      total: subtotal - discount,
      voucherCode: voucher.code,
      voucherTitle: voucher.title,
    };
  }

  /** Read-only quote. Does not reserve stock, an order, or a voucher use. */
  async quote(
    manager: EntityManager,
    subtotal: number,
    code: string | undefined,
    now: Date,
    verifiedUserId?: string,
  ) {
    const totals = await this.apply(manager, subtotal, code, now);
    let voucherUsage: VoucherUsageAvailability | null = null;
    if (verifiedUserId && totals.voucherCode) {
      const voucher = await manager
        .getRepository(Voucher)
        .findOneByOrFail({ code: totals.voucherCode });
      const usage = await this.usages.availability(
        manager,
        verifiedUserId,
        voucher.code,
        voucher.maxUsesPerUser,
      );
      const reason = this.usages.unavailableReason(usage);
      if (reason) throw new ConflictException(reason);
      voucherUsage = usage;
    }
    const vouchers = await manager
      .getRepository(Voucher)
      .createQueryBuilder('voucher')
      .where('voucher.isActive = true AND voucher.isPublic = true')
      .andWhere('voucher.endsAt > :now', { now })
      .orderBy('voucher.code', 'ASC')
      .getMany();
    const views = await Promise.all(
      vouchers.map(async (voucher) => {
        const usage = verifiedUserId
          ? await this.usages.availability(
              manager,
              verifiedUserId,
              voucher.code,
              voucher.maxUsesPerUser,
            )
          : null;
        if (usage && usage.usedUses >= usage.maxUsesPerUser) return null;
        const reason =
          voucherUnavailableReason(voucher, subtotal, now) ??
          (usage ? this.usages.unavailableReason(usage) : null);
        return {
          code: voucher.code,
          title: voucher.title,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
          minSubtotal: voucher.minSubtotal,
          maxDiscount: voucher.maxDiscount,
          startsAt: voucher.startsAt,
          endsAt: voucher.endsAt,
          maxUsesPerUser: voucher.maxUsesPerUser,
          usage,
          unavailableReason: reason,
          discount: reason ? 0 : voucherDiscount(voucher, subtotal),
        };
      }),
    );
    return {
      ...totals,
      serverTime: now,
      voucherUsage,
      vouchers: views.filter((view) => view !== null),
    };
  }
}
