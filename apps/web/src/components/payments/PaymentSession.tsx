"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { usePaymentClock } from "@/hooks/usePaymentClock";
import { formatPrice } from "@/lib/formatPrice";
import { getPayment, isPaidOrder, shouldPollPayment } from "@/lib/payments/api";
import { forgetPaymentAttempt } from "@/lib/payments/attempts";
import { formatPaymentRemaining, paymentConfirmationPath, paymentSelectionPath, publicAppOrigin } from "@/lib/payments/links";

export default function PaymentSession({ paymentId }: { paymentId: string }) {
  const { token } = useAuth();
  const hydrated = useHydrated();
  if (!hydrated) return <p role="status" className="p-6">Đang tải thanh toán…</p>;
  if (!token) return (
    <section className="mx-auto max-w-xl p-6 text-center">
      <h1 className="text-2xl font-bold">Đăng nhập để xem thanh toán</h1>
      <Link href={`/login?redirect=${encodeURIComponent(`/pay/${paymentId}`)}`} className="mt-4 inline-block font-semibold text-amber-800 underline">Đăng nhập</Link>
    </section>
  );
  return <Session key={`${token}:${paymentId}`} token={token} paymentId={paymentId} />;
}

function Session({ token, paymentId }: { token: string; paymentId: string }) {
  const router = useRouter();
  const handled = useRef(false);
  const query = useQuery({
    queryKey: ["payments", token, paymentId],
    queryFn: ({ signal }) => getPayment(paymentId, signal, token),
    refetchInterval: (state) => shouldPollPayment(state.state.data) ? 3000 : false,
    retry: false,
    staleTime: 0,
  });
  const payment = query.data;
  const now = usePaymentClock(payment?.serverTime, query.dataUpdatedAt);
  useEffect(() => {
    if (!payment || query.isError || handled.current) return;
    if (payment.status === "SUCCESS" && isPaidOrder(payment.orderStatus)) {
      handled.current = true;
      forgetPaymentAttempt(payment.orderId, payment.paymentId, token);
      router.replace(payment.orderStatus === "PAID" ? paymentConfirmationPath(payment.orderId) : `/orders/${encodeURIComponent(payment.orderId)}`);
    } else if (payment.status === "FAILED" || payment.orderStatus === "CANCELLED") {
      handled.current = true;
      forgetPaymentAttempt(payment.orderId, payment.paymentId, token);
    }
  }, [payment, query.isError, router, token]);

  if (query.isPending) return <p role="status" className="p-6">Đang tải phiên thanh toán…</p>;
  if (!payment) return (
    <section className="mx-auto max-w-xl p-6 text-center">
      <h1 className="text-2xl font-bold">Không mở được phiên thanh toán</h1>
      <p role="alert" className="mt-3 text-red-700">{query.error?.message}</p>
      <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} className="mt-4 font-semibold text-amber-800 underline">Thử lại</button>
      <Link href="/cart" className="mt-4 block text-amber-800 underline">Về giỏ hàng</Link>
    </section>
  );
  const closed = payment.orderStatus === "CANCELLED";
  const paid = isPaidOrder(payment.orderStatus);
  const received = payment.status === "TRANSFER_RECEIVED";
  const wallet = payment.method === "WALLET";
  const remaining = payment.expiresAt ? Date.parse(payment.expiresAt) - now : null;
  const expired = remaining !== null && remaining <= 0;
  const origin = typeof window === "undefined" ? "" : publicAppOrigin(window.location.origin, process.env.NEXT_PUBLIC_APP_URL);
  const bankPath = `/mock-bank/${encodeURIComponent(paymentId)}`;
  const qrValue = `${origin}${wallet ? bankPath : `/admin/payments?orderId=${encodeURIComponent(payment.orderId)}`}`;
  const waiting = !closed && !paid && payment.status !== "FAILED";
  const canTransfer = waiting && wallet && payment.status === "PENDING" && payment.orderStatus === "PENDING" &&
    remaining !== null && remaining > 0 && !payment.cancellationPending && !query.isError;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-800">BrewLite · Thanh toán</p>
        <h1 className="mt-2 text-3xl font-bold">{closed ? "Đơn đã bị hủy hoặc hết hạn" : paid ? "Đơn đã được thanh toán" : payment.status === "FAILED" ? "Thanh toán thất bại" : wallet ? "Chuyển khoản / Ví điện tử" : "Thanh toán thẻ tại quầy"}</h1>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4">
          <span className="break-all">Đơn {payment.orderId}</span><strong className="text-xl text-amber-900">{formatPrice(payment.amount)}</strong>
        </div>
        {closed ? <p role="status" className="mt-5">Đơn không còn nhận thanh toán. Vui lòng kiểm tra giỏ hàng để đặt lại.</p>
          : paid ? <p role="status" className="mt-5">{payment.status === "SUCCESS" ? "Đang mở xác nhận đơn…" : "Đơn đã được thanh toán qua phiên khác. Vui lòng xem chi tiết đơn."}</p>
            : payment.status === "FAILED" ? (
              <div className="mt-5">
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{payment.reviewNote || "Nhân viên chưa xác nhận được khoản thanh toán."}</p>
                <p className="mt-3">Giỏ hàng vẫn được giữ nguyên.</p>
                {!expired && !payment.cancellationPending && <Link href={paymentSelectionPath(payment.orderId)} className="mt-4 inline-block rounded-full bg-amber-800 px-5 py-3 font-semibold text-white">Thử lại</Link>}
              </div>
            ) : (
              <>
                {remaining !== null && <p role="status" className="mt-4 text-sm text-stone-600">{received && expired ? "Tiền đã về đúng hạn, đơn được giữ lại chờ nhân viên xác nhận." : expired ? "Đã hết thời gian thanh toán, đang cập nhật trạng thái đơn." : `Thời gian còn lại: ${formatPaymentRemaining(remaining)}`}</p>}
                {payment.orderStatus === null && <p role="alert" className="mt-4 text-red-700">Chưa xác định được trạng thái đơn. Vui lòng kiểm tra lại.</p>}
                {payment.cancellationPending && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3">Đơn đang chờ nhân viên duyệt hủy, tạm dừng thao tác thanh toán.</p>}
                <div className="mt-6 text-center">
                  <div className="inline-block rounded-2xl border border-stone-200 bg-white p-4">
                    <QRCodeSVG value={qrValue} size={200} marginSize={2} role="img" aria-label={wallet ? "Mã QR mở ngân hàng giả lập" : "Mã QR đơn hàng cho nhân viên"} />
                  </div>
                  <p className="mt-3 text-sm text-stone-600">{wallet ? "Quét mã để mở ngân hàng giả lập, kiểm tra mã đơn và số tiền rồi chuyển tiền." : "Đưa QR hoặc mã đơn cho nhân viên, quẹt thẻ tại quầy và chờ xác nhận."}</p>
                  {wallet && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(origin) && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">QR đang dùng localhost, điện thoại không mở được. Dùng địa chỉ IP LAN của máy tính cùng Wi-Fi, hoặc nút mở ngân hàng bên dưới.</p>}
                </div>
                {received ? <p role="status" className="mt-5 rounded-xl bg-sky-50 p-4 text-sky-900">Đã nhận tiền, đang chờ nhân viên xác nhận. Không cần chuyển lại.</p>
                  : wallet ? canTransfer && <a href={bankPath} target="_blank" rel="noopener noreferrer" className="mt-5 block rounded-xl bg-amber-800 px-4 py-3 text-center font-bold text-white">Mở ngân hàng giả lập</a>
                    : <p role="status" className="mt-5 rounded-xl bg-stone-50 p-4">Đang chờ nhân viên xác nhận thanh toán thẻ tại quầy.</p>}
              </>
            )}
        {query.isError && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-red-800">Chưa cập nhật được kết quả: {query.error.message}</p>}
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-amber-800 underline">
          <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching}>Kiểm tra trạng thái</button>
          {paid && <Link href={`/orders/${encodeURIComponent(payment.orderId)}`}>Xem đơn hàng</Link>}
          <Link href="/cart">Về giỏ hàng</Link>
        </div>
      </div>
    </section>
  );
}
