import { clearAuth, getStoredToken } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/products";

export type PaymentMethod = "WALLET" | "CARD";
export const PAYMENT_STATUSES = ["PENDING", "TRANSFER_RECEIVED", "SUCCESS", "FAILED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const ORDER_STATUSES = ["PENDING", "PAYMENT_FAILED", "PAID", "PREPARING", "READY", "COMPLETED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface PaymentDetails {
  paymentId: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  orderStatus: OrderStatus | null;
  receivedAt: string | null;
  reviewNote: string | null;
  cancellationPending: boolean;
  createdAt: string;
  expiresAt: string | null;
  serverTime: string;
}

/** Minimal order view needed by the picker; full order pages belong to issue #37. */
export interface PaymentOrder {
  id: string;
  total: number;
  status: OrderStatus;
  expiresAt: string;
  serverTime: string;
  canPay: boolean;
  transferReceived: boolean;
  cancellationPending: boolean;
}

export class PaymentApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PaymentApiError";
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
export const isDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
export const isMoney = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
export const isId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9-]{1,64}$/.test(value);
const nullableDate = (value: unknown): value is string | null => value === null || isDate(value);

export function requireToken(): string {
  const token = getStoredToken();
  if (!token) throw new PaymentApiError("Vui lòng đăng nhập để thanh toán.", 401);
  return token;
}

function unchangedSession(token: string, signal?: AbortSignal): void {
  if (signal?.aborted || getStoredToken() !== token) {
    throw new DOMException("Phiên đăng nhập đã thay đổi.", "AbortError");
  }
}

export async function readResponse(response: Response, fallback: string): Promise<unknown> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    let message = fallback;
    if (isRecord(data)) {
      if (typeof data.message === "string" && data.message.trim()) message = data.message;
      if (Array.isArray(data.message)) {
        message = data.message.filter((part) => typeof part === "string").join(", ") || fallback;
      }
    }
    throw new PaymentApiError(message, response.status);
  }
  return data;
}

async function authenticatedRequest(
  path: string, token: string, signal?: AbortSignal, init: RequestInit = {},
): Promise<unknown> {
  unchangedSession(token, signal);
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init, signal, cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...init.headers },
    });
  } catch {
    unchangedSession(token, signal);
    throw new Error("Không kết nối được máy chủ thanh toán. Vui lòng thử lại.");
  }
  unchangedSession(token, signal);
  try {
    const data = await readResponse(response, "Không kết nối được thông tin thanh toán. Vui lòng thử lại.");
    unchangedSession(token, signal);
    return data;
  } catch (error) {
    unchangedSession(token, signal);
    if (error instanceof PaymentApiError && error.status === 401) clearAuth();
    throw error;
  }
}

export function parsePayment(data: unknown): PaymentDetails {
  if (!isRecord(data) || !isId(data.paymentId) || !isId(data.orderId) || !isMoney(data.amount) ||
    (data.method !== "WALLET" && data.method !== "CARD") ||
    !PAYMENT_STATUSES.includes(data.status as PaymentStatus) ||
    !(data.orderStatus === null || ORDER_STATUSES.includes(data.orderStatus as OrderStatus)) ||
    !nullableDate(data.receivedAt) || !(data.reviewNote === null || typeof data.reviewNote === "string") ||
    typeof data.cancellationPending !== "boolean" || !isDate(data.createdAt) ||
    !nullableDate(data.expiresAt) || !isDate(data.serverTime) ||
    (data.status === "TRANSFER_RECEIVED" && (data.method !== "WALLET" || !isDate(data.receivedAt)))) {
    throw new Error("Phản hồi thanh toán không đúng định dạng.");
  }
  return data as unknown as PaymentDetails;
}

export async function createPayment(
  orderId: string, method: PaymentMethod, idempotencyKey: string,
  signal?: AbortSignal, token = requireToken(),
): Promise<PaymentDetails> {
  if (!isId(orderId) || !["WALLET", "CARD"].includes(method) ||
    !idempotencyKey.trim() || idempotencyKey.length > 128) {
    throw new Error("Thông tin yêu cầu thanh toán không hợp lệ.");
  }
  const payment = parsePayment(await authenticatedRequest("/payments", token, signal, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ orderId, method }),
  }));
  if (payment.orderId !== orderId) throw new Error("Phiên thanh toán không khớp đơn hàng.");
  return payment;
}

export async function getPayment(
  paymentId: string, signal?: AbortSignal, token = requireToken(),
): Promise<PaymentDetails> {
  if (!isId(paymentId)) throw new Error("Mã thanh toán không hợp lệ.");
  const payment = parsePayment(await authenticatedRequest(`/payments/${encodeURIComponent(paymentId)}`, token, signal));
  if (payment.paymentId !== paymentId) throw new Error("Phiên thanh toán trả về không khớp yêu cầu.");
  return payment;
}

export async function getPaymentOrder(
  orderId: string, signal?: AbortSignal, token = requireToken(),
): Promise<PaymentOrder> {
  if (!isId(orderId)) throw new Error("Mã đơn không hợp lệ.");
  const data = await authenticatedRequest(`/orders/${encodeURIComponent(orderId)}`, token, signal);
  if (!isRecord(data) || data.id !== orderId || !isMoney(data.total) ||
    !ORDER_STATUSES.includes(data.status as OrderStatus) || !isDate(data.expiresAt) ||
    !isDate(data.serverTime) || typeof data.canPay !== "boolean" ||
    typeof data.transferReceived !== "boolean" ||
    !(data.cancelRequest === null || (isRecord(data.cancelRequest) && typeof data.cancelRequest.status === "string"))) {
    throw new Error("Thông tin đơn hàng không đúng định dạng.");
  }
  return {
    id: orderId, total: data.total, status: data.status as OrderStatus,
    expiresAt: data.expiresAt, serverTime: data.serverTime, canPay: data.canPay,
    transferReceived: data.transferReceived,
    cancellationPending: isRecord(data.cancelRequest) && data.cancelRequest.status === "PENDING",
  };
}

export const isPaidOrder = (status: OrderStatus | null) =>
  status !== null && ["PAID", "PREPARING", "READY", "COMPLETED"].includes(status);

export function shouldPollPayment(payment: PaymentDetails | undefined): boolean {
  if (!payment) return false;
  if (payment.orderStatus === "CANCELLED" || isPaidOrder(payment.orderStatus)) return false;
  // A failed attempt can still belong to a live PAYMENT_FAILED order. Keep
  // following that order until it is paid elsewhere or cancelled on expiry.
  return true;
}
