import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Issue #31, ported from A1 commit 92a43f4.
 * - Hạn dùng 30 ngày tính từ lúc migration chạy; không tự gia hạn khi restart.
 * - Mã đã có thì giữ nguyên (ON CONFLICT DO NOTHING): không ghi đè dữ liệu cũ
 * - Voucher dùng chung cho mọi tài khoản, mỗi tài khoản tối đa 3 lần/mã
 * Values are copied here on purpose: a migration must not change when the
 * sample JSON is edited later.
 */
const SAMPLE_VOUCHERS = [
  {
    code: 'THU5K',
    title: 'Ưu đãi mẫu: giảm 5.000đ cho đơn từ 30.000đ',
    discountType: 'FIXED',
    discountValue: 5000,
    minSubtotal: 30000,
    maxDiscount: null,
    isPublic: true,
  },
  {
    code: 'BREW10',
    title: 'Ưu đãi mẫu: giảm 10%, tối đa 10.000đ',
    discountType: 'PERCENT',
    discountValue: 10,
    minSubtotal: 50000,
    maxDiscount: 10000,
    isPublic: true,
  },
  {
    code: 'NHOM15K',
    title: 'Ưu đãi mẫu: giảm 15.000đ cho đơn từ 100.000đ',
    discountType: 'FIXED',
    discountValue: 15000,
    minSubtotal: 100000,
    maxDiscount: null,
    isPublic: true,
  },
  {
    // Not listed in the app: customers type the code by hand
    code: 'NHAP7K',
    title: 'Ưu đãi nhập mã mẫu: giảm 7.000đ cho đơn từ 35.000đ',
    discountType: 'FIXED',
    discountValue: 7000,
    minSubtotal: 35000,
    maxDiscount: null,
    isPublic: false,
  },
] as const;

const VALID_DAYS = 30;
const MAX_USES_PER_USER = 3;

export class SeedSampleVouchers1794355200001 implements MigrationInterface {
  name = 'SeedSampleVouchers1794355200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const voucher of SAMPLE_VOUCHERS) {
      await queryRunner.query(
        `INSERT INTO vouchers
           (code, title, "discountType", "discountValue", "minSubtotal", "maxDiscount",
            "startsAt", "endsAt", "isActive", "isPublic", "maxUsesPerUser")
         VALUES ($1, $2, $3, $4, $5, $6, now(), now() + make_interval(days => $7),
                 true, $8, $9)
         ON CONFLICT (code) DO NOTHING`,
        [
          voucher.code,
          voucher.title,
          voucher.discountType,
          voucher.discountValue,
          voucher.minSubtotal,
          voucher.maxDiscount,
          VALID_DAYS,
          voucher.isPublic,
          MAX_USES_PER_USER,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Keep data on rollback: samples can already have been edited or used.
    // Rolling back CreateVouchers removes the table on an empty/foundation DB.
    void queryRunner;
  }
}
