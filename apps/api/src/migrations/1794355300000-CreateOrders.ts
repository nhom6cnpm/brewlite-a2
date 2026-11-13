import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Issue #33: orders, order_items, ingredient reservations and Idempotency-Key.
 * Gộp các migration A1 (InitialSchema, OrderInventoryReservations,
 * OrderItemDisplaySnapshot, AddVouchers, BenefitsFoundation, OrderRequestKeys)
 * thành một bảng orders đầy đủ, và thêm FK voucher_usages.orderId mà #31 hoãn lại.
 */
export class CreateOrders1794355300000 implements MigrationInterface {
  name = 'CreateOrders1794355300000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "orders" (
      "id" varchar(64) NOT NULL,
      "userId" varchar(64) NOT NULL,
      "status" varchar(32) NOT NULL DEFAULT 'PENDING',
      "total" integer NOT NULL,
      "subtotal" integer NOT NULL,
      "discount" integer NOT NULL DEFAULT 0,
      "voucherCode" varchar(32),
      "voucherTitle" varchar(160),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "expiresAt" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes'),
      "inventoryReservedAt" timestamptz,
      "inventoryReleasedAt" timestamptz,
      "cancelledAt" timestamptz,
      "cancelReason" varchar(32),
      "benefitsPolicyVersion" integer NOT NULL DEFAULT 0,
      "pointsEarned" integer NOT NULL DEFAULT 0,
      "pointsReversed" integer NOT NULL DEFAULT 0,
      "pointsAwardedAt" timestamptz,
      "pointsReversedAt" timestamptz,
      "cancelRequestId" uuid,
      "cancelRequestedAt" timestamptz,
      "cancelRequestReason" varchar(500),
      "cancelRequestStatus" varchar(16),
      "cancelReviewedAt" timestamptz,
      "cancelReviewedBy" uuid REFERENCES users(id),
      "cancelReviewNote" varchar(500),
      CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
      CONSTRAINT orders_status CHECK ("status" IN
        ('PENDING','PAID','PAYMENT_FAILED','PREPARING','READY','COMPLETED','CANCELLED')),
      CONSTRAINT orders_discount_totals CHECK (
        "subtotal" >= 0 AND "discount" >= 0 AND "discount" <= "subtotal"
        AND "total" = "subtotal" - "discount"),
      CONSTRAINT orders_benefits_policy CHECK ("benefitsPolicyVersion" IN (0, 1)),
      CONSTRAINT orders_points_nonnegative CHECK ("pointsEarned" >= 0 AND "pointsReversed" >= 0),
      CONSTRAINT orders_points_audit CHECK (
        ("pointsEarned" = 0 OR "pointsAwardedAt" IS NOT NULL) AND
        ("pointsReversed" = 0 OR ("pointsAwardedAt" IS NOT NULL AND "pointsReversedAt" IS NOT NULL))
      ),
      CONSTRAINT orders_cancel_request_fields CHECK (
        ("cancelRequestId" IS NULL AND "cancelRequestedAt" IS NULL AND
         "cancelRequestReason" IS NULL AND "cancelRequestStatus" IS NULL AND
         "cancelReviewedAt" IS NULL AND "cancelReviewedBy" IS NULL AND "cancelReviewNote" IS NULL)
        OR
        ("cancelRequestId" IS NOT NULL AND "cancelRequestedAt" IS NOT NULL AND
         "cancelRequestReason" IS NOT NULL AND length(btrim("cancelRequestReason")) > 0 AND
         "cancelRequestStatus" IN ('PENDING','APPROVED','REJECTED','EXPIRED') AND
         (("cancelRequestStatus" = 'PENDING' AND "cancelReviewedAt" IS NULL AND "cancelReviewedBy" IS NULL AND "cancelReviewNote" IS NULL) OR
          ("cancelRequestStatus" IN ('APPROVED','REJECTED') AND "cancelReviewedAt" IS NOT NULL AND "cancelReviewedBy" IS NOT NULL AND
           ("cancelRequestStatus" <> 'REJECTED' OR ("cancelReviewNote" IS NOT NULL AND length(btrim("cancelReviewNote")) > 0))) OR
          ("cancelRequestStatus" = 'EXPIRED' AND "cancelReviewedAt" IS NOT NULL AND "cancelReviewedBy" IS NULL)))
      )
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_user_created" ON "orders" ("userId", "createdAt")`,
    );
    // Expiry job scans only unpaid orders
    await queryRunner.query(`CREATE INDEX "IDX_orders_unpaid_expiry" ON "orders" ("expiresAt", "id")
      WHERE "status" IN ('PENDING', 'PAYMENT_FAILED')`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_orders_cancel_request_id" ON "orders" ("cancelRequestId")
      WHERE "cancelRequestId" IS NOT NULL`);

    await queryRunner.query(`CREATE TABLE "order_items" (
      "id" varchar(64) NOT NULL,
      "orderId" varchar(64) NOT NULL,
      "productId" varchar(64) NOT NULL,
      "productName" varchar(255),
      "productImageUrl" varchar(500),
      "size" varchar(10) NOT NULL,
      "toppingIds" json NOT NULL,
      "qty" integer NOT NULL,
      "unitPrice" integer NOT NULL,
      "lineTotal" integer NOT NULL,
      CONSTRAINT "PK_order_items" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_order_items_qty" CHECK ("qty" BETWEEN 1 AND 99),
      CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId")
        REFERENCES "orders"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_orderId" ON "order_items" ("orderId")`,
    );

    await queryRunner.query(`CREATE TABLE "order_ingredient_reservations" (
      "orderId" varchar(64) NOT NULL,
      "ingredientId" varchar(64) NOT NULL,
      "amount" integer NOT NULL,
      CONSTRAINT "PK_order_ingredient_reservations" PRIMARY KEY ("orderId", "ingredientId"),
      CONSTRAINT "CHK_order_reservation_amount" CHECK ("amount" > 0),
      CONSTRAINT "FK_order_reservation_order" FOREIGN KEY ("orderId")
        REFERENCES "orders"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_order_reservation_ingredient" FOREIGN KEY ("ingredientId")
        REFERENCES "ingredients"("id") ON DELETE RESTRICT
    )`);

    await queryRunner.query(`CREATE TABLE "order_request_keys" (
      "userId" varchar(64) NOT NULL,
      "idempotencyKey" varchar(128) NOT NULL,
      "orderId" varchar(64) NOT NULL,
      "requestHash" varchar(64) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_order_request_keys" PRIMARY KEY ("userId", "idempotencyKey"),
      -- Checked at COMMIT: the key is claimed before the order row exists
      CONSTRAINT "FK_order_request_keys_order" FOREIGN KEY ("orderId")
        REFERENCES "orders"("id") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_order_request_keys_orderId" ON "order_request_keys" ("orderId")`,
    );

    // Deferred by #31 (see AddVoucherUsages1794355200002); usages are reserved
    // after the order row is saved, in the same transaction.
    await queryRunner.query(`ALTER TABLE voucher_usages
      ADD CONSTRAINT "FK_voucher_usages_order" FOREIGN KEY ("orderId") REFERENCES orders(id)`);
    await queryRunner.query(
      `COMMENT ON COLUMN voucher_usages."orderId" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [state] = await queryRunner.manager.query<Array<{ active: boolean }>>(
      'SELECT EXISTS(SELECT 1 FROM orders) AS active',
    );
    if (state.active)
      throw new Error('Cannot revert orders after orders have been recorded.');
    await queryRunner.query(
      'ALTER TABLE voucher_usages DROP CONSTRAINT "FK_voucher_usages_order"',
    );
    await queryRunner.query('DROP TABLE "order_request_keys"');
    await queryRunner.query('DROP TABLE "order_ingredient_reservations"');
    await queryRunner.query('DROP TABLE "order_items"');
    await queryRunner.query('DROP TABLE "orders"');
  }
}
