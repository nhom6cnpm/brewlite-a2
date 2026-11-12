import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Issue #31: users is on main. Order FK is deferred to #33 (orders does not exist yet). */
export class AddVoucherUsages1794355200002 implements MigrationInterface {
  name = 'AddVoucherUsages1794355200002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE voucher_user_quotas (
      "userId" uuid NOT NULL REFERENCES users(id),
      "voucherCode" varchar(32) NOT NULL REFERENCES vouchers(code),
      "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("userId", "voucherCode")
    )`);
    await queryRunner.query(`CREATE TABLE voucher_usages (
      "orderId" varchar(64) PRIMARY KEY,
      "userId" uuid NOT NULL REFERENCES users(id),
      "voucherCode" varchar(32) NOT NULL,
      status varchar(16) NOT NULL DEFAULT 'RESERVED',
      "reservedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "usedAt" timestamptz,
      "releasedAt" timestamptz,
      FOREIGN KEY ("userId", "voucherCode") REFERENCES voucher_user_quotas("userId", "voucherCode"),
      CONSTRAINT voucher_usages_state CHECK (
        (status = 'RESERVED' AND "usedAt" IS NULL AND "releasedAt" IS NULL) OR
        (status = 'USED' AND "usedAt" IS NOT NULL AND "releasedAt" IS NULL) OR
        (status = 'RELEASED' AND "releasedAt" IS NOT NULL)
      )
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_voucher_usages_active_account"
      ON voucher_usages ("userId", "voucherCode", status) WHERE status IN ('RESERVED', 'USED')`);
    await queryRunner.query(`COMMENT ON COLUMN voucher_usages."orderId" IS
      'Issue #33 must add FK to orders(id) after the orders table exists; #31 temporarily stores the order snapshot ID.'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [state] = await queryRunner.manager.query<Array<{ active: boolean }>>(`SELECT
      EXISTS(SELECT 1 FROM voucher_usages) OR EXISTS(SELECT 1 FROM voucher_user_quotas) AS active`);
    if (state.active)
      throw new Error(
        'Cannot revert voucher usages after workflow data has been recorded.',
      );
    await queryRunner.query('DROP TABLE voucher_usages');
    await queryRunner.query('DROP TABLE voucher_user_quotas');
  }
}
