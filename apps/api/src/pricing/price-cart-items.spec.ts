import { EntityManager } from 'typeorm';
import { priceCartItems, type PriceableCartItem } from './price-cart-items';
import { calculateUnitPrice } from './product-options';

const product = {
  id: 'p1',
  name: 'Americano',
  price: 30000,
  imageUrl: '/images/americano.jpg',
};
const item: PriceableCartItem = {
  productId: 'p1',
  size: 'S',
  toppingIds: [],
  qty: 1,
};
function fixture(products = [product]) {
  const findBy = jest.fn(async () => products);
  return {
    findBy,
    manager: { getRepository: () => ({ findBy }) } as unknown as EntityManager,
  };
}

describe('API-T55 — shared server cart pricing from A1', () => {
  it.each([
    ['S', 30000],
    ['M', 35000],
    ['L', 40000],
  ] as const)('prices size %s using the agreed surcharge', (size, expected) => {
    expect(calculateUnitPrice(30000, size, [])).toBe(expected);
  });
  it('adds both toppings once and quantity, using DB base prices', async () => {
    const f = fixture();
    expect(
      await priceCartItems(f.manager, [
        { ...item, size: 'M', toppingIds: ['cream', 'pearls'], qty: 2 },
      ]),
    ).toMatchObject({
      subtotal: 90000,
      lines: [{ unitPrice: 45000, lineTotal: 90000, productName: 'Americano' }],
    });
  });
  it('uses one product snapshot for repeated products with different options', async () => {
    const f = fixture();
    expect(
      (
        await priceCartItems(f.manager, [
          item,
          { ...item, size: 'L', toppingIds: ['cream'], qty: 2 },
        ])
      ).subtotal,
    ).toBe(120000);
    expect(f.findBy).toHaveBeenCalledTimes(1);
  });
  it('rejects a product missing from the database', async () => {
    await expect(priceCartItems(fixture([]).manager, [item])).rejects.toThrow(
      /không tồn tại/,
    );
  });
  it.each([{ items: [] }, { items: Array.from({ length: 101 }, () => item) }])(
    'rejects empty or overlong carts %#',
    async ({ items }) => {
      await expect(priceCartItems(fixture().manager, items)).rejects.toThrow(
        /1 đến 100/,
      );
    },
  );
  it.each([0, -1, 1.5, 100])(
    'rejects invalid quantity %s even for internal callers',
    async (qty) => {
      await expect(
        priceCartItems(fixture().manager, [{ ...item, qty }]),
      ).rejects.toThrow(/1 đến 99/);
    },
  );
  it('does not charge a duplicated topping or accept unsupported choices', async () => {
    for (const invalid of [
      { ...item, toppingIds: ['cream', 'cream'] },
      { ...item, toppingIds: ['unknown'] },
      { ...item, size: 'XL' },
    ])
      await expect(
        priceCartItems(fixture().manager, [invalid as PriceableCartItem]),
      ).rejects.toThrow(/không hợp lệ/);
  });
  it.each([-1, 0.5, Number.NaN])(
    'rejects invalid stored prices %s',
    async (price) => {
      await expect(
        priceCartItems(fixture([{ ...product, price }]).manager, [item]),
      ).rejects.toThrow(/Giá sản phẩm/);
    },
  );
  it('rejects totals above PostgreSQL integer limits, including across lines', async () => {
    const f = fixture([{ ...product, price: 1_100_000_000 }]);
    await expect(priceCartItems(f.manager, [item, item])).rejects.toThrow(
      /vượt giới hạn/,
    );
    await expect(
      priceCartItems(f.manager, [{ ...item, qty: 2 }]),
    ).rejects.toThrow(/vượt giới hạn/);
  });
});
