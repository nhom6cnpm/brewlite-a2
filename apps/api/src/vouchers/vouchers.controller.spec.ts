import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VouchersController } from './vouchers.controller';
import { VoucherCatalogService } from './voucher-catalog.service';
import { VoucherCartQuoteService } from './voucher-cart-quote.service';

describe('API-T54 — public catalogue HTTP/Swagger', () => {
  it('publishes GET /vouchers and the catalogue response schema', async () => {
    const catalog = { list: jest.fn(async () => []) };
    const module = await Test.createTestingModule({
      controllers: [VouchersController],
      providers: [
        { provide: VoucherCatalogService, useValue: catalog },
        {
          provide: VoucherCartQuoteService,
          useValue: { quote: jest.fn() },
        },
      ],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('Test')
          .setVersion('1')
          .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'JWT-auth')
          .build(),
      );
      expect(document.paths['/vouchers'].get?.tags).toContain('vouchers');
      expect(document.components?.schemas?.PublicVoucherDto).toBeDefined();
      expect(
        document.paths['/vouchers/quote'].post?.responses['200'],
      ).toBeDefined();
      expect(
        document.paths['/vouchers/quote'].post?.responses['401'],
      ).toBeDefined();
      expect(document.components?.schemas?.VoucherQuoteDto).toBeDefined();
      expect(document.components?.schemas?.QuoteVoucherDto).toBeDefined();
      expect(document.paths['/vouchers/quote'].post?.security).toContainEqual({
        'JWT-auth': [],
      });
      expect(await module.get(VouchersController).list()).toEqual([]);
      expect(catalog.list).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });
});
