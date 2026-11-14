"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import AdminGate from "./AdminGate";
import AdminNav from "./AdminNav";
import BankStatement from "./BankStatement";
import { getAdminOrderDetail } from "@/lib/admin/history";
import { AdminApiError } from "@/lib/admin/request";
import { OrderItems, StatusBadge } from "@/components/orders/OrderParts";
import OrderRewards from "@/components/orders/OrderRewards";
import PriceSummary from "@/components/PriceSummary";
import { formatDate } from "@/lib/orderUtils";
import { formatPrice } from "@/lib/formatPrice";

export default function OrderHistoryDetail({ id }: { id: string }) {
  return (
    <AdminGate redirect={`/admin/history/${encodeURIComponent(id)}`}>
      {(token) => <Detail key={`${token}:${id}`} id={id} token={token} />}
    </AdminGate>
  );
}

function Detail({ id, token }: { id: string; token: string }) {
  const query = useQuery({
    queryKey: ["admin-order-detail", token, id],
    queryFn: ({ signal }) => getAdminOrderDetail(id, token, signal),
    refetchInterval: 4_000,
    retry: false,
  });
  const order = query.data;
  const missing =
    query.error instanceof AdminApiError && query.error.status === 404;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <AdminNav />
      <Link
        href="/admin/history"
        className="text-sm font-semibold text-amber-800 underline"
      >
        ← Lịch sử đơn
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Chi tiết đơn hàng</h1>
      {query.isPending ? (
        <p role="status" className="py-8">
          Đang tải chi tiết đơn…
        </p>
      ) : query.isError ? (
        <div
          role="alert"
          className="my-5 rounded-2xl border border-red-200 p-6"
        >
          <p>{missing ? "Không tìm thấy đơn hàng." : query.error.message}</p>
          <button
            className="mt-3 font-semibold text-amber-800 underline"
            onClick={() => void query.refetch()}
          >
            Thử lại
          </button>
        </div>
      ) : (
        order && (
          <>
            <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
              <article className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5">
                <h2 className="break-all font-bold">{order.id}</h2>
                <p className="my-2 break-all text-sm text-stone-600">
                  {order.customerEmail ?? "Khách hàng"} ·{" "}
                  {formatDate(order.createdAt)}
                </p>
                <StatusBadge order={order} />
                <OrderItems order={order} />
                <PriceSummary totals={order} />
                {order.refundedAmount > 0 && (
                  <p className="mt-3 font-semibold text-green-800">
                    Đã hoàn tiền: {formatPrice(order.refundedAmount)}
                  </p>
                )}
                <OrderRewards order={order} />
                {order.cancelledAt && (
                  <p className="mt-3 text-sm">
                    Hủy lúc {formatDate(order.cancelledAt)} ·{" "}
                    {order.cancelReason === "PAYMENT_TIMEOUT"
                      ? "Hết hạn thanh toán"
                      : "Theo yêu cầu"}
                  </p>
                )}
              </article>
              <div className="min-w-0 space-y-5">
                <section
                  className="rounded-2xl border border-stone-200 bg-white p-5"
                  aria-label="Yêu cầu hủy"
                >
                  <h2 className="font-bold">Yêu cầu hủy</h2>
                  {!order.cancelRequest ? (
                    <p className="mt-2 text-sm text-stone-600">
                      Không có yêu cầu hủy.
                    </p>
                  ) : (
                    <dl className="mt-3 space-y-2 break-words text-sm">
                      <div>
                        <dt className="text-stone-500">Trạng thái</dt>
                        <dd>
                          {
                            {
                              PENDING: "Chờ duyệt",
                              APPROVED: "Đã duyệt",
                              REJECTED: "Đã từ chối",
                              EXPIRED: "Đã hết hạn",
                            }[order.cancelRequest.status]
                          }
                        </dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Lý do</dt>
                        <dd>{order.cancelRequest.reason}</dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Gửi lúc</dt>
                        <dd>{formatDate(order.cancelRequest.requestedAt)}</dd>
                      </div>
                      {order.cancelRequest.reviewedAt && (
                        <div>
                          <dt className="text-stone-500">Xử lý lúc</dt>
                          <dd>{formatDate(order.cancelRequest.reviewedAt)}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-stone-500">Người duyệt</dt>
                        <dd className="break-all">
                          {order.cancelReviewedByEmail ?? "—"}
                        </dd>
                      </div>
                      {order.cancelRequest.reviewNote && (
                        <div>
                          <dt className="text-stone-500">
                            Ghi chú / lý do từ chối
                          </dt>
                          <dd>{order.cancelRequest.reviewNote}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </section>
                <section
                  className="rounded-2xl border border-stone-200 bg-white p-5"
                  aria-label="Các phiên thanh toán"
                >
                  <h2 className="font-bold">Các phiên thanh toán</h2>
                  {!order.payments.length ? (
                    <p className="mt-2 text-sm text-stone-600">
                      Chưa có phiên thanh toán.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-4">
                      {order.payments.map((p) => (
                        <li
                          key={p.paymentId}
                          className="min-w-0 border-t border-stone-100 pt-3 text-sm"
                        >
                          <p className="break-all font-semibold">
                            {p.paymentId}
                          </p>
                          <p>
                            {p.method === "CARD"
                              ? "Thẻ tại quầy"
                              : "Chuyển khoản / Ví"}{" "}
                            · {formatPrice(p.amount)}
                          </p>
                          <p>
                            {
                              {
                                PENDING: "Chờ thanh toán",
                                TRANSFER_RECEIVED: "Đã nhận tiền, chờ xác nhận",
                                SUCCESS: "Thành công",
                                FAILED: "Thất bại",
                              }[p.status]
                            }
                          </p>
                          <p className="mt-1 text-stone-600">
                            Tạo: {formatDate(p.createdAt)}
                          </p>
                          {p.receivedAt && (
                            <p className="text-stone-600">
                              Nhận tiền: {formatDate(p.receivedAt)}
                            </p>
                          )}
                          {p.reviewedAt && (
                            <p className="break-all text-stone-600">
                              Xử lý: {formatDate(p.reviewedAt)} ·{" "}
                              {p.reviewedByEmail ?? "—"}
                            </p>
                          )}
                          {p.reviewNote && (
                            <p className="break-words">
                              Ghi chú: {p.reviewNote}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
            <section className="mt-6" aria-label="Sao kê đơn hàng">
              <h2 className="mb-3 text-xl font-bold">Sao kê đơn hàng</h2>
              <BankStatement token={token} orderId={id} />
            </section>
          </>
        )
      )}
    </section>
  );
}
