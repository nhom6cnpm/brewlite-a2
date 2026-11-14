import { getStoredToken, getStoredUser } from "@/lib/auth";
import { newIdempotencyKey } from "@/lib/idempotency";
import { createPayment, isId, requireToken, type PaymentMethod } from "./api";

export interface PaymentAttempt {
  orderId: string;
  method: PaymentMethod;
  idempotencyKey: string;
  paymentId?: string;
}

function storageKey(orderId: string, method: PaymentMethod): string {
  const owner = getStoredUser()?.id;
  if (!isId(owner)) throw new Error("Vui lòng đăng nhập lại để lưu lượt thanh toán.");
  return `${owner}:brewlite-payment-attempt:${orderId}:${method}`;
}

function readAttempt(key: string, orderId: string, method: PaymentMethod): PaymentAttempt | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "null");
    if (!value || typeof value !== "object") return null;
    const data = value as Partial<PaymentAttempt>;
    return data.orderId === orderId && data.method === method &&
      typeof data.idempotencyKey === "string" && data.idempotencyKey.trim().length > 0 &&
      data.idempotencyKey.length <= 128 && (data.paymentId === undefined || isId(data.paymentId))
      ? data as PaymentAttempt : null;
  } catch { return null; }
}

/** Scoped by account/order/method; a lost response keeps the same key after reload. */
export async function beginPaymentAttempt(
  orderId: string, method: PaymentMethod, signal?: AbortSignal, token = requireToken(),
) {
  const key = storageKey(orderId, method);
  const saved = readAttempt(key, orderId, method);
  const attempt: PaymentAttempt = saved ?? { orderId, method, idempotencyKey: newIdempotencyKey() };
  try { localStorage.setItem(key, JSON.stringify(attempt)); }
  catch { throw new Error("Không lưu được lượt thanh toán. Vui lòng kiểm tra bộ nhớ trình duyệt."); }
  const payment = await createPayment(orderId, method, attempt.idempotencyKey, signal, token);
  if (signal?.aborted || getStoredToken() !== token) throw new DOMException("Tài khoản đã thay đổi.", "AbortError");
  localStorage.setItem(key, JSON.stringify({ ...attempt, paymentId: payment.paymentId }));
  return payment;
}

/** Do not let an old terminal session remove a newer attempt for the same order. */
export function forgetPaymentAttempt(orderId: string, paymentId: string, token: string): void {
  if (getStoredToken() !== token) return;
  for (const method of ["WALLET", "CARD"] as const) {
    try {
      const key = storageKey(orderId, method);
      if (readAttempt(key, orderId, method)?.paymentId === paymentId) localStorage.removeItem(key);
    } catch { /* Storage is only a retry aid; the server remains authoritative. */ }
  }
}
