export const SIZE_IDS = ['S', 'M', 'L'] as const;
export type ProductSize = (typeof SIZE_IDS)[number];

export const TOPPING_IDS = ['cream', 'pearls'] as const;
export type ToppingId = (typeof TOPPING_IDS)[number];