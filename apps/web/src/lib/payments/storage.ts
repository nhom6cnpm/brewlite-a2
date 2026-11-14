import { getStoredToken, getStoredUser } from "@/lib/auth";
import { getLineKey, type CartItem } from "@/store/useCart";
import { newIdempotencyKey } from "@/lib/idempotency";

export interface CheckoutSnapshot {
  orderId: string;
  total: number;
  createdAt: string;
  expiresAt?: string | null;
  cartFingerprint: string;
}

const checkoutKey = (orderId: string) => `brewlite-checkout:${orderId}`;
const activeCheckoutKey = "brewlite-active-checkout";
const orderAttemptKey = "brewlite-order-attempt";

interface OrderAttempt {
  cartFingerprint: string;
  voucherCode: string;
  idempotencyKey: string;
}

function scopedKey(key: string): string | null {
  const owner = getStoredUser()?.id;
  return getStoredToken() && owner ? `${owner}:${key}` : null;
}

export const getCartFingerprint = (
  items: Pick<CartItem, "productId" | "size" | "toppingIds" | "qty">[],
) =>
  JSON.stringify(
    items
      .map((item) => ({ key: getLineKey(item), qty: item.qty }))
      .sort((left, right) => left.key.localeCompare(right.key)),
  );

function readStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const scoped = scopedKey(key);
  if (!scoped) return null;
  try {
    const value = localStorage.getItem(scoped);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown): void {
  const scoped = scopedKey(key);
  if (typeof window !== "undefined" && scoped)
    localStorage.setItem(scoped, JSON.stringify(value));
}

export function getOrderRequestKey(
  cartFingerprint: string,
  voucherCode: string,
): string {
  const saved = readStored<OrderAttempt>(orderAttemptKey);
  if (
    saved?.cartFingerprint === cartFingerprint &&
    saved.voucherCode === voucherCode &&
    typeof saved.idempotencyKey === "string" &&
    saved.idempotencyKey.length > 0
  )
    return saved.idempotencyKey;
  const idempotencyKey = newIdempotencyKey();
  writeStored(orderAttemptKey, {
    cartFingerprint,
    voucherCode,
    idempotencyKey,
  } satisfies OrderAttempt);
  return idempotencyKey;
}

export function clearOrderRequestKey(): void {
  const scoped = scopedKey(orderAttemptKey);
  if (typeof window !== "undefined" && scoped) localStorage.removeItem(scoped);
}

export function saveCheckout(snapshot: CheckoutSnapshot): void {
  writeStored(checkoutKey(snapshot.orderId), snapshot);
  writeStored(activeCheckoutKey, snapshot);
}

export function getCheckout(orderId: string): CheckoutSnapshot | null {
  const snapshot = readStored<CheckoutSnapshot>(checkoutKey(orderId));
  return snapshot?.orderId === orderId &&
    Number.isFinite(snapshot.total) &&
    Number.isFinite(Date.parse(snapshot.createdAt))
    ? snapshot
    : null;
}

export function getActiveCheckout(
  cartFingerprint: string,
): CheckoutSnapshot | null {
  const snapshot = readStored<CheckoutSnapshot>(activeCheckoutKey);
  if (!snapshot || snapshot.cartFingerprint !== cartFingerprint) return null;
  const saved = getCheckout(snapshot.orderId);
  return saved;
}

export function clearActiveCheckout(orderId: string): void {
  const active = readStored<CheckoutSnapshot>(activeCheckoutKey);
  const scoped = scopedKey(activeCheckoutKey);
  if (active?.orderId === orderId && typeof window !== "undefined" && scoped)
    localStorage.removeItem(scoped);
}