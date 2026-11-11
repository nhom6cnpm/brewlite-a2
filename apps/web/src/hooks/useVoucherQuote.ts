import { useQuery } from "@tanstack/react-query";
import { quoteVoucher } from "@/lib/vouchers";
import type { VoucherCartItem, VoucherQuoteRequest } from "@/lib/vouchers";

export function useVoucherQuote(
  items: VoucherCartItem[],
  code?: string,
  enabled = true,
  refetchInterval = 15_000,
  token: string | null = null,
  request: VoucherQuoteRequest = quoteVoucher,
) {
  const lines = items.map(({ productId, size, toppingIds, qty }) => ({
    productId,
    size,
    toppingIds,
    qty,
  }));
  return useQuery({
    queryKey: ["voucher-quote", token, lines, code ?? ""],
    queryFn: ({ signal }) => request(items, code, signal, token),
    enabled: enabled && items.length > 0,
    retry: false,
    refetchInterval,
    refetchOnWindowFocus: true,
  });
}
