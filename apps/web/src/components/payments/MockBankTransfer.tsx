"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePaymentClock } from "@/hooks/usePaymentClock";
import { formatPrice } from "@/lib/formatPrice";
import { getMockBankTransfer, sendMockBankTransfer } from "@/lib/payments/mockBank";

export default function MockBankTransfer({ paymentId }: { paymentId: string }) {
  const client = useQueryClient();
  const queryKey = ["mock-bank", paymentId];
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getMockBankTransfer(paymentId, signal),
    retry: false,
    staleTime: 0,
    refetchInterval: (query) => {
      const transfer = query.state.data;
      return transfer && ["PENDING", "TRANSFER_RECEIVED"].includes(transfer.status) && transfer.orderStatus === "PENDING" ? 3000 : false;
    },
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const transfer = query.data;
  const now = usePaymentClock(transfer?.serverTime, query.dataUpdatedAt);
  useEffect(() => () => request.current?.abort(), []);

  async function send() {
    if (!canTransfer || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setSending(true);
    setError("");
    try {
      const result = await sendMockBankTransfer(paymentId, controller.signal);
      if (!controller.signal.aborted) client.setQueryData(queryKey, result);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Không chuyển được tiền. Vui lòng thử lại.");
        void query.refetch();
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setSending(false);
    }
  }

  const received = transfer?.status === "TRANSFER_RECEIVED";
  const success = transfer?.status === "SUCCESS";
  const expired = transfer?.expiresAt ? Date.parse(transfer.expiresAt) <= now : true;
  const closed = transfer?.orderStatus === "CANCELLED" || transfer?.status === "FAILED";
  const canTransfer = transfer?.method === "WALLET" && transfer.status === "PENDING" &&
    transfer.orderStatus === "PENDING" && !expired && !query.isError && !query.isFetching && !sending;
  return (
    <section className="mx-auto w-full max-w-md px-4 py-8">
      <div className="overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-sm">
        <header className="bg-sky-800 px-6 py-5 text-white">
          <p className="font-bold">{transfer?.account.bankName || "BrewLite Bank"}</p>
          <p className="mt-1 text-xs">Ngân hàng giả lập để demo, không dùng tiền thật.</p>
        </header>
        <div className="p-6">
          <h1 className="text-2xl font-bold">{success ? "Cửa hàng đã xác nhận" : received ? "Đã ghi nhận chuyển tiền" : "Chuyển tiền"}</h1>
          {query.isPending ? <p role="status" className="mt-4">Đang tải thông tin chuyển khoản…</p>
            : !transfer ? <p role="alert" className="mt-4 text-red-700">{query.error?.message || "Không tìm thấy phiên thanh toán."}</p>
              : (
                <>
                  <dl className="mt-5 space-y-4 text-sm">
                    <div><dt className="text-stone-600">Tài khoản nhận</dt><dd className="mt-1 font-semibold">{transfer.account.accountName}</dd><dd>{transfer.account.accountNumber}</dd></div>
                    <div><dt className="text-stone-600">Số tiền cố định</dt><dd className="mt-1 text-2xl font-bold text-sky-900">{formatPrice(transfer.amount)}</dd></div>
                    <div><dt className="text-stone-600">Nội dung chuyển khoản</dt><dd className="mt-1 break-all font-mono font-semibold">{transfer.transferContent}</dd></div>
                  </dl>
                  {closed ? <p role="status" className="mt-5 rounded-xl bg-red-50 p-3 text-red-800">Phiên đã đóng hoặc đơn bị hủy; không thể chuyển tiền.</p>
                    : success ? <p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-green-800">Thanh toán đã được cửa hàng xác nhận. Quay lại màn hình đơn hàng để xem kết quả.</p>
                      : received ? <p role="status" className="mt-5 rounded-xl bg-sky-50 p-3 text-sky-900">Tiền đã vào sao kê giả lập; đang chờ nhân viên xác nhận. Không cần chuyển lại.</p>
                        : transfer.method === "CARD" ? <p role="status" className="mt-5">Thanh toán thẻ được thực hiện tại quầy, không chuyển khoản trên trang này.</p>
                          : expired ? <p role="status" className="mt-5 text-red-700">Đã hết thời gian chuyển tiền. Vui lòng kiểm tra lại trạng thái đơn.</p>
                            : <button type="button" onClick={() => void send()} disabled={!canTransfer} className="mt-6 min-h-12 w-full rounded-xl bg-sky-800 px-4 py-3 font-bold text-white disabled:opacity-50">{sending ? "Đang chuyển…" : "Chuyển tiền (mô phỏng)"}</button>}
                  <p className="mt-4 text-xs text-stone-600">Bấm chuyển tiền chỉ ghi nhận tiền về. Nhân viên cửa hàng quyết định xác nhận đơn.</p>
                </>
              )}
          {(error || (transfer && query.isError)) && <p role="alert" className="mt-4 text-sm text-red-700">{error || query.error?.message}</p>}
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-sky-800 underline">
            <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching || sending}>Kiểm tra lại</button>
            <Link href={`/pay/${encodeURIComponent(paymentId)}`}>Về màn hình thanh toán</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
