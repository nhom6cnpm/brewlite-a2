import { parseOrder } from "@/lib/orders/history";
import { adminRequest, isRecord } from "./request";
import type { Order, OrderStatus } from "@/types/order";

export interface AdminOrder extends Order {
  customerEmail: string | null;
}
export interface AdminOrderPage {
  items: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
}
export interface AdminPaymentRecord {
  paymentId: string;
  method: "WALLET" | "CARD";
  status: "PENDING" | "TRANSFER_RECEIVED" | "SUCCESS" | "FAILED";
  amount: number;
  createdAt: string;
  receivedAt: string | null;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  reviewNote: string | null;
}
export interface AdminOrderDetail extends AdminOrder {
  cancelReviewedByEmail: string | null;
  payments: AdminPaymentRecord[];
}

const nullableText = (v: unknown): v is string | null =>
  v === null || typeof v === "string";
const date = (v: unknown): v is string =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const nullableDate = (v: unknown) => v === null || date(v);
const integer = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const invalid = () =>
  new Error("Dữ liệu lịch sử quản trị chưa hợp lệ. Vui lòng thử lại.");

function withEmail(value: unknown): AdminOrder {
  if (!isRecord(value) || !nullableText(value.customerEmail)) throw invalid();
  return { ...parseOrder(value), customerEmail: value.customerEmail };
}

export async function listAdminOrders(
  filters: { status?: OrderStatus | ""; q?: string; page: number },
  token: string,
  signal?: AbortSignal,
): Promise<AdminOrderPage> {
  const params = new URLSearchParams({ page: String(filters.page) });
  if (filters.status) params.set("status", filters.status);
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  const data = await adminRequest(`/admin/orders/history?${params}`, token, {
    signal,
  });
  if (
    !isRecord(data) ||
    !Array.isArray(data.items) ||
    !integer(data.total) ||
    !integer(data.page) ||
    data.page !== filters.page ||
    !integer(data.pageSize) ||
    data.pageSize < 1 ||
    data.pageSize > 50 ||
    data.items.length > data.pageSize ||
    data.total < data.items.length
  )
    throw invalid();
  return {
    items: data.items.map(withEmail),
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
  };
}

function payment(value: unknown): AdminPaymentRecord {
  if (
    !isRecord(value) ||
    typeof value.paymentId !== "string" ||
    !value.paymentId ||
    (value.method !== "WALLET" && value.method !== "CARD") ||
    !["PENDING", "TRANSFER_RECEIVED", "SUCCESS", "FAILED"].includes(
      String(value.status),
    ) ||
    !integer(value.amount) ||
    !date(value.createdAt) ||
    !nullableDate(value.receivedAt) ||
    !nullableDate(value.reviewedAt) ||
    !nullableText(value.reviewedByEmail) ||
    !nullableText(value.reviewNote)
  )
    throw invalid();
  return {
    paymentId: value.paymentId,
    method: value.method,
    status: value.status as AdminPaymentRecord["status"],
    amount: value.amount,
    createdAt: value.createdAt,
    receivedAt: value.receivedAt as string | null,
    reviewedAt: value.reviewedAt as string | null,
    reviewedByEmail: value.reviewedByEmail,
    reviewNote: value.reviewNote,
  };
}

export async function getAdminOrderDetail(
  id: string,
  token: string,
  signal?: AbortSignal,
): Promise<AdminOrderDetail> {
  const data = await adminRequest(
    `/admin/orders/${encodeURIComponent(id)}/detail`,
    token,
    { signal },
  );
  if (
    !isRecord(data) ||
    data.id !== id ||
    !Array.isArray(data.payments) ||
    !nullableText(data.cancelReviewedByEmail)
  )
    throw invalid();
  return {
    ...withEmail(data),
    cancelReviewedByEmail: data.cancelReviewedByEmail,
    payments: data.payments.map(payment),
  };
}
