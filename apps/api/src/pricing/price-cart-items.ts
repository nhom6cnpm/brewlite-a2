import { BadRequestException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Product } from '../products/product.entity';
import {
  calculateUnitPrice,
  SIZE_IDS,
  TOPPING_IDS,
  type ProductSize,
  type ToppingId,
} from './product-options';

export interface PriceableCartItem {
  productId: string;
  size: ProductSize;
  toppingIds: readonly ToppingId[];
  qty: number;
}

/** A1 priceOrderItems adapted for reuse, without an OrdersModule dependency. */
export async function priceCartItems(
  manager: EntityManager,
  items: readonly PriceableCartItem[],
) {
  if (items.length === 0 || items.length > 100)
    throw new BadRequestException('Giỏ hàng phải có từ 1 đến 100 dòng.');
  for (const item of items) {
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99)
      throw new BadRequestException('Số lượng phải là số nguyên từ 1 đến 99.');
    if (
      !SIZE_IDS.includes(item.size) ||
      item.toppingIds.some((id) => !TOPPING_IDS.includes(id)) ||
      new Set(item.toppingIds).size !== item.toppingIds.length
    )
      throw new BadRequestException('Size hoặc topping không hợp lệ.');
  }
  // Load each product once so duplicate lines share the same DB price snapshot.
  const products = await manager
    .getRepository(Product)
    .findBy({ id: In([...new Set(items.map((item) => item.productId))]) });
  const byId = new Map(products.map((product) => [product.id, product]));
  let subtotal = 0;
  const lines = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product)
      throw new BadRequestException(
        `Sản phẩm ${item.productId} không tồn tại.`,
      );
    if (!Number.isSafeInteger(product.price) || product.price < 0)
      throw new BadRequestException('Giá sản phẩm không hợp lệ.');
    const unitPrice = calculateUnitPrice(
      product.price,
      item.size,
      item.toppingIds,
    );
    const lineTotal = unitPrice * item.qty;
    subtotal += lineTotal;
    if (!Number.isSafeInteger(subtotal) || subtotal > 2_147_483_647)
      throw new BadRequestException(
        'Tổng tiền giỏ hàng vượt giới hạn lưu trữ.',
      );
    return {
      productId: item.productId,
      size: item.size,
      toppingIds: [...item.toppingIds],
      qty: item.qty,
      productName: product.name,
      productImageUrl: product.imageUrl,
      unitPrice,
      lineTotal,
    };
  });
  return { subtotal, lines };
}
