import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Voucher-only foundation: does not create or modify another team's tables. */
export class CreateVouchers1794355200000 implements MigrationInterface {
  name = 'CreateVouchers1794355200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE vouchers (
      code varchar(32) PRIMARY KEY,
      title varchar(160) NOT NULL,
      "discountType" varchar(16) NOT NULL CHECK ("discountType" IN ('FIXED', 'PERCENT')),
      "discountValue" integer NOT NULL CHECK ("discountValue" > 0),
      "minSubtotal" integer NOT NULL DEFAULT 0 CHECK ("minSubtotal" >= 0),
      "maxDiscount" integer CHECK ("maxDiscount" >= 0),
      "startsAt" timestamptz NOT NULL,
      "endsAt" timestamptz NOT NULL,
      "isActive" boolean NOT NULL DEFAULT false,
      "isPublic" boolean NOT NULL DEFAULT true,
      "maxUsesPerUser" integer NOT NULL DEFAULT 3 CHECK ("maxUsesPerUser" BETWEEN 1 AND 3),
      CHECK ("endsAt" > "startsAt"),
      CHECK ("discountType" <> 'PERCENT' OR "discountValue" <= 100),
      CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{0,31}$')
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE vouchers');
  }
}
