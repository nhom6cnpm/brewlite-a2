import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/auth/user.entity';
import { Ingredient } from '../src/inventory/ingredient.entity';
import { RecipeItem } from '../src/inventory/recipe-item.entity';
import { ToppingRecipe } from '../src/inventory/topping-recipe.entity';
import { InitialProducts1710000000000 } from '../src/migrations/InitialProducts';
import { CreateUsersTable1710000001000 } from '../src/migrations/1710000001000-CreateUsersTable';
import { AddInventory1761650000000 } from '../src/migrations/1761650000000-AddInventory';
import { CreateVouchers1794355200000 } from '../src/migrations/1794355200000-CreateVouchers';
import { SeedSampleVouchers1794355200001 } from '../src/migrations/1794355200001-SeedSampleVouchers';
import { AddVoucherUsages1794355200002 } from '../src/migrations/1794355200002-AddVoucherUsages';
import { CreateOrders1794355300000 } from '../src/migrations/1794355300000-CreateOrders';
import { CreatePayments1794355400000 } from '../src/migrations/1794355400000-CreatePayments';
import { OrderExpiryService } from '../src/orders/order-expiry.service';
import { OrderInventoryReservation } from '../src/orders/order-inventory-reservation.entity';
import { OrderItem } from '../src/orders/order-item.entity';
import { Order } from '../src/orders/order.entity';
import { OrdersService } from '../src/orders/orders.service';
import { PaymentRequestKey } from '../src/payments/entities/payment-request-key.entity';
import { Payment } from '../src/payments/entities/payment.entity';
import { PaymentsService } from '../src/payments/payments.service';
import { Product } from '../src/products/product.entity';
import { Voucher } from '../src/vouchers/voucher.entity';
import { VoucherUsage } from '../src/vouchers/voucher-usage.entity';
import { VoucherUserQuota } from '../src/vouchers/voucher-user-quota.entity';
import { BankTransaction } from '../src/mock-bank/bank-transaction.entity';
import { OrderRequestKey } from '../src/orders/order-request-key.entity';
import {
  assertTransition,
  InvalidOrderTransitionException,
} from '../src/orders/order-status';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

/**
 * TASK 5.2 (Đợt 2) — Integration test API tạo đơn và thanh toán với PostgreSQL thật.
 *
 * Kiểm thử toàn diện các yêu cầu:
 * - FR-05 (INT-T01): Tạo đơn thành công; Idempotency-Key 10 lần đồng thời -> 1 đơn; đổi giỏ trả 409.
 * - FR-07 (INT-T02): Thanh toán Ví -> chuyển tiền mock bank -> sao kê IN; từ chối -> hoàn tiền REFUND 1 lần.
 * - FR-08 (INT-T03): Đối chiếu & nhân viên xác nhận -> PAID; thanh toán Thẻ tại quầy; chặn quyền 403; đơn hết hạn.
 * - NFR-01 (INT-T04): Concurrency & Optimistic locking: 20 khách đặt ly cuối -> 1 đơn, không bán vượt;
 *                     máy trạng thái chặn chuyển sai; tự hủy và hoàn nguyên liệu khi quá hạn.
 */
describeDatabase(
  'TASK 5.2 — Integration tests: Order & Payment with real PostgreSQL',
  () => {
    let database: DataSource;
    let app: INestApplication;
    let ordersService: OrdersService;
    let paymentsService: PaymentsService;
    let userId: string;
    let token: string;
    let adminId: string;
    let adminToken: string;

    const item = (
      overrides: Partial<{
        productId: string;
        size: 'S' | 'M' | 'L';
        toppingIds: ('cream' | 'pearls')[];
        qty: number;
      }> = {},
    ) => ({
      productId: 'p1',
      size: 'S' as const,
      toppingIds: [] as ('cream' | 'pearls')[],
      qty: 1,
      ...overrides,
    });

    const placeOrder = (
      key: string | null = randomUUID(),
      items = [item()],
      jwt = token,
    ) => {
      const call = request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${jwt}`);
      if (key !== null) call.set('Idempotency-Key', key);
      return call.send({ items });
    };

    const createPayment = (
      orderId: string,
      method: 'WALLET' | 'CARD' = 'WALLET',
      key: string = randomUUID(),
      jwt = token,
    ) =>
      request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${jwt}`)
        .set('Idempotency-Key', key)
        .send({ orderId, method });

    const transferMockBank = (paymentId: string) =>
      request(app.getHttpServer()).post(
        `/mock-bank/payments/${paymentId}/transfer`,
      );

    const reviewPayment = (
      paymentId: string,
      decision: 'confirm' | 'reject' = 'confirm',
      note = 'Đã đối chiếu tại quầy',
      jwt = adminToken,
    ) =>
      request(app.getHttpServer())
        .post(`/admin/payments/${paymentId}/${decision}`)
        .set('Authorization', `Bearer ${jwt}`)
        .send({ note });

    beforeAll(async () => {
      const url = new URL(databaseUrl!);
      if (!url.pathname.endsWith('_test')) {
        throw new Error(
          'TEST_DATABASE_URL must point to a dedicated database ending in _test',
        );
      }

      database = new DataSource({
        type: 'postgres',
        url: databaseUrl,
        entities: [
          Product,
          User,
          Order,
          OrderItem,
          Ingredient,
          RecipeItem,
          ToppingRecipe,
          Payment,
          PaymentRequestKey,
          OrderInventoryReservation,
          Voucher,
          VoucherUsage,
          VoucherUserQuota,
          BankTransaction,
          OrderRequestKey,
        ],
        migrations: [
          InitialProducts1710000000000,
          CreateUsersTable1710000001000,
          AddInventory1761650000000,
          CreateVouchers1794355200000,
          SeedSampleVouchers1794355200001,
          AddVoucherUsages1794355200002,
          CreateOrders1794355300000,
          CreatePayments1794355400000,
        ],
        synchronize: false,
        logging: false,
      });

      await database.initialize();
      await database.runMigrations();

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(DataSource)
        .useValue(database)
        .overrideProvider(OrderExpiryService)
        .useValue({
          scan: jest.fn().mockResolvedValue(undefined),
          onApplicationBootstrap: jest.fn(),
          onModuleDestroy: jest.fn(),
        })
        .overrideProvider(ConfigService)
        .useValue(
          new ConfigService({
            JWT_SECRET: 'test-jwt-secret-task-5-2-integration',
            ORDER_PAYMENT_TIMEOUT_MINUTES: '15',
            ADMIN_EMAIL: 'admin@brewlite.test',
            ADMIN_PASSWORD: 'AdminPassword123!',
          }),
        )
        .compile();

      app = moduleRef.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
      app.useLogger(false);
      await app.listen(0, '127.0.0.1');

      ordersService = app.get(OrdersService);
      paymentsService = app.get(PaymentsService);
    }, 45000);

    beforeEach(async () => {
      // Dọn dẹp dữ liệu các bảng trước mỗi ca kiểm thử
      await database.query(`
        TRUNCATE TABLE
          bank_transactions,
          payment_request_keys,
          payments,
          order_request_keys,
          order_ingredient_reservations,
          order_items,
          orders,
          voucher_usages,
          voucher_user_quotas,
          users
        CASCADE
      `);

      // Reset số lượng tồn kho nguyên liệu mẫu
      await database.query(`
        UPDATE ingredients SET quantity = 2000, version = 1 WHERE id = 'coffee';
        UPDATE ingredients SET quantity = 3000, version = 1 WHERE id = 'condensed-milk';
        UPDATE ingredients SET quantity = 5000, version = 1 WHERE id = 'fresh-milk';
        UPDATE ingredients SET quantity = 1000, version = 1 WHERE id = 'tea';
        UPDATE ingredients SET quantity = 2000, version = 1 WHERE id = 'peach';
        UPDATE ingredients SET quantity = 2000, version = 1 WHERE id = 'lychee';
        UPDATE ingredients SET quantity = 3000, version = 1 WHERE id = 'sugar-syrup';
        UPDATE ingredients SET quantity = 1000, version = 1 WHERE id = 'cream';
        UPDATE ingredients SET quantity = 2000, version = 1 WHERE id = 'pearls';
      `);

      // Tạo tài khoản khách hàng mẫu
      const user = await database.getRepository(User).save({
        email: `customer-${randomUUID()}@task52.test`,
        passwordHash: 'not-used-for-token',
        loyaltyPoints: 0,
        role: 'CUSTOMER',
      });
      userId = user.id;
      token = app
        .get(JwtService)
        .sign({ sub: user.id, email: user.email, role: 'CUSTOMER' });

      // Tạo tài khoản nhân viên (ADMIN) mẫu
      const admin = await database.getRepository(User).save({
        email: `admin-${randomUUID()}@staff.test`,
        passwordHash: 'not-used-for-token',
        loyaltyPoints: 0,
        role: 'ADMIN',
      });
      adminId = admin.id;
      adminToken = app
        .get(JwtService)
        .sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });
    });

    afterAll(async () => {
      if (app) await app.close();
      if (database?.isInitialized) await database.destroy();
    });

    // =========================================================================
    // KỊCH BẢN 1 & 2: TẠO ĐƠN THÀNH CÔNG & IDEMPOTENCY-KEY ĐỒNG THỜI (FR-05, INT-T01)
    // =========================================================================
    describe('1. Order Creation & Idempotency-Key (FR-05, INT-T01)', () => {
      it('creates order successfully: saves PENDING order, deducts stock, sets 15min deadline', async () => {
        const key = randomUUID();
        const response = await placeOrder(
          key,
          [item({ productId: 'p1', size: 'S', qty: 1 })],
          token,
        ).expect(201);

        expect(response.body).toMatchObject({
          message: 'Tạo đơn hàng thành công',
          status: 'PENDING',
          total: 30000,
          subtotal: 30000,
          discount: 0,
        });
        expect(response.body.orderId).toMatch(/^ORD-/);
        expect(response.body.expiresAt).toBeDefined();

        // Kiểm tra database: bảng orders, order_items, order_ingredient_reservations
        const order = await database
          .getRepository(Order)
          .findOneByOrFail({ id: response.body.orderId });
        expect(order.status).toBe('PENDING');
        expect(order.userId).toBe(userId);
        expect(order.total).toBe(30000);

        const items = await database
          .getRepository(OrderItem)
          .findBy({ orderId: order.id });
        expect(items).toHaveLength(1);
        expect(items[0].productId).toBe('p1');
        expect(items[0].size).toBe('S');
        expect(items[0].qty).toBe(1);

        // 1 ly Americano size S (p1) tiêu tốn 18g coffee
        const reservations = await database
          .getRepository(OrderInventoryReservation)
          .findBy({ orderId: order.id });
        expect(reservations).toHaveLength(1);
        expect(reservations[0].ingredientId).toBe('coffee');
        expect(reservations[0].amount).toBe(18);

        // Tồn kho coffee giảm từ 2000g xuống 1982g, version tăng lên 2
        const coffee = await database
          .getRepository(Ingredient)
          .findOneByOrFail({ id: 'coffee' });
        expect(coffee.quantity).toBe(1982);
        expect(coffee.version).toBe(2);

        // Idempotency key đã được ghi nhận trong bảng order_request_keys
        const keyRow = await database
          .getRepository(OrderRequestKey)
          .findOneByOrFail({ userId, idempotencyKey: key });
        expect(keyRow.orderId).toBe(order.id);
      });

      it('same Idempotency-Key sent 10 times concurrently returns the same order and deducts stock once', async () => {
        const key = randomUUID();
        const cart = [item({ productId: 'p1', size: 'S', qty: 1 })];

        // Gửi đồng thời 10 request cùng key
        const responses = await Promise.all(
          Array.from({ length: 10 }, () => placeOrder(key, cart, token)),
        );

        responses.forEach((res) => {
          expect(res.status).toBe(201);
        });

        // Tất cả 10 response đều trả về cùng một mã đơn hàng
        const orderIds = new Set(responses.map((r) => r.body.orderId));
        expect(orderIds.size).toBe(1);

        // Database chỉ có đúng 1 đơn hàng và 1 dòng khóa yêu cầu
        expect(await database.getRepository(Order).count()).toBe(1);
        expect(await database.getRepository(OrderRequestKey).count()).toBe(1);

        // Tồn kho chỉ trừ đúng 1 lần (18g, còn 1982g), không bị trừ 10 lần
        const coffee = await database
          .getRepository(Ingredient)
          .findOneByOrFail({ id: 'coffee' });
        expect(coffee.quantity).toBe(1982);
        expect(coffee.version).toBe(2);
      });

      it('rejects the same Idempotency-Key with a modified cart with 409 Conflict', async () => {
        const key = randomUUID();
        await placeOrder(
          key,
          [item({ productId: 'p1', size: 'S', qty: 1 })],
          token,
        ).expect(201);

        // Gửi lại cùng key nhưng đổi số lượng qty = 2
        await placeOrder(
          key,
          [item({ productId: 'p1', size: 'S', qty: 2 })],
          token,
        ).expect(409);

        // Đơn hàng trong DB vẫn là 1 đơn duy nhất
        expect(await database.getRepository(Order).count()).toBe(1);
      });
    });

    // =========================================================================
    // KỊCH BẢN 3: TRANH CHẤP NGUYÊN LIỆU — 20 KHÁCH ĐẶT LY CUỐI (FR-07, NFR-01, INT-T04)
    // =========================================================================
    describe('2. Concurrency & Optimistic Locking: Sell Last Cup (FR-07, NFR-01, INT-T04)', () => {
      it('never oversells the last cup when 20 customers order concurrently', async () => {
        // Cà phê tồn kho còn đúng 18g (chỉ đủ làm đúng 1 ly Americano size S)
        await database.query(
          `UPDATE ingredients SET quantity = 18, version = 1 WHERE id = 'coffee'`,
        );

        // Tạo 20 khách hàng với tài khoản và JWT riêng biệt
        const customers = await Promise.all(
          Array.from({ length: 20 }, async (_, i) => {
            const u = await database.getRepository(User).save({
              email: `buyer-${i}-${randomUUID()}@contest.test`,
              passwordHash: 'dummy',
              role: 'CUSTOMER',
            });
            const jwt = app.get(JwtService).sign({
              sub: u.id,
              email: u.email,
              role: 'CUSTOMER',
            });
            return { user: u, jwt };
          }),
        );

        // 20 khách cùng lúc gửi request đặt đơn ly cuối cùng
        const outcomes = await Promise.all(
          customers.map(({ jwt }) =>
            placeOrder(
              randomUUID(),
              [item({ productId: 'p1', size: 'S', qty: 1 })],
              jwt,
            ),
          ),
        );

        const successful = outcomes.filter((res) => res.status === 201);
        const failed = outcomes.filter((res) => res.status !== 201);

        // ĐÚNG 1 khách hàng thành công, 19 khách còn lại bị từ chối
        expect(successful).toHaveLength(1);
        expect(failed).toHaveLength(19);

        // Tồn kho cà phê còn đúng 0g, tuyệt đối không bị âm
        const coffee = await database
          .getRepository(Ingredient)
          .findOneByOrFail({ id: 'coffee' });
        expect(coffee.quantity).toBe(0);
        expect(coffee.version).toBe(2);

        // Chỉ có đúng 1 đơn hàng được ghi nhận trong DB
        expect(await database.getRepository(Order).count()).toBe(1);
        expect(await database.getRepository(OrderItem).count()).toBe(1);
      }, 35000);
    });

    // =========================================================================
    // KỊCH BẢN 4: STATE MACHINE CHẶN CHUYỂN TRẠNG THÁI SAI & HẾT HẠN (FR-10, NFR-01, INT-T04)
    // =========================================================================
    describe('3. Order State Machine & Expiration (FR-10, NFR-01, INT-T04)', () => {
      it('blocks invalid state transitions and enforces allowed arrows', async () => {
        // Chuyển trạng thái bất hợp lệ phải ném InvalidOrderTransitionException (HTTP 400)
        expect(() => assertTransition('PENDING', 'READY')).toThrow(
          InvalidOrderTransitionException,
        );
        expect(() => assertTransition('PENDING', 'COMPLETED')).toThrow(
          InvalidOrderTransitionException,
        );
        expect(() => assertTransition('READY', 'PENDING')).toThrow(
          InvalidOrderTransitionException,
        );
        expect(() => assertTransition('READY', 'PAID')).toThrow(
          InvalidOrderTransitionException,
        );
        expect(() => assertTransition('COMPLETED', 'PENDING')).toThrow(
          InvalidOrderTransitionException,
        );
        expect(() => assertTransition('CANCELLED', 'PAID')).toThrow(
          InvalidOrderTransitionException,
        );

        // Các chuyển đổi hợp lệ không ném ngoại lệ
        expect(() => assertTransition('PENDING', 'PAID')).not.toThrow();
        expect(() => assertTransition('PENDING', 'PAYMENT_FAILED')).not.toThrow();
        expect(() => assertTransition('PENDING', 'CANCELLED')).not.toThrow();
        expect(() => assertTransition('PAID', 'PREPARING')).not.toThrow();
        expect(() => assertTransition('PREPARING', 'READY')).not.toThrow();
        expect(() => assertTransition('READY', 'COMPLETED')).not.toThrow();
      });

      it('cancels expired unpaid orders and refunds reserved ingredients back to stock', async () => {
        const res = await placeOrder().expect(201);
        const orderId = res.body.orderId;

        // Tồn kho ban đầu bị trừ 18g còn 1982g
        const coffeeBefore = await database
          .getRepository(Ingredient)
          .findOneByOrFail({ id: 'coffee' });
        expect(coffeeBefore.quantity).toBe(1982);
        expect(coffeeBefore.version).toBe(2);

        // Giả lập đơn hàng quá hạn 15 phút
        await database.query(
          `UPDATE orders SET "expiresAt" = clock_timestamp() - INTERVAL '1 second' WHERE id = $1`,
          [orderId],
        );

        // Quét đơn quá hạn
        const expiredCount = await ordersService.expireUnpaidOrders();
        expect(expiredCount).toBe(1);

        // Trạng thái đơn chuyển sang CANCELLED
        const order = await database
          .getRepository(Order)
          .findOneByOrFail({ id: orderId });
        expect(order.status).toBe('CANCELLED');
        expect(order.cancelReason).toBe('PAYMENT_TIMEOUT');

        // Toàn bộ nguyên liệu giữ được hoàn trả lại kho
        const coffeeAfter = await database
          .getRepository(Ingredient)
          .findOneByOrFail({ id: 'coffee' });
        expect(coffeeAfter.quantity).toBe(2000);
        expect(coffeeAfter.version).toBe(3);

        // Quét lại lần 2 không lặp lại
        expect(await ordersService.expireUnpaidOrders()).toBe(0);
      });
    });

    // =========================================================================
    // KỊCH BẢN 5: THANH TOÁN VÍ -> MOCK BANK -> XÁC NHẬN -> PAID (FR-07, FR-08, INT-T02, INT-T03)
    // =========================================================================
    describe('4. Wallet Payment Flow (FR-07, FR-08, INT-T02, INT-T03)', () => {
      it('executes full wallet flow: payment PENDING -> mock bank transfer -> staff confirm -> order PAID', async () => {
        const orderRes = await placeOrder().expect(201);
        const orderId = orderRes.body.orderId;
        const total = orderRes.body.total;

        // 1. Khách hàng tạo phiên thanh toán Ví
        const payRes = await createPayment(orderId, 'WALLET').expect(201);
        const paymentId = payRes.body.paymentId;
        expect(payRes.body.status).toBe('PENDING');
        expect(payRes.body.amount).toBe(total);

        // 2. Tra cứu thông tin chuyển khoản ngân hàng giả lập
        const info = await request(app.getHttpServer())
          .get(`/mock-bank/payments/${paymentId}`)
          .expect(200);
        expect(info.body).toMatchObject({
          amount: total,
          transferContent: orderId,
          status: 'PENDING',
        });

        // 3. Khách bấm chuyển tiền qua ngân hàng giả lập
        const transferRes = await transferMockBank(paymentId).expect(200);
        expect(transferRes.body.status).toBe('TRANSFER_RECEIVED');

        // Đơn hàng vẫn ở PENDING (chưa thành PAID vì chờ nhân viên xác nhận)
        const orderMid = await database
          .getRepository(Order)
          .findOneByOrFail({ id: orderId });
        expect(orderMid.status).toBe('PENDING');

        // Sao kê ngân hàng ghi nhận 1 giao dịch IN
        const txs = await database
          .getRepository(BankTransaction)
          .find({ where: { orderId } });
        expect(txs).toHaveLength(1);
        expect(txs[0].type).toBe('IN');
        expect(txs[0].amount).toBe(total);

        // Bấm chuyển tiền lặp lại không ghi tiền lần thứ 2
        await transferMockBank(paymentId).expect(200);
        const txsRepeated = await database
          .getRepository(BankTransaction)
          .find({ where: { orderId } });
        expect(txsRepeated).toHaveLength(1);

        // Khách hàng thường (CUSTOMER) gọi confirm bị chặn 403 Forbidden
        await reviewPayment(paymentId, 'confirm', 'Hacker', token).expect(403);

        // 4. Nhân viên xem danh sách phiên thanh toán
        const activeList = await paymentsService.listForAdmin({
          status: 'ACTIVE',
        });
        expect(activeList.some((p) => p.paymentId === paymentId)).toBe(true);

        // 5. Nhân viên xác nhận thanh toán
        const confirmRes = await reviewPayment(
          paymentId,
          'confirm',
          'Đã đối soát khớp tiền',
          adminToken,
        ).expect(200);
        expect(confirmRes.body.status).toBe('SUCCESS');
        expect(confirmRes.body.orderStatus).toBe('PAID');

        // Kiểm tra database: Đơn hàng thành PAID, phiên thành SUCCESS
        const orderFinal = await database
          .getRepository(Order)
          .findOneByOrFail({ id: orderId });
        expect(orderFinal.status).toBe('PAID');

        const paymentFinal = await database
          .getRepository(Payment)
          .findOneByOrFail({ id: paymentId });
        expect(paymentFinal.status).toBe('SUCCESS');
        expect(paymentFinal.reviewedBy).toBe(adminId);
      });
    });

    // =========================================================================
    // KỊCH BẢN 6: TỪ CHỐI THANH TOÁN -> HOÀN TIỀN ĐÚNG 1 LẦN (FR-07, FR-08, INT-T02)
    // =========================================================================
    describe('5. Payment Rejection & Single Refund (FR-07, FR-08, INT-T02)', () => {
      it('refunds received money exactly once on rejection and sets order to PAYMENT_FAILED', async () => {
        const orderRes = await placeOrder().expect(201);
        const orderId = orderRes.body.orderId;
        const total = orderRes.body.total;

        const payRes = await createPayment(orderId, 'WALLET').expect(201);
        const paymentId = payRes.body.paymentId;

        // Khách chuyển tiền thành công
        await transferMockBank(paymentId).expect(200);

        // Nhân viên từ chối
        const rejectRes = await reviewPayment(
          paymentId,
          'reject',
          'Sai thông tin chuyển khoản',
          adminToken,
        ).expect(200);

        expect(rejectRes.body.status).toBe('FAILED');
        expect(rejectRes.body.orderStatus).toBe('PAYMENT_FAILED');

        // Đơn hàng chuyển sang PAYMENT_FAILED
        const order = await database
          .getRepository(Order)
          .findOneByOrFail({ id: orderId });
        expect(order.status).toBe('PAYMENT_FAILED');

        // Sổ sao kê có đúng 1 giao dịch IN và 1 giao dịch REFUND với số tiền khớp nhau
        const txs = await database.getRepository(BankTransaction).find({
          where: { orderId },
          order: { createdAt: 'ASC' },
        });
        expect(txs.map((t) => [t.type, t.amount])).toEqual([
          ['IN', total],
          ['REFUND', total],
        ]);

        // Gọi reject lần 2: hệ thống xử lý idempotent (trả về 200 kèm trạng thái FAILED, không hoàn tiền lần 2)
        const repeatedReject = await reviewPayment(
          paymentId,
          'reject',
          'Từ chối lần 2',
          adminToken,
        ).expect(200);
        expect(repeatedReject.body.status).toBe('FAILED');

        // Số lượng REFUND trong sao kê vẫn chỉ là đúng 1 lần
        const txsAfter = await database
          .getRepository(BankTransaction)
          .find({ where: { orderId } });
        expect(txsAfter.filter((t) => t.type === 'REFUND')).toHaveLength(1);

        // Khách có thể thử lại bằng cách mở phiên thanh toán mới
        const retryKey = randomUUID();
        const retryPay = await createPayment(
          orderId,
          'WALLET',
          retryKey,
          token,
        ).expect(201);
        expect(retryPay.body.status).toBe('PENDING');

        // Đơn quay về PENDING
        const orderRetried = await database
          .getRepository(Order)
          .findOneByOrFail({ id: orderId });
        expect(orderRetried.status).toBe('PENDING');
      });
    });

    // =========================================================================
    // KỊCH BẢN 7: THANH TOÁN THẺ TẠI QUẦY & ĐƠN HẾT HẠN (FR-08, INT-T03)
    // =========================================================================
    describe('6. Card Payment & Expiration Guard (FR-08, INT-T03)', () => {
      it('records bank transaction on counter staff confirmation for CARD payments', async () => {
        const orderRes = await placeOrder().expect(201);
        const orderId = orderRes.body.orderId;
        const total = orderRes.body.total;

        const payRes = await createPayment(orderId, 'CARD').expect(201);
        const paymentId = payRes.body.paymentId;

        // Phiên thẻ chưa có dòng sao kê nào trước khi nhân viên xác nhận
        const txsBefore = await database
          .getRepository(BankTransaction)
          .find({ where: { orderId } });
        expect(txsBefore).toHaveLength(0);

        // Nhân viên xác nhận tại quầy sau khi khách quẹt thẻ
        await reviewPayment(
          paymentId,
          'confirm',
          'Quẹt thẻ thành công tại quầy POS',
          adminToken,
        ).expect(200);

        // Đơn hàng thành PAID
        const order = await database
          .getRepository(Order)
          .findOneByOrFail({ id: orderId });
        expect(order.status).toBe('PAID');

        // Sao kê tự động ghi nhận IN cho thẻ
        const txsAfter = await database
          .getRepository(BankTransaction)
          .find({ where: { orderId } });
        expect(txsAfter).toHaveLength(1);
        expect(txsAfter[0].type).toBe('IN');
        expect(txsAfter[0].amount).toBe(total);
      });

      it('rejects confirmation for expired orders with 400 and auto-cancels releasing ingredients', async () => {
        const orderRes = await placeOrder().expect(201);
        const orderId = orderRes.body.orderId;

        const payRes = await createPayment(orderId, 'WALLET').expect(201);
        const paymentId = payRes.body.paymentId;

        // Giả lập đơn hết hạn quá 15 phút
        await database.query(
          `UPDATE orders SET "expiresAt" = clock_timestamp() - INTERVAL '1 second' WHERE id = $1`,
          [orderId],
        );

        // Nhân viên confirm đơn hết hạn bị từ chối 400
        await reviewPayment(paymentId, 'confirm', 'Late review', adminToken).expect(400);

        // Đơn chuyển sang CANCELLED và nguyên liệu được hoàn lại
        const order = await database
          .getRepository(Order)
          .findOneByOrFail({ id: orderId });
        expect(order.status).toBe('CANCELLED');

        const coffee = await database
          .getRepository(Ingredient)
          .findOneByOrFail({ id: 'coffee' });
        expect(coffee.quantity).toBe(2000);
      });
    });
  },
);
