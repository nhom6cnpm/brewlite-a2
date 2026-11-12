import { getApiBaseUrl } from "./products";
import { sizeOptions, toppingOptions, type ProductSize } from "./productOptions";

export interface AvailabilityLine {
  productId: string;
  size: ProductSize;
  toppingIds: readonly string[];
  qty: number;
}

export interface CartAvailability {
  available: boolean;
  items: (AvailabilityLine & { stock: number })[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sameToppings(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value) && value.every((id) => typeof id === "string") &&
    JSON.stringify([...value].sort()) === JSON.stringify([...expected].sort());
}

function errorMessage(data: unknown): string {
  if (isRecord(data)) {
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (Array.isArray(data.message)) {
      const message = data.message.filter((part) => typeof part === "string").join(", ");
      if (message) return message;
    }
  }
  return "Không kiểm tra được số ly còn bán. Vui lòng thử lại.";
}

/** Contract from A1 92a43f4; the real endpoint is provided by A2 issue #28. */
export async function getCartAvailability(
  lines: readonly AvailabilityLine[],
  signal?: AbortSignal,
): Promise<CartAvailability> {
  if (lines.length === 0 || lines.some((line) =>
    !line.productId.trim() || !sizeOptions.some((size) => size.id === line.size) ||
    !Number.isSafeInteger(line.qty) || line.qty < 1 || line.qty > 99 ||
    new Set(line.toppingIds).size !== line.toppingIds.length ||
    line.toppingIds.some((id) => !toppingOptions.some((topping) => topping.id === id))
  )) {
    throw new Error("Lựa chọn món không hợp lệ. Vui lòng kiểm tra lại giỏ hàng.");
  }
  const items = lines.map(({ productId, size, toppingIds, qty }) => ({
    productId, size, toppingIds: [...toppingIds].sort(), qty,
  }));
  const response = await fetch(`${getApiBaseUrl()}/products/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
    signal,
    body: JSON.stringify({ items }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(data));
  if (!isRecord(data) || typeof data.available !== "boolean" ||
    !Array.isArray(data.items) || data.items.length !== items.length) {
    throw new Error("Phản hồi số ly còn bán không đúng định dạng.");
  }
  const results = data.items.map((value: unknown, index: number) => {
    const requested = items[index];
    if (!isRecord(value) || value.productId !== requested.productId ||
      value.size !== requested.size || value.qty !== requested.qty ||
      !sameToppings(value.toppingIds, requested.toppingIds) ||
      typeof value.stock !== "number" || !Number.isSafeInteger(value.stock) || value.stock < 0) {
      throw new Error("Phản hồi số ly còn bán không đúng định dạng.");
    }
    return { ...requested, stock: value.stock };
  });
  if (data.available !== results.every((item) => item.qty <= item.stock)) {
    throw new Error("Phản hồi số ly còn bán không nhất quán.");
  }
  return { available: data.available, items: results };
}
