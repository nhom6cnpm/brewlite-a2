import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VouchersController } from './vouchers.controller';
import { VoucherCatalogService } from './voucher-catalog.service';

describe('API-T54 — public catalogue HTTP/Swagger', () => {
  it('publishes GET /vouchers and the catalogue response schema', async () => {
    const catalog = { list: jest.fn(async () => []) };
    const module = await Test.createTestingModule({
      controllers: [VouchersController],
      providers: [{ provide: VoucherCatalogService, useValue: catalog }],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('Test').setVersion('1').build(),
      );
      expect(document.paths['/vouchers'].get?.tags).toContain('vouchers');
      expect(document.components?.schemas?.PublicVoucherDto).toBeDefined();
      // An unfinished authenticated quote route must not be exposed as a working API.
      expect(document.paths['/vouchers/quote']).toBeUndefined();
      expect(await module.get(VouchersController).list()).toEqual([]);
      expect(catalog.list).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });
});
