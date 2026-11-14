import { adminRequest, isRecord } from "./request";

export const PAYMENT_STATUSES = [
  "PENDING",
  "TRANSFER_RECEIVED",
  "SUCCESS",
  "FAILED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = "WALLET" | "CARD";
export type AdminPaymentFilter = "ACTIVE" | "ALL" | PaymentStatus;

/** One row of GET /admin/payments (#34). */
export interface AdminPayment {
  paymentId: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  orderStatus: string | null;
  receivedAt: string | null;
  reviewNote: string | null;
  cancellationPending: boolean;
  createdAt: string;
  expiresAt: string | null;
  serverTime: string;
  customerEmail: string | null;
  itemCount: number;
  reviewedAt: string | null;
}

const text = (value: unknown) => (typeof value === "string" ? value : null);
const isDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

export function parseAdminPayment(row: unknown): AdminPayment {
  if (
    !isRecord(row) ||
    typeof row.paymentId !== "string" ||
    typeof row.orderId !== "string" ||
    typeof row.amount !== "number" ||
    (row.method !== "WALLET" && row.method !== "CARD") ||
    !PAYMENT_STATUSES.includes(row.status as PaymentStatus) ||
    !isDate(row.createdAt) ||
    !isDate(row.serverTime)
  )
    throw new Error("Phản hồi thanh toán không đúng định dạng.");
  return {
    paymentId: row.paymentId,
    orderId: row.orderId,
    amount: row.amount,
    method: row.method,
    status: row.status as PaymentStatus,
    orderStatus: text(row.orderStatus),
    receivedAt: isDate(row.receivedAt) ? row.receivedAt : null,
    reviewNote: text(row.reviewNote),
    cancellationPending: row.cancellationPending === true,
    createdAt: row.createdAt,
    expiresAt: isDate(row.expiresAt) ? row.expiresAt : null,
    serverTime: row.serverTime,
    customerEmail: text(row.customerEmail),
    itemCount: typeof row.itemCount === "number" ? row.itemCount : 0,
    reviewedAt: isDate(row.reviewedAt) ? row.reviewedAt : null,
  };
}

export async function listAdminPayments(
  token: string,
  filter: AdminPaymentFilter,
  orderId = "",
  signal?: AbortSignal,
): Promise<AdminPayment[]> {
  const params = new URLSearchParams({ status: filter });
  if (orderId.trim()) params.set("orderId", orderId.trim());
  const data = await adminRequest(`/admin/payments?${params.toString()}`, token, {
    signal,
    fallback: "Không tải được danh sách thanh toán.",
  });
  if (!Array.isArray(data))
    throw new Error("Phản hồi danh sách thanh toán không đúng định dạng.");
  return data.map(parseAdminPayment);
}

/** Staff decision; the backend locks the order and checks the state machine. */
export async function reviewPayment(
  token: string,
  paymentId: string,
  decision: "confirm" | "reject",
  note?: string,
): Promise<AdminPayment> {
  const data = await adminRequest(
    `/admin/payments/${encodeURIComponent(paymentId)}/${decision}`,
    token,
    {
      method: "POST",
      body: note?.trim() ? { note: note.trim() } : {},
      fallback: "Không xử lý được thanh toán. Vui lòng thử lại.",
    },
  );
  // The review response has no customer/item columns: fill neutral values
  return parseAdminPayment({ customerEmail: null, itemCount: 0, ...(data as object) });
}

/** One line of the shop's statement in the mock bank. */
export interface BankTransaction {
  id: string;
  type: "IN" | "REFUND";
  amount: number;
  orderId: string;
  paymentId: string | null;
  content: string;
  createdAt: string;
}

export async function listBankTransactions(
  token: string,
  orderId = "",
  signal?: AbortSignal,
): Promise<BankTransaction[]> {
  const params = new URLSearchParams();
  if (orderId.trim()) params.set("orderId", orderId.trim());
  const data = await adminRequest(
    `/admin/bank-transactions${params.size ? `?${params.toString()}` : ""}`,
    token,
    { signal, fallback: "Không tải được sao kê." },
  );
  if (!Array.isArray(data))
    throw new Error("Phản hồi sao kê không đúng định dạng.");
  return data.flatMap((row: unknown) => {
    if (
      !isRecord(row) ||
      typeof row.id !== "string" ||
      (row.type !== "IN" && row.type !== "REFUND") ||
      typeof row.amount !== "number" ||
      typeof row.orderId !== "string" ||
      typeof row.content !== "string" ||
      !isDate(row.createdAt)
    )
      return [];
    return [
      {
        id: row.id,
        type: row.type,
        amount: row.amount,
        orderId: row.orderId,
        paymentId: text(row.paymentId),
        content: row.content,
        createdAt: row.createdAt,
      },
    ];
  });
}
