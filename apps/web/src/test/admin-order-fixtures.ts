import type { Order } from "@/types/order";
export const NOW = "2026-11-14T07:00:00.000Z";
export const REQUEST = "12345678-1234-4234-9234-123456789012";
export function orderFixture(overrides: Partial<Order> = {}): Order {
  return {
    id: "ORD-1",
    status: "PAID",
    subtotal: 40000,
    discount: 5000,
    total: 35000,
    voucherCode: "THU5K",
    voucherTitle: "Ưu đãi đã lưu",
    createdAt: NOW,
    expiresAt: "2026-11-14T07:15:00.000Z",
    serverTime: NOW,
    cancelledAt: null,
    cancelReason: null,
    paymentMethod: "WALLET",
    refundedAmount: 0,
    transferReceived: false,
    canPay: false,
    benefitsPolicyVersion: 1,
    pointsEarned: 3,
    pointsReversed: 0,
    pointsAwardedAt: NOW,
    pointsReversedAt: null,
    canCancelImmediately: false,
    canRequestCancellation: true,
    cancelRequest: null,
    items: [
      {
        id: "line-1",
        productId: "p1",
        name: "Cà phê lưu trong đơn",
        imageUrl: null,
        size: "M",
        toppingIds: [],
        qty: 1,
        unitPrice: 40000,
        lineTotal: 40000,
      },
    ],
    ...overrides,
  };
}
export function cancellationFixture() {
  return orderFixture({
    canRequestCancellation: false,
    cancelRequest: {
      id: REQUEST,
      status: "PENDING",
      reason: "Đổi lịch nhận món",
      requestedAt: NOW,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
    },
  });
}
