import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { QuoteVoucherDto } from './quote-voucher.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const item = { productId: 'p1', size: 'M', toppingIds: ['cream'], qty: 2 };
const parse = (value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: QuoteVoucherDto });

describe('API-T51 — voucher input validation', () => {
  it('normalizes manual codes and accepts the shared cart item shape', async () => {
    const result = await parse({ items: [item], voucherCode: '  nhap7k ' });
    expect(result.voucherCode).toBe('NHAP7K');
  });
  it.each([[], undefined, null])(
    'rejects an empty/missing cart: %p',
    async (items) => {
      await expect(parse({ items })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
  it.each([0, -1, 1.5, 100, '2'])(
    'rejects invalid quantities: %p',
    async (qty) => {
      await expect(parse({ items: [{ ...item, qty }] })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
  it('rejects duplicate toppings, invalid sizes and malformed codes', async () => {
    for (const payload of [
      { items: [{ ...item, toppingIds: ['cream', 'cream'] }] },
      { items: [{ ...item, toppingIds: ['not-a-topping'] }] },
      { items: [{ ...item, size: 'XL' }] },
      { items: [item], voucherCode: 'BAD CODE' },
      { items: [item], voucherCode: 'X'.repeat(33) },
      { items: [item], voucherCode: ['THU5K', 'BREW10'] },
    ])
      await expect(parse(payload)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('does not accept client totals, identity or unit prices', async () => {
    for (const payload of [
      { items: [item], subtotal: 100000 },
      { items: [item], userId: 'someone-else' },
      { items: [{ ...item, unitPrice: 1 }] },
    ])
      await expect(parse(payload)).rejects.toBeInstanceOf(BadRequestException);
  });
});
