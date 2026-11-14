import { adminRequest } from "./request";
import { parseOrder } from "@/lib/orders/history";
import type { Order } from "@/types/order";

export type PreparationTarget = "PREPARING" | "READY" | "COMPLETED";

async function list(
  path: string,
  token: string,
  signal?: AbortSignal,
): Promise<Order[]> {
  const data = await adminRequest(path, token, { signal });
  if (!Array.isArray(data)) throw new Error("Danh sách đơn chưa hợp lệ.");
  return data.map(parseOrder);
}

export function listPreparationOrders(token: string, signal?: AbortSignal) {
  return list("/admin/orders?status=PAID,PREPARING,READY", token, signal);
}

export function listCancellationRequests(token: string, signal?: AbortSignal) {
  return list("/admin/orders?cancelRequestStatus=PENDING", token, signal);
}

export async function advancePreparation(
  id: string,
  status: PreparationTarget,
  token: string,
): Promise<Order> {
  const order = parseOrder(
    await adminRequest(
      `/admin/orders/${encodeURIComponent(id)}/status`,
      token,
      { method: "PATCH", body: { status } },
    ),
  );
  if (order.id !== id || order.status !== status)
    throw new Error(
      "Trạng thái đơn trả về chưa hợp lệ. Vui lòng tải lại bảng.",
    );
  return order;
}

export async function reviewCancellation(
  id: string,
  requestId: string,
  approve: boolean,
  note: string,
  token: string,
): Promise<Order> {
  const order = parseOrder(
    await adminRequest(
      `/admin/orders/${encodeURIComponent(id)}/${approve ? "cancel" : "cancel-request/reject"}`,
      token,
      {
        method: "POST",
        body: approve
          ? { requestId, ...(note.trim() ? { note: note.trim() } : {}) }
          : { requestId, reason: note.trim() },
      },
    ),
  );
  if (
    order.id !== id ||
    order.cancelRequest?.id !== requestId ||
    order.cancelRequest.status !== (approve ? "APPROVED" : "REJECTED") ||
    (approve && order.status !== "CANCELLED")
  )
    throw new Error("Kết quả duyệt chưa hợp lệ. Vui lòng tải lại danh sách.");
  return order;
}
