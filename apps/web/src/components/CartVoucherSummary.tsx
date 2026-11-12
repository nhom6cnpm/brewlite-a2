"use client";

import { useCart } from "@/store/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { useVoucherQuote } from "@/hooks/useVoucherQuote";
import VoucherPicker from "./VoucherPicker";
import PriceSummary from "./PriceSummary";

/** Drop-in voucher/price section for Mai's cart; does not change cart or stock logic. */
export default function CartVoucherSummary() {
  const items = useCart((state) => state.items);
  const selectedCode = useCart((state) => state.voucherCode);
  const setVoucherCode = useCart((state) => state.setVoucherCode);
  const { token } = useAuth();
  const hydrated = useHydrated();
  const quote = useVoucherQuote(
    items,
    selectedCode || undefined,
    hydrated && items.length > 0,
    15_000,
    token,
  );
  // A refetch failure can retain old data in the cache: never display it as an applied quote.
  const totals = quote.isSuccess ? quote.data : undefined;

  if (!hydrated) return <p role="status">Đang tải ưu đãi…</p>;
  if (items.length === 0) return null;

  return (
    <section aria-label="Ưu đãi và tổng tiền giỏ hàng">
      <VoucherPicker
        items={items}
        selectedCode={selectedCode}
        onSelect={setVoucherCode}
        token={token}
        appliedDiscount={
          totals?.voucherCode === selectedCode ? totals.discount : undefined
        }
      />
      {quote.isPending && (
        <p role="status" className="text-sm text-stone-500">
          Đang lấy báo giá từ hệ thống…
        </p>
      )}
      {quote.isError && (
        <div role="alert" className="text-sm text-red-700">
          <p>{quote.error.message}</p>
          <button
            type="button"
            disabled={quote.isFetching}
            onClick={() => void quote.refetch()}
            className="mt-2 font-semibold underline disabled:opacity-50"
          >
            Thử lấy báo giá lại
          </button>
        </div>
      )}
      {totals && <PriceSummary totals={totals} />}
    </section>
  );
}
