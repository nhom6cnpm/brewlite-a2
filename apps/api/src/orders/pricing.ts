export const SIZE_IDS = ['S', 'M', 'L'] as const;
export type ProductSize = (typeof SIZE_IDS)[number];

export const TOPPING_IDS = ['t1', 't2', 't3', 't4', 'cream', 'pearls'] as const;
export type ToppingId = (typeof TOPPING_IDS)[number];