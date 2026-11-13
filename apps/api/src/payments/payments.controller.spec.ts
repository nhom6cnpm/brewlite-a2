import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { UserRole } from '../auth/roles';
import { AdminPaymentsController } from './admin-payments.controller';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { MockBankController } from './mock-bank.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

const messages = async (cls: new () => object, body: object) =>
  (await validate(plainToInstance(cls, body))).flatMap((e) =>
    Object.values(e.constraints ?? {}),
  );

describe('API-T36 Controller thanh toán: phân quyền, Swagger, validate', () => {
  const guardFor = (handler: keyof AdminPaymentsController, role: UserRole) => {
    const guard = new RolesGuard(new Reflector());
    const context = {
      getHandler: () => AdminPaymentsController.prototype[handler],
      getClass: () => AdminPaymentsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as unknown as ExecutionContext;
    return () => guard.canActivate(context);
  };

  it.each(['confirm', 'reject', 'list'] as const)(
    'khách (CUSTOMER) không tự %s được: 403',
    (handler) => {
      expect(guardFor(handler, 'CUSTOMER')).toThrow(ForbiddenException);
      expect(guardFor(handler, 'ADMIN')()).toBe(true);
    },
  );

  it('API admin cần cả JWT lẫn RolesGuard; API khách cần JWT', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminPaymentsController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(GUARDS_METADATA, PaymentsController)).toEqual([
      JwtAuthGuard,
    ]);
  });

  it('controller chuyển đúng tham số cho service', async () => {
    const service = {
      createPayment: jest.fn(async () => ({})),
      review: jest.fn(async () => ({})),
      receiveTransfer: jest.fn(async () => ({})),
      getTransferInfo: jest.fn(async () => ({ status: 'TRANSFER_RECEIVED' })),
    };
    const req = {
      user: { userId: 'u-1', email: 'a@b.vn', role: 'ADMIN' as const },
    };
    const s = service as unknown as PaymentsService;
    await new PaymentsController(s).createPayment(
      req,
      { orderId: 'ORD-1', method: 'WALLET' },
      'k1',
    );
    expect(service.createPayment).toHaveBeenCalledWith(
      'u-1',
      { orderId: 'ORD-1', method: 'WALLET' },
      'k1',
    );
    const admin = new AdminPaymentsController(s);
    await admin.confirm(req, 'PAY-1', { note: 'ok' });
    await admin.reject(req, 'PAY-1');
    expect(service.review).toHaveBeenNthCalledWith(
      1,
      'u-1',
      'PAY-1',
      'CONFIRM',
      'ok',
    );
    expect(service.review).toHaveBeenNthCalledWith(
      2,
      'u-1',
      'PAY-1',
      'REJECT',
      undefined,
    );
    await expect(new MockBankController(s).transfer('PAY-1')).resolves.toEqual({
      status: 'TRANSFER_RECEIVED',
    });
    expect(service.receiveTransfer).toHaveBeenCalledWith('PAY-1');
  });

  it('validate: phương thức chỉ WALLET/CARD, orderId bắt buộc, ghi chú ≤ 255', async () => {
    await expect(
      messages(CreatePaymentDto, { orderId: 'ORD-1', method: 'CARD' }),
    ).resolves.toEqual([]);
    await expect(
      messages(CreatePaymentDto, { orderId: '', method: 'CASH' }),
    ).resolves.toEqual(
      expect.arrayContaining([
        'orderId không được để trống',
        'Phương thức phải là WALLET hoặc CARD',
      ]),
    );
    await expect(
      messages(ReviewPaymentDto, { note: 'x'.repeat(256) }),
    ).resolves.toContain('Ghi chú tối đa 255 ký tự');
  });

  it('có mô tả Swagger cho mọi endpoint thanh toán', async () => {
    const module = await Test.createTestingModule({
      controllers: [
        PaymentsController,
        AdminPaymentsController,
        MockBankController,
      ],
      providers: [{ provide: PaymentsService, useValue: {} }],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      const doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('Test').build(),
      );
      const create = doc.paths['/payments'].post!;
      expect(create.tags).toContain('Payments');
      expect(create.security).toContainEqual({ 'JWT-auth': [] });
      expect(create.parameters).toContainEqual(
        expect.objectContaining({ name: 'Idempotency-Key', required: true }),
      );
      expect(doc.paths['/payments/{id}'].get?.responses['403']).toBeDefined();
      for (const action of ['confirm', 'reject']) {
        const op = doc.paths[`/admin/payments/{id}/${action}`].post!;
        expect(op.tags).toContain('Admin Payments');
        expect(op.responses['403']).toBeDefined();
      }
      expect(doc.paths['/admin/payments'].get).toBeDefined();
      expect(
        doc.paths['/mock-bank/payments/{id}/transfer'].post?.tags,
      ).toContain('Mock Bank');
      // Opened from the QR on a phone without logging in
      expect(
        doc.paths['/mock-bank/payments/{id}/transfer'].post?.security,
      ).toBeUndefined();
      for (const schema of [
        'CreatePaymentDto',
        'ReviewPaymentDto',
        'PaymentViewDto',
        'TransferInfoDto',
      ])
        expect(doc.components?.schemas?.[schema]).toBeDefined();
    } finally {
      await app.close();
    }
  });
});
