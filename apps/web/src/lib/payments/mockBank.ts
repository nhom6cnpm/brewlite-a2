import {
  isDate, isId, isMoney, isRecord, ORDER_STATUSES, PAYMENT_STATUSES, readResponse,
  type OrderStatus, type PaymentMethod, type PaymentStatus,
} from "./api";

export interface MockBankTransfer {
  paymentId: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  orderStatus: OrderStatus | null;
  expiresAt: string | null;
  receivedAt: string | null;
  transferContent: string;
  account: { bankName: string; accountNumber: string; accountName: string };
  serverTime: string;
}

function parseTransfer(data: unknown, paymentId: string): MockBankTransfer {
  const account = isRecord(data) && isRecord(data.account) ? data.account : null;
  if (!isRecord(data) || data.paymentId !== paymentId || !isId(data.orderId) || !isMoney(data.amount) ||
    (data.method !== "WALLET" && data.method !== "CARD") ||
    !PAYMENT_STATUSES.includes(data.status as PaymentStatus) ||
    !(data.orderStatus === null || ORDER_STATUSES.includes(data.orderStatus as OrderStatus)) ||
    !(data.expiresAt === null || isDate(data.expiresAt)) ||
    !(data.receivedAt === null || isDate(data.receivedAt)) || !isDate(data.serverTime) ||
    (data.status === "TRANSFER_RECEIVED" && (data.method !== "WALLET" || !isDate(data.receivedAt))) ||
    data.transferContent !== data.orderId || !account ||
    ![account.bankName, account.accountNumber, account.accountName].every((part) => typeof part === "string" && part.trim())) {
    throw new Error("Phản hồi ngân hàng giả lập không đúng định dạng.");
  }
  return data as unknown as MockBankTransfer;
}

async function request(paymentId: string, method: "GET" | "POST", signal?: AbortSignal) {
  if (!isId(paymentId)) throw new Error("Mã thanh toán không hợp lệ.");
  let response: Response;
  try {
    response = await fetch(`/api/mock-bank/${encodeURIComponent(paymentId)}`, {
      method, signal, cache: "no-store", headers: { Accept: "application/json" },
    });
  } catch {
    if (signal?.aborted) throw new DOMException("Yêu cầu đã hủy.", "AbortError");
    throw new Error("Không kết nối được ngân hàng giả lập. Vui lòng thử lại.");
  }
  const data = await readResponse(response, "Không kết nối được ngân hàng giả lập. Vui lòng thử lại.");
  if (signal?.aborted) throw new DOMException("Yêu cầu đã hủy.", "AbortError");
  return parseTransfer(data, paymentId);
}

export const getMockBankTransfer = (paymentId: string, signal?: AbortSignal) => request(paymentId, "GET", signal);
// No amount, order id or credentials in the body: the server owns these values.
export const sendMockBankTransfer = (paymentId: string, signal?: AbortSignal) => request(paymentId, "POST", signal);
