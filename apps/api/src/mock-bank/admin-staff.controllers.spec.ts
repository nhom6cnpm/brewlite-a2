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
import { AdminInventoryController } from '../inventory/admin-inventory.controller';
import { InventoryService } from '../inventory/inventory.service';
import { AdminBankController } from './admin-bank.controller';
import { BankLedgerService } from './bank-ledger.service';
import { ListBankTransactionsDto } from './dto/bank-transaction.dto';

type StaffController =
  typeof AdminBankController | typeof AdminInventoryController;

const canCall = (
  controller: StaffController,
  handler: string,
  role: UserRole,
) => {
  const guard = new RolesGuard(new Reflector());
  const context = {
    getHandler: () =>
      (controller.prototype as unknown as Record<string, unknown>)[handler],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
  return () => guard.canActivate(context);
};

describe('API-T37 Sao kê và nguyên liệu cho nhân viên (#39)', () => {
  it.each([
    [AdminBankController, 'list'],
    [AdminInventoryController, 'overview'],
  ] as const)('%p: CUSTOMER bị 403, ADMIN được gọi', (controller, handler) => {
    expect(canCall(controller, handler, 'CUSTOMER')).toThrow(
      ForbiddenException,
    );
    expect(canCall(controller, handler, 'ADMIN')()).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('sao kê: lọc theo mã đơn đã cắt khoảng trắng, rỗng thì lấy tất cả', async () => {
    const ledger = { list: jest.fn(async () => []) };
    const controller = new AdminBankController(
      ledger as unknown as BankLedgerService,
    );
    await controller.list({ orderId: '  ORD-1  ' });
    await controller.list({ orderId: '   ' });
    await controller.list({});
    expect(ledger.list.mock.calls).toEqual([
      ['ORD-1'],
      [undefined],
      [undefined],
    ]);
  });

  it('nguyên liệu: trả đúng bảng tổng hợp của InventoryService', async () => {
    const overview = { lowStockCups: 10, ingredients: [], products: [] };
    const inventory = { getAdminOverview: jest.fn(async () => overview) };
    await expect(
      new AdminInventoryController(
        inventory as unknown as InventoryService,
      ).overview(),
    ).resolves.toBe(overview);
  });

  it('validate: orderId tối đa 64 ký tự', async () => {
    const errors = await validate(
      plainToInstance(ListBankTransactionsDto, { orderId: 'x'.repeat(65) }),
    );
    expect(errors.flatMap((e) => Object.values(e.constraints ?? {}))).toEqual([
      'orderId tối đa 64 ký tự',
    ]);
  });

  it('có mô tả Swagger cho cả hai API', async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminBankController, AdminInventoryController],
      providers: [
        { provide: BankLedgerService, useValue: {} },
        { provide: InventoryService, useValue: {} },
      ],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      const doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('Test').build(),
      );
      const bank = doc.paths['/admin/bank-transactions'].get!;
      const stock = doc.paths['/admin/ingredients'].get!;
      for (const op of [bank, stock]) {
        expect(op.security).toContainEqual({ 'JWT-auth': [] });
        expect(op.responses['403']).toBeDefined();
      }
      expect(bank.parameters).toContainEqual(
        expect.objectContaining({ name: 'orderId', in: 'query' }),
      );
      expect(doc.components?.schemas?.BankTransactionDto).toBeDefined();
      expect(doc.components?.schemas?.InventoryOverviewDto).toBeDefined();
    } finally {
      await app.close();
    }
  });
});
