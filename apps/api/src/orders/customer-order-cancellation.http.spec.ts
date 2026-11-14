import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { JwtStrategy } from '../auth/jwt.strategy';
import { CustomerOrderCancellationController } from './customer-order-cancellation.controller';
import { CustomerOrderCancellationService } from './customer-order-cancellation.service';
import { OrderHistoryService } from './order-history.service';

describe('API-T71 cancellation HTTP, main global whitelist/JWT and Swagger', () => {
  let app: INestApplication;
  let base: string;
  let token: string;
  const userId = '12345678-1234-4234-9234-123456789012';
  const secret = 'customer-cancellation-http-test-secret';
  const mutations = {
    cancelOrder: jest.fn(async () => ({
      orderId: 'ORD-1',
      status: 'CANCELLED',
    })),
    requestCancellation: jest.fn(async () => {}),
  };
  const history = {
    findOwnById: jest.fn(async () => ({
      id: 'ORD-1',
      cancelRequest: { status: 'PENDING' },
    })),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret })],
      controllers: [CustomerOrderCancellationController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => secret } },
        { provide: CustomerOrderCancellationService, useValue: mutations },
        { provide: OrderHistoryService, useValue: history },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    token = module
      .get(JwtService)
      .sign({ sub: userId, email: 'customer@example.test', role: 'CUSTOMER' });
  });
  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());
  async function post(
    path: string,
    body: unknown,
    bearer: string | null = token,
  ) {
    return fetch(base + '/orders/ORD-1/' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}),
      },
      body: JSON.stringify(body),
    });
  }
  it('missing or invalid JWT returns 401 without mutation', async () => {
    expect((await post('cancel', {}, null)).status).toBe(401);
    expect(
      (await post('cancel-request', { reason: 'reason' }, 'wrong')).status,
    ).toBe(401);
    expect(mutations.cancelOrder).not.toHaveBeenCalled();
  });
  it('valid JWT supplies the owner and an empty immediate body is accepted', async () => {
    const response = await post('cancel', {});
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mutations.cancelOrder).toHaveBeenCalledWith(userId, 'ORD-1');
  });
  it('reason is trimmed and request returns the refreshed customer snapshot', async () => {
    const response = await post('cancel-request', { reason: '  schedule  ' });
    expect(response.status).toBe(200);
    expect(mutations.requestCancellation).toHaveBeenCalledWith(
      userId,
      'ORD-1',
      'schedule',
    );
    expect(history.findOwnById).toHaveBeenCalledWith(userId, 'ORD-1');
  });
  it.each([
    {},
    { reason: '' },
    { reason: ' ' },
    { reason: 2 },
    { reason: 'x'.repeat(501) },
    { reason: 'okay', userId: 'someone-else' },
    { reason: 'okay', refundedAmount: 999 },
  ])(
    'rejects invalid/forged request before global whitelist can hide it',
    async (body) => {
      expect((await post('cancel-request', body)).status).toBe(400);
      expect(mutations.requestCancellation).not.toHaveBeenCalled();
    },
  );
  it.each([
    { userId: 'other' },
    { total: 1 },
    { status: 'CANCELLED' },
    [],
    'invalid',
  ])('rejects fields on immediate cancellation', async (body) => {
    expect((await post('cancel', body)).status).toBe(400);
    expect(mutations.cancelOrder).not.toHaveBeenCalled();
  });
  it('documents both JWT endpoints, request validation and nested response fields', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Test')
        .addBearerAuth(undefined, 'JWT-auth')
        .build(),
    );
    expect(doc.paths['/orders/{id}/cancel'].post?.security).toContainEqual({
      'JWT-auth': [],
    });
    expect(
      doc.paths['/orders/{id}/cancel-request'].post?.responses['409'],
    ).toBeDefined();
    const schemas = doc.components?.schemas;
    expect(schemas?.RequestCancellationDto).toHaveProperty(
      'properties.reason.maxLength',
      500,
    );
    expect(schemas?.CustomerOrderViewDto).toHaveProperty(
      'properties.refundedAmount',
    );
    expect(schemas?.CustomerOrderViewDto).toHaveProperty(
      'properties.cancelRequest',
    );
  });
});
