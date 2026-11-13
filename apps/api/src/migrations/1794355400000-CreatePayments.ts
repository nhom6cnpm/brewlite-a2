import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Issue #34: payments (Ví/Thẻ), payment_request_keys (Idempotency-Key) and the
 * mock bank statement. Gộp các migration A1 AddPayments, AdminPaymentConfirmation,
 * PaymentRequestKeys và MockBankLedger thành dạng cuối cùng.
 */
export class CreatePayments1794355400000 implements MigrationInterface {
  name = 'CreatePayments1794355400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "payments" (
      "id" varchar(64) NOT NULL,
      "orderId" varchar(64) NOT NULL,
      "userId" varchar(64) NOT NULL,
      "idempotencyKey" varchar(128) NOT NULL,
      "amount" integer NOT NULL,
      "method" varchar(16) NOT NULL,
      "status" varchar(32) NOT NULL DEFAULT 'PENDING',
      "receivedAt" timestamptz,
      "reviewedAt" timestamptz,
      "reviewedBy" varchar(64),
      "reviewNote" varchar(255),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_payments_idempotencyKey" UNIQUE ("idempotencyKey"),
      CONSTRAINT "CHK_payments_method" CHECK ("method" IN ('WALLET', 'CARD')),
      CONSTRAINT "CHK_payments_status" CHECK
        ("status" IN ('PENDING', 'TRANSFER_RECEIVED', 'SUCCESS', 'FAILED')),
      CONSTRAINT "CHK_payments_amount" CHECK ("amount" >= 0),
      CONSTRAINT "FK_payments_order" FOREIGN KEY ("orderId")
        REFERENCES "orders"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_orderId" ON "payments" ("orderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_status" ON "payments" ("status")`,
    );
    // At most one waiting payment per order (a second key reuses it)
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payments_active_order" ON "payments" ("orderId")
      WHERE "status" IN ('PENDING', 'TRANSFER_RECEIVED')`);

    await queryRunner.query(`CREATE TABLE "payment_request_keys" (
      "id" varchar(128) PRIMARY KEY,
      "paymentId" varchar(64) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      "orderId" varchar(64) NOT NULL,
      "userId" varchar(64) NOT NULL,
      "method" varchar(16) NOT NULL CHECK ("method" IN ('WALLET', 'CARD'))
    )`);

    await queryRunner.query(`CREATE TABLE "bank_transactions" (
      "id" varchar(64) NOT NULL,
      "type" varchar(16) NOT NULL,
      "amount" integer NOT NULL,
      "orderId" varchar(64) NOT NULL,
      "paymentId" varchar(64),
      "content" varchar(255) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_bank_transactions" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_bank_transactions_type" CHECK ("type" IN ('IN', 'REFUND')),
      CONSTRAINT "CHK_bank_transactions_amount" CHECK ("amount" > 0),
      CONSTRAINT "FK_bank_transactions_order" FOREIGN KEY ("orderId")
        REFERENCES "orders"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_bank_transactions_orderId" ON "bank_transactions" ("orderId")`,
    );
    // A payment is credited at most once
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_bank_transactions_payment_in" ON "bank_transactions" ("paymentId") WHERE "type" = 'IN'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [state] = await queryRunner.manager.query<Array<{ active: boolean }>>(
      'SELECT EXISTS(SELECT 1 FROM bank_transactions) AS active',
    );
    if (state.active)
      throw new Error(
        'Cannot revert payments after money has been recorded on the mock bank.',
      );
    await queryRunner.query('DROP TABLE "bank_transactions"');
    await queryRunner.query('DROP TABLE "payment_request_keys"');
    await queryRunner.query('DROP TABLE "payments"');
  }
}
