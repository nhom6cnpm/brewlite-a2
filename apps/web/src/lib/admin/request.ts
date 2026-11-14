import { clearAuth, getStoredToken } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/products";

/** HTTP error from a staff API; `status` lets pages tell 401/403 apart. */
export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function errorMessage(data: unknown, fallback: string): string {
  if (!isRecord(data)) return fallback;
  if (typeof data.message === "string" && data.message.trim())
    return data.message;
  if (Array.isArray(data.message)) {
    const parts = data.message.filter(
      (part): part is string => typeof part === "string",
    );
    if (parts.length) return parts.join(", ");
  }
  return fallback;
}

/**
 * Call a staff API with the given token. 401 logs out; a response that comes
 * back after the account changed is dropped instead of shown to the new user.
 */
export async function adminRequest(
  path: string,
  token: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    signal?: AbortSignal;
    fallback?: string;
  } = {},
): Promise<unknown> {
  const fallback = options.fallback ?? "Không tải được dữ liệu.";
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (cause) {
    if (options.signal?.aborted) throw cause;
    throw new AdminApiError(0, "Không kết nối được máy chủ. Vui lòng thử lại.");
  }
  const data: unknown = await response.json().catch(() => null);
  if (options.signal?.aborted || getStoredToken() !== token)
    throw new DOMException("Tài khoản đã thay đổi.", "AbortError");
  if (!response.ok) {
    if (response.status === 401) clearAuth();
    throw new AdminApiError(response.status, errorMessage(data, fallback));
  }
  return data;
}
