import { clearAuth, getStoredToken } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/products";
import { OrderApiError, parseOrder } from "./history";
import type { Order } from "@/types/order";

async function call(
  path: string,
  token: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    cache: "no-store",
    signal,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (signal?.aborted || getStoredToken() !== token)
    throw new DOMException("Tài khoản đã thay đổi.", "AbortError");
  if (!response.ok) {
    if (response.status === 401) clearAuth();
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? data.message
        : null;
    const errorMessage = Array.isArray(message)
      ? message.filter((part) => typeof part === "string").join(" ")
      : message;
    throw new OrderApiError(
      response.status,
      typeof errorMessage === "string"
        ? errorMessage
        : "Không xử lý được yêu cầu. Vui lòng thử lại.",
    );
  }
  return data;
}

export async function cancelOwnOrder(id: string, token: string): Promise<void> {
  await call(`/orders/${encodeURIComponent(id)}/cancel`, token, {});
}
export async function requestCancellation(
  id: string,
  reason: string,
  token: string,
): Promise<Order> {
  return parseOrder(
    await call(`/orders/${encodeURIComponent(id)}/cancel-request`, token, {
      reason,
    }),
  );
}
