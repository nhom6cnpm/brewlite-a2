import { getApiBaseUrl } from "@/lib/products";

/** Structural subset of CartItem in Mai's PR #45; no dependency on her store. */
export interface VoucherCartItem {
  productId: string;
  size: "S" | "M" | "L";
  toppingIds: string[];
  qty: number;
}

export type VoucherQuoteRequest = (
  items: VoucherCartItem[],
  code?: string,
  signal?: AbortSignal,
  token?: string | null,
) => Promise<VoucherQuote>;

export interface VoucherUsage {
  maxUsesPerUser: number;
  reservedUses: number;
  usedUses: number;
  availableUses: number;
}

export interface VoucherOption {
  code: string;
  title: string;
  discountType: "FIXED" | "PERCENT";
  discountValue: number;
  minSubtotal: number;
  maxDiscount: number | null;
  startsAt: string;
  endsAt: string;
  unavailableReason: string | null;
  discount: number;
  maxUsesPerUser: number;
  usage: VoucherUsage | null;
}

export interface VoucherQuote {
  subtotal: number;
  discount: number;
  total: number;
  voucherCode: string | null;
  voucherTitle: string | null;
  serverTime: string;
  vouchers: VoucherOption[];
  voucherUsage: VoucherUsage | null;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const nonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const nullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";
function isUsage(value: unknown): value is VoucherUsage {
  return (
    record(value) &&
    nonnegative(value.maxUsesPerUser) &&
    value.maxUsesPerUser > 0 &&
    nonnegative(value.reservedUses) &&
    nonnegative(value.usedUses) &&
    nonnegative(value.availableUses) &&
    value.availableUses ===
      Math.max(0, value.maxUsesPerUser - value.reservedUses - value.usedUses)
  );
}
function isOption(value: unknown): value is VoucherOption {
  return (
    record(value) &&
    typeof value.code === "string" &&
    typeof value.title === "string" &&
    (value.discountType === "FIXED" || value.discountType === "PERCENT") &&
    nonnegative(value.discountValue) &&
    value.discountValue > 0 &&
    nonnegative(value.minSubtotal) &&
    (value.maxDiscount === null || nonnegative(value.maxDiscount)) &&
    date(value.startsAt) &&
    date(value.endsAt) &&
    nullableString(value.unavailableReason) &&
    nonnegative(value.discount) &&
    nonnegative(value.maxUsesPerUser) &&
    value.maxUsesPerUser > 0 &&
    (value.usage === null ||
      (isUsage(value.usage) &&
        value.usage.maxUsesPerUser === value.maxUsesPerUser))
  );
}

export async function quoteVoucher(
  items: VoucherCartItem[],
  voucherCode?: string,
  signal?: AbortSignal,
  token: string | null = null,
): Promise<VoucherQuote> {
  const response = await fetch(`${getApiBaseUrl()}/vouchers/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    signal,
    body: JSON.stringify({
      items: items.map(({ productId, size, toppingIds, qty }) => ({
        productId,
        size,
        toppingIds,
        qty,
      })),
      ...(voucherCode ? { voucherCode } : {}),
    }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (signal?.aborted)
    throw new DOMException("Yêu cầu đã được hủy.", "AbortError");
  if (!response.ok) {
    const message =
      record(data) && Array.isArray(data.message)
        ? data.message.filter((part) => typeof part === "string").join(" ")
        : record(data)
          ? data.message
          : null;
    throw new Error(
      typeof message === "string"
        ? message
        : "Không kiểm tra được mã giảm giá. Vui lòng thử lại.",
    );
  }
  if (
    !record(data) ||
    !nonnegative(data.subtotal) ||
    !nonnegative(data.discount) ||
    !nonnegative(data.total) ||
    data.total !== data.subtotal - data.discount ||
    !date(data.serverTime) ||
    !Array.isArray(data.vouchers) ||
    !data.vouchers.every(isOption) ||
    !nullableString(data.voucherCode) ||
    !nullableString(data.voucherTitle) ||
    !(data.voucherUsage === null || isUsage(data.voucherUsage)) ||
    (data.voucherCode === null) !== (data.voucherTitle === null) ||
    (data.voucherCode === null &&
      (data.discount !== 0 || data.voucherUsage !== null)) ||
    (voucherCode && data.voucherCode !== voucherCode.trim().toUpperCase())
  )
    throw new Error("Dữ liệu ưu đãi chưa hợp lệ. Vui lòng thử lại.");
  return {
    subtotal: data.subtotal,
    discount: data.discount,
    total: data.total,
    voucherCode: data.voucherCode,
    voucherTitle: data.voucherTitle,
    serverTime: data.serverTime,
    vouchers: data.vouchers,
    voucherUsage: data.voucherUsage,
  };
}
