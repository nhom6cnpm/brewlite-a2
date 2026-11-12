import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { VouchersController } from './vouchers.controller';
import { VoucherCatalogService } from './voucher-catalog.service';
import { VoucherCartQuoteService } from './voucher-cart-quote.service';
import { VouchersService } from './vouchers.service';
import { VoucherUsagesService } from './voucher-usages.service';
import { Product } from '../products/product.entity';
import type { Voucher } from './voucher.entity';
import { User } from '../auth/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/jwt.strategy';
import type { VoucherUsageAvailability } from './voucher-usage';

const now = new Date('2026-11-11T10:00:00Z');
const publicVoucher: Voucher = {
  code: 'BREW10',
  title: 'Giảm 10%',
  discountType: 'PERCENT',
  discountValue: 10,
  minSubtotal: 50000,
  maxDiscount: 10000,
  startsAt: new Date('2026-11-01'),
  endsAt: new Date('2026-12-01'),
  isActive: true,
  isPublic: true,
  maxUsesPerUser: 3,
};
const hiddenVoucher: Voucher = Object.assign({}, publicVoucher, {
  code: 'NHAP7K',
  title: 'Giảm 7.000đ',
  discountType: 'FIXED',
  discountValue: 7000,
  minSubtotal: 35000,
  maxDiscount: null,
  isPublic: false,
});
const item = { productId: 'p1', size: 'M', toppingIds: ['cream'], qty: 2 };
const userId = '12345678-1234-4234-9234-123456789012';
const jwtSecret = 'voucher-http-unit-secret';

/** HTTP + real validation/service composition; repository/transaction are mocked, not PostgreSQL integration. */
describe('API-T56 — POST /vouchers/quote HTTP with main JWT strategy', () => {
  let app: INestApplication;
  let url: string;
  let jwt: JwtService;
  const writes = {
    save: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const accountUsage = {
    availability: jest.fn(),
    unavailableReason: jest.fn((usage: VoucherUsageAvailability) =>
      new VoucherUsagesService().unavailableReason(usage),
    ),
    reserve: jest.fn(),
    markUsed: jest.fn(),
    release: jest.fn(),
  };
  const voucherRepository = {
    ...writes,
    findOne: jest.fn(
      async ({ where }: { where: { code: string } }) =>
        [publicVoucher, hiddenVoucher].find((v) => v.code === where.code) ??
        null,
    ),
    findOneByOrFail: jest.fn(async ({ code }: { code: string }) =>
      [publicVoucher, hiddenVoucher].find((v) => v.code === code)!,
    ),
    createQueryBuilder: () => ({
      where() {
        return this;
      },
      andWhere() {
        return this;
      },
      orderBy() {
        return this;
      },
      getMany: async () => [publicVoucher],
    }),
  };
  const findBy = jest.fn(async () => [
    {
      id: 'p1',
      name: 'Americano',
      price: 30000,
      imageUrl: '/images/americano.jpg',
    },
  ]);
  const clock = jest.fn(async () => [{ now }]);
  const existsBy = jest.fn(async () => true);
  const manager = {
    ...writes,
    query: clock,
    getRepository: (entity: unknown) =>
      entity === Product
        ? { ...writes, findBy }
        : entity === User
          ? { existsBy }
          : voucherRepository,
  } as unknown as EntityManager;
  const transaction = jest.fn(
    async (work: (m: EntityManager) => Promise<unknown>) => work(manager),
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: jwtSecret })],
      controllers: [VouchersController],
      providers: [
        VoucherCartQuoteService,
        VouchersService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: jwtSecret }),
        },
        { provide: DataSource, useValue: { transaction } },
        {
          provide: VoucherCatalogService,
          useValue: { list: async () => [publicVoucher] },
        },
        { provide: VoucherUsagesService, useValue: accountUsage },
      ],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    // Use the exact global validation settings merged from PR #48.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/vouchers/quote`;
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    existsBy.mockResolvedValue(true);
    accountUsage.availability.mockResolvedValue({
      maxUsesPerUser: 3,
      reservedUses: 0,
      usedUses: 0,
      availableUses: 3,
    });
  });
  const post = (payload: unknown, authorization?: string) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization !== undefined
          ? { Authorization: authorization }
          : {}),
      },
      body: JSON.stringify(payload),
    });

  it('computes subtotal from DB, A1 size/toppings and quantity, then applies a voucher', async () => {
    const response = await post({ items: [item], voucherCode: ' brew10 ' });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toContain('Authorization');
    expect(await response.json()).toMatchObject({
      subtotal: 80000,
      discount: 8000,
      total: 72000,
      voucherCode: 'BREW10',
      voucherUsage: null,
      serverTime: now.toISOString(),
    });
    expect(clock).toHaveBeenCalledWith('SELECT clock_timestamp() AS now');
  });
  it('caps percent discount on a larger cart', async () => {
    const response = await post({
      items: [{ ...item, qty: 5 }],
      voucherCode: 'BREW10',
    });
    expect(await response.json()).toMatchObject({
      subtotal: 200000,
      discount: 10000,
      total: 190000,
    });
  });
  it('accepts a hidden manual code but leaves it out of public options', async () => {
    const response = await post({
      items: [{ ...item, toppingIds: [], qty: 1 }],
      voucherCode: 'nhap7k',
    });
    const data = await response.json();
    expect(data).toMatchObject({
      subtotal: 35000,
      discount: 7000,
      total: 28000,
      voucherCode: 'NHAP7K',
    });
    expect(data.vouchers.map((v: { code: string }) => v.code)).not.toContain(
      'NHAP7K',
    );
  });
  it('quotes the cart without selecting a code and explains ineligible options', async () => {
    const response = await post({
      items: [{ ...item, size: 'S', toppingIds: [], qty: 1 }],
    });
    expect(await response.json()).toMatchObject({
      subtotal: 30000,
      discount: 0,
      total: 30000,
      voucherCode: null,
      vouchers: [
        {
          unavailableReason: expect.stringContaining('50.000'),
          discount: 0,
          usage: null,
        },
      ],
    });
  });
  it('does not create an order, reserve stock or touch account quota while quoting', async () => {
    expect((await post({ items: [item], voucherCode: 'BREW10' })).status).toBe(
      200,
    );
    for (const method of Object.values(writes))
      expect(method).not.toHaveBeenCalled();
    for (const method of Object.values(accountUsage))
      expect(method).not.toHaveBeenCalled();
  });
  it('rejects forged prices or identities instead of using or silently stripping them', async () => {
    for (const payload of [
      { items: [item], subtotal: 1 },
      { items: [item], userId: 'forged' },
      { items: [{ ...item, unitPrice: 1 }] },
      { items: [item], discount: 999999 },
    ])
      expect((await post(payload)).status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('rejects invalid items before loading products', async () => {
    for (const invalid of [
      { ...item, qty: 0 },
      { ...item, qty: '2' },
      { ...item, size: 'XL' },
      { ...item, toppingIds: ['invalid'] },
      { ...item, toppingIds: ['cream', 'cream'] },
    ])
      expect((await post({ items: [invalid] })).status).toBe(400);
    expect(findBy).not.toHaveBeenCalled();
  });
  it('returns a clear error for a missing product, invalid code or subtotal below the minimum', async () => {
    for (const payload of [
      { items: [{ ...item, productId: 'missing' }] },
      { items: [item], voucherCode: 'BAD' },
      {
        items: [{ ...item, size: 'S', toppingIds: [], qty: 1 }],
        voucherCode: 'BREW10',
      },
    ]) {
      const response = await post(payload);
      expect(response.status).toBe(400);
      expect((await response.json()).message).toBeTruthy();
    }
  });
  it.each(['Bearer not-validated', 'Basic credentials', ''])(
    'never treats a supplied Authorization header as guest: %p',
    async (authorization) => {
      const response = await post({ items: [item] }, authorization);
      expect(response.status).toBe(401);
      expect(transaction).not.toHaveBeenCalled();
    },
  );
  it('valid JWT returns account-specific counts without reserving anything', async () => {
    const usage = {
      maxUsesPerUser: 3,
      reservedUses: 1,
      usedUses: 1,
      availableUses: 1,
    };
    accountUsage.availability.mockResolvedValue(usage);
    const token = jwt.sign({
      sub: userId,
      email: 'unit@example.test',
      role: 'CUSTOMER',
    });
    const response = await post(
      { items: [item], voucherCode: 'BREW10' },
      `Bearer ${token}`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      voucherUsage: usage,
      vouchers: [{ usage }],
    });
    expect(existsBy).toHaveBeenCalledWith({ id: userId });
    expect(accountUsage.availability).toHaveBeenCalledWith(
      manager,
      userId,
      'BREW10',
      3,
    );
    expect(accountUsage.reserve).not.toHaveBeenCalled();
  });
  it('expired JWT returns 401 and never falls back to guest pricing', async () => {
    const token = jwt.sign(
      { sub: userId, email: 'unit@example.test' },
      { expiresIn: -1 },
    );
    expect((await post({ items: [item] }, `Bearer ${token}`)).status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('a signed token without an account ID never becomes a guest quote', async () => {
    const token = jwt.sign({ email: 'unit@example.test' });
    expect((await post({ items: [item] }, `Bearer ${token}`)).status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('a valid signature for a deleted or malformed account returns 401', async () => {
    existsBy.mockResolvedValue(false);
    const token = jwt.sign({ sub: userId, email: 'unit@example.test' });
    expect((await post({ items: [item] }, `Bearer ${token}`)).status).toBe(401);
    const malformed = jwt.sign({
      sub: 'not-a-uuid',
      email: 'unit@example.test',
    });
    expect((await post({ items: [item] }, `Bearer ${malformed}`)).status).toBe(
      401,
    );
  });
  it.each([
    { reservedUses: 0, usedUses: 3 },
    { reservedUses: 3, usedUses: 0 },
  ])('valid JWT rejects exhausted or fully held slots %p', async (counts) => {
    accountUsage.availability.mockResolvedValue({
      maxUsesPerUser: 3,
      ...counts,
      availableUses: 0,
    });
    const token = jwt.sign({ sub: userId, email: 'unit@example.test' });
    expect(
      (await post({ items: [item], voucherCode: 'BREW10' }, `Bearer ${token}`))
        .status,
    ).toBe(409);
  });
});
