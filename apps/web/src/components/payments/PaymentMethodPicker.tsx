"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { usePaymentClock } from "@/hooks/usePaymentClock";
import { formatPrice } from "@/lib/formatPrice";
import { getPaymentOrder, isPaidOrder, type PaymentMethod } from "@/lib/payments/api";
import { beginPaymentAttempt } from "@/lib/payments/attempts";
import { formatPaymentRemaining, paymentConfirmationPath, paymentSelectionPath } from "@/lib/payments/links";

/** Issue #35 may embed this component or link to /pay/order/[orderId]. */
export default function PaymentMethodPicker({ orderId }: { orderId: string }) {
  const { token } = useAuth();
  const hydrated = useHydrated();
  if (!hydrated) return <p role="status" className="p-6">Đang tải thanh toán…</p>;
  if (!token) return (
    <section className="mx-auto max-w-xl p-6 text-center">
      <h1 className="text-2xl font-bold">Đăng nhập để thanh toán</h1>
      <Link href={`/login?redirect=${encodeURIComponent(paymentSelectionPath(orderId))}`} className="mt-4 inline-block font-semibold text-amber-800 underline">Đăng nhập</Link>
    </section>
  );
  return <PickerSession key={`${token}:${orderId}`} token={token} orderId={orderId} />;
}

function PickerSession({ orderId, token }: { orderId: string; token: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const queryKey = ["payment-order", token, orderId];
  const query = useQuery({ queryKey, queryFn: ({ signal }) => getPaymentOrder(orderId, signal, token), retry: false });
  const [method, setMethod] = useState<PaymentMethod>("WALLET");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const order = query.data;
  const now = usePaymentClock(order?.serverTime, query.dataUpdatedAt);
  useEffect(() => () => request.current?.abort(), []);

  async function pay() {
    if (!order || query.isError || request.current || order.cancellationPending) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError("");
    try {
      const current = await getPaymentOrder(orderId, controller.signal, token);
      client.setQueryData(queryKey, current);
      if (isPaidOrder(current.status)) {
        router.replace(current.status === "PAID" ? paymentConfirmationPath(orderId) : `/orders/${encodeURIComponent(orderId)}`);
        return;
      }
      if (current.cancellationPending) throw new Error("Đơn đang chờ duyệt hủy. Vui lòng đợi nhân viên xử lý.");
      if (!current.canPay && !current.transferReceived) throw new Error("Đơn đã hết hạn, bị hủy hoặc không còn chờ thanh toán.");
      const payment = await beginPaymentAttempt(orderId, method, controller.signal, token);
      if (!controller.signal.aborted) router.push(`/pay/${encodeURIComponent(payment.paymentId)}`);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Không tạo được phiên thanh toán.");
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  if (query.isPending) return <p role="status" className="p-6">Đang tải thông tin đơn hàng…</p>;
  if (!order) return (
    <section className="mx-auto max-w-xl p-6 text-center">
      <h1 className="text-2xl font-bold">Không mở được thanh toán</h1>
      <p role="alert" className="mt-3 text-red-700">{query.error?.message}</p>
      <button onClick={() => void query.refetch()} disabled={query.isFetching} className="mt-4 font-semibold text-amber-800 underline">Thử lại</button>
    </section>
  );
  const remaining = Date.parse(order.expiresAt) - now;
  const canOpen = ["PENDING", "PAYMENT_FAILED"].includes(order.status) && !query.isError && !order.cancellationPending &&
    ((order.canPay && remaining > 0) || order.transferReceived);
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold">Chọn cách thanh toán</h1>
        <p className="mt-3 break-all text-sm text-stone-600">Mã đơn: <strong>{order.id}</strong></p>
        <p className="mt-5 rounded-2xl bg-amber-50 p-4">Tổng tiền <strong className="float-right text-xl text-amber-900">{formatPrice(order.total)}</strong></p>
        {isPaidOrder(order.status) ? (
          <p className="mt-5">Đơn đã được thanh toán. <Link href={order.status === "PAID" ? paymentConfirmationPath(orderId) : `/orders/${encodeURIComponent(orderId)}`} className="font-semibold text-amber-800 underline">Xem đơn hàng</Link></p>
        ) : order.status === "CANCELLED" ? <p role="status" className="mt-5 text-red-700">Đơn đã bị hủy hoặc hết hạn thanh toán.</p>
          : order.cancellationPending ? <p role="status" className="mt-5">Đơn đang chờ nhân viên duyệt hủy; tạm dừng thanh toán.</p>
            : order.transferReceived ? <p role="status" className="mt-5 text-sky-800">Tiền đã về, đang chờ nhân viên xác nhận. Không cần chuyển lại.</p>
              : <p role="status" className="mt-5">{remaining > 0 ? `Vui lòng thanh toán trong ${formatPaymentRemaining(remaining)}` : "Đã hết thời gian thanh toán. Vui lòng kiểm tra lại đơn."}</p>}
        {canOpen && !order.transferReceived && (
          <fieldset disabled={pending} className="mt-6">
            <legend className="font-semibold">Phương thức</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([{ value: "WALLET", title: "Ví điện tử", description: "Quét QR mở ngân hàng giả lập" },
                { value: "CARD", title: "Thẻ tại quầy", description: "Chờ nhân viên xác nhận sau khi quẹt thẻ" }] as const).map((option) => (
                <label key={option.value} className={`cursor-pointer rounded-2xl border p-4 focus-within:outline-2 focus-within:outline-amber-800 ${method === option.value ? "border-amber-800 bg-amber-50" : "border-stone-200"}`}>
                  <input type="radio" name="payment-method" checked={method === option.value} onChange={() => setMethod(option.value)} className="mr-2 accent-amber-800" />
                  <span className="font-semibold">{option.title}</span><span className="mt-2 block text-sm text-stone-600">{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {(error || query.isError) && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-red-800">{error || query.error?.message}</p>}
        {canOpen && <button type="button" onClick={() => void pay()} disabled={pending || query.isFetching} className="mt-6 min-h-12 w-full rounded-xl bg-amber-800 px-4 py-3 font-bold text-white disabled:opacity-50">{pending ? "Đang mở phiên thanh toán…" : order.transferReceived ? "Mở phiên đang chờ" : `Thanh toán · ${formatPrice(order.total)}`}</button>}
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-amber-800 underline">
          <Link href="/cart">Về giỏ hàng</Link>
          <button type="button" onClick={() => void query.refetch()} disabled={pending || query.isFetching}>Kiểm tra lại đơn</button>
        </div>
      </div>
    </section>
  );
}
