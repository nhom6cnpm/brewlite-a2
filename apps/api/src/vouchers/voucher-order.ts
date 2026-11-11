/** Minimal A1 order snapshot. Supplied by OrdersService, never by a public DTO. */
export interface VoucherOrder {
  id: string;
  userId: string;
  voucherCode: string | null;
  subtotal: number;
  expiresAt: Date;
}
