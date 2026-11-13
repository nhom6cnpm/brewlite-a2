import { saveAuth } from "@/lib/auth";
import type { PaymentDetails } from "@/lib/payments/api";
import type { MockBankTransfer } from "@/lib/payments/mockBank";

export const PAYMENT_TIME = "2026-11-13T08:00:00.000Z";
export const PAYMENT_EXPIRY = "2026-11-13T08:15:00.000Z";
export const TEST_PAYMENT_TOKEN = "payment-test-token-a";

export function loginPaymentUser(id = "customer-a", token = TEST_PAYMENT_TOKEN) {
  saveAuth(token, { id, email: `${id}@example.test`, loyaltyPoints: 0, role: "CUSTOMER" });
}

export function paymentFixture(overrides: Partial<PaymentDetails> = {}): PaymentDetails {
  return {
    paymentId: "PAY-demo", orderId: "ORD-demo", amount: 50000,
    method: "WALLET", status: "PENDING", orderStatus: "PENDING",
    cancellationPending: false, createdAt: PAYMENT_TIME, receivedAt: null, reviewNote: null,
    expiresAt: PAYMENT_EXPIRY, serverTime: PAYMENT_TIME, ...overrides,
  };
}

export function bankFixture(overrides: Partial<MockBankTransfer> = {}): MockBankTransfer {
  const payment = paymentFixture();
  return {
    paymentId: payment.paymentId, orderId: payment.orderId, amount: payment.amount,
    method: payment.method, status: payment.status, orderStatus: payment.orderStatus,
    expiresAt: payment.expiresAt, receivedAt: null, transferContent: payment.orderId,
    serverTime: PAYMENT_TIME,
    account: { bankName: "BrewLite Bank (giả lập)", accountName: "BREWLITE TEST", accountNumber: "0123 456 789" },
    ...overrides,
  };
}

export function paymentOrderFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "ORD-demo", total: 50000, status: "PENDING", expiresAt: PAYMENT_EXPIRY,
    serverTime: PAYMENT_TIME, canPay: true, transferReceived: false, cancelRequest: null,
    ...overrides,
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
