// A1 commit 92a43f4; values match Mai's PR #45 lib/productOptions.ts.
// Server quotes and order creation must reuse this module, not client unitPrice.
export const SIZE_SURCHARGE = { S: 0, M: 5000, L: 10000 } as const;
export const TOPPING_PRICES = { cream: 5000, pearls: 5000 } as const;

export type ProductSize = keyof typeof SIZE_SURCHARGE;
export type ToppingId = keyof typeof TOPPING_PRICES;

export const SIZE_IDS = Object.keys(SIZE_SURCHARGE) as ProductSize[];
export const TOPPING_IDS = Object.keys(TOPPING_PRICES) as ToppingId[];

export function calculateUnitPrice(
  basePrice: number,
  size: ProductSize,
  toppingIds: readonly ToppingId[],
): number {
  const toppingPrice = toppingIds.reduce(
    (sum, id) => sum + TOPPING_PRICES[id],
    0,
  );
  return basePrice + SIZE_SURCHARGE[size] + toppingPrice;
}
