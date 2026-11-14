import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrderWorkflowService } from './admin-order-workflow.service';
import { OrderHistoryService } from './order-history.service';

const ID = '12345678-1234-4234-9234-123456789012';
const routes = [
  ['GET', ''],
  ['GET', '/history'],
  ['GET', '/ORD-1/detail'],
  ['PATCH', '/ORD-1/status'],
  ['POST', '/ORD-1/cancel'],
  ['POST', '/ORD-1/cancel-request/reject'],
];

describe('API-T80 admin HTTP, JWT roles, strict DTO and Swagger', () => {
  let app: INestApplication, base: string, admin: string, customer: string;
  const workflow = {
    advancePreparation: jest.fn(async () => {}),
    reviewCancellation: jest.fn(async () => {}),
  };
  const history = {
    findForAdminHistory: jest.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })),
    findAdminDetail: jest.fn(async () => ({ id: 'ORD-1' })),
    findForAdminById: jest.fn(async () => ({ id: 'ORD-1' })),
    findCancellationRequests: jest.fn(async () => []),
    findPreparationOrders: jest.fn(async () => []),
  };
  beforeAll(async () => {
    const secret = 'admin-http-test-only-secret';
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret })],
      controllers: [AdminOrdersController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: ConfigService, useValue: { get: () => secret } },
        { provide: AdminOrderWorkflowService, useValue: workflow },
        { provide: OrderHistoryService, useValue: history },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    admin = module
      .get(JwtService)
      .sign({ sub: ID, email: 'admin@example.test', role: 'ADMIN' });
    customer = module
      .get(JwtService)
      .sign({ sub: ID, email: 'customer@example.test', role: 'CUSTOMER' });
  });
  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());
  const call = (
    method: string,
    path: string,
    body?: unknown,
    token: string | null = admin,
  ) =>
    fetch(base + '/admin/orders' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  it.each(routes)('%s %s requires JWT and ADMIN', async (method, path) => {
    expect((await call(method, path, undefined, null)).status).toBe(401);
    expect((await call(method, path, undefined, customer)).status).toBe(403);
    expect(workflow.advancePreparation).not.toHaveBeenCalled();
    expect(workflow.reviewCancellation).not.toHaveBeenCalled();
  });
  it('accepts both list modes and typed pagination with no-store', async () => {
    expect((await call('GET', '?cancelRequestStatus=PENDING')).status).toBe(
      200,
    );
    expect(history.findCancellationRequests).toHaveBeenCalledWith('PENDING');
    expect((await call('GET', '?status=PAID,READY')).status).toBe(200);
    expect(history.findPreparationOrders).toHaveBeenCalledWith('PAID,READY');
    const response = await call(
      'GET',
      '/history?page=2&pageSize=10&status=COMPLETED&q=coffee',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(history.findForAdminHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 10,
        status: 'COMPLETED',
        q: 'coffee',
      }),
    );
  });
  it.each([
    '?status=PAID&cancelRequestStatus=PENDING',
    '?status=PENDING',
    '?cancelRequestStatus=APPROVED',
    '?status=PAID&status=READY',
    '?userId=forged',
    '/history?page=0',
    '/history?page=1.5',
    '/history?pageSize=51',
    '/history?status=BOGUS',
    '/history?q=' + 'x'.repeat(101),
  ])('rejects bad query %s', async (path) => {
    expect((await call('GET', path)).status).toBe(400);
  });
  it('passes the signed staff identity and trimmed reason, returns updated snapshot', async () => {
    expect(
      (
        await call('POST', '/ORD-1/cancel-request/reject', {
          requestId: ID,
          reason: '  agreed  ',
        })
      ).status,
    ).toBe(200);
    expect(workflow.reviewCancellation).toHaveBeenCalledWith(
      ID,
      'ORD-1',
      ID,
      'REJECTED',
      'agreed',
    );
    expect(
      (await call('POST', '/ORD-1/cancel', { requestId: ID })).status,
    ).toBe(200);
    expect(
      (await call('PATCH', '/ORD-1/status', { status: 'PREPARING' })).status,
    ).toBe(200);
  });
  it.each([
    {},
    { requestId: 'old' },
    { requestId: ID, note: null },
    { requestId: ID, note: ' ' },
    { requestId: ID, total: 1 },
    { requestId: ID, userId: 'other' },
    { requestId: ID, refund: 999 },
  ])('approval rejects malformed/forged body', async (body) => {
    expect((await call('POST', '/ORD-1/cancel', body)).status).toBe(400);
    expect(workflow.reviewCancellation).not.toHaveBeenCalled();
  });
  it.each(['', ' ', 'x'.repeat(501)])(
    'rejection needs a valid reason',
    async (reason) => {
      expect(
        (
          await call('POST', '/ORD-1/cancel-request/reject', {
            requestId: ID,
            reason,
          })
        ).status,
      ).toBe(400);
    },
  );
  it('PATCH cannot set money, PAID or skip validation; detail static route works', async () => {
    expect(
      (await call('PATCH', '/ORD-1/status', { status: 'PAID' })).status,
    ).toBe(400);
    expect(
      (await call('PATCH', '/ORD-1/status', { status: 'READY', total: 0 }))
        .status,
    ).toBe(400);
    expect((await call('GET', '/ORD-1/detail')).status).toBe(200);
    expect(history.findAdminDetail).toHaveBeenCalledWith('ORD-1');
  });
  it('documents 6 ADMIN routes, parameters/body/output and JWT', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Admin test')
        .addBearerAuth(undefined, 'JWT-auth')
        .build(),
    );
    for (const [method, path] of routes) {
      const operation =
        doc.paths['/admin/orders' + path.replace('ORD-1', '{id}')][
          method.toLowerCase() as 'get' | 'post' | 'patch'
        ];
      expect(operation?.security).toContainEqual({ 'JWT-auth': [] });
      expect(operation?.responses['403']).toBeDefined();
      expect(operation?.responses['200']).toBeDefined();
    }
    expect(doc.components?.schemas?.AdminOrderDetailDto).toHaveProperty(
      'properties.payments',
    );
    expect(doc.components?.schemas?.RejectCancellationDto).toHaveProperty(
      'properties.reason.maxLength',
      500,
    );
    expect(doc.paths['/admin/orders/history'].get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'page' }),
        expect.objectContaining({ name: 'q' }),
      ]),
    );
  });
});
