import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginPaymentUser, paymentFixture, TEST_PAYMENT_TOKEN } from "@/test/payment-fixtures";
import { beginPaymentAttempt, forgetPaymentAttempt } from "./attempts";

beforeEach(() => { localStorage.clear(); loginPaymentUser(); });

describe("WEB-T81 — Giữ khóa của lượt thanh toán", () => {
  it("mất phản hồi rồi bấm lại vẫn gửi cùng key đã lưu", async () => {
    const request = vi.fn().mockRejectedValueOnce(new TypeError("Network lost"))
      .mockResolvedValueOnce(Response.json(paymentFixture()));
    vi.stubGlobal("fetch", request);
    await expect(beginPaymentAttempt("ORD-demo", "WALLET")).rejects.toThrow();
    await beginPaymentAttempt("ORD-demo", "WALLET");
    const keys = request.mock.calls.map((call) => call[1].headers["Idempotency-Key"]);
    expect(keys[0]).toBeTruthy();expect(keys[1]).toBe(keys[0]);
    expect(JSON.parse(localStorage.getItem("customer-a:brewlite-payment-attempt:ORD-demo:WALLET")!)).toMatchObject({ paymentId: "PAY-demo", idempotencyKey: keys[0] });
  });

  it("phiên đã thất bại thì lần thử mới dùng key mới, cùng orderId", async () => {
    const request = vi.fn().mockImplementation(() => Promise.resolve(Response.json(paymentFixture())));
    vi.stubGlobal("fetch", request);
    await beginPaymentAttempt("ORD-demo", "WALLET");
    forgetPaymentAttempt("ORD-demo", "PAY-demo", TEST_PAYMENT_TOKEN);
    await beginPaymentAttempt("ORD-demo", "WALLET");
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).not.toBe(request.mock.calls[1][1].headers["Idempotency-Key"]);
    expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);
  });

  it("khóa được tách theo tài khoản và phương thức", async () => {
    const request = vi.fn().mockImplementation(() => Promise.resolve(Response.json(paymentFixture())));
    vi.stubGlobal("fetch", request);
    await beginPaymentAttempt("ORD-demo", "WALLET");
    await beginPaymentAttempt("ORD-demo", "CARD");
    loginPaymentUser("customer-b", "token-b");
    await beginPaymentAttempt("ORD-demo", "WALLET");
    expect(new Set(request.mock.calls.map((call) => call[1].headers["Idempotency-Key"])).size).toBe(3);
  });

  it("kết quả phiên cũ không xóa lượt mới", async () => {
    localStorage.setItem("customer-a:brewlite-payment-attempt:ORD-demo:WALLET", JSON.stringify({ orderId: "ORD-demo", method: "WALLET", idempotencyKey: "new-key", paymentId: "PAY-new" }));
    forgetPaymentAttempt("ORD-demo", "PAY-old", TEST_PAYMENT_TOKEN);
    expect(localStorage.getItem("customer-a:brewlite-payment-attempt:ORD-demo:WALLET")).toContain("new-key");
  });

  it("không gửi POST nếu không lưu được khóa", async () => {
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota"); });
    await expect(beginPaymentAttempt("ORD-demo", "WALLET")).rejects.toThrow("Không lưu được lượt thanh toán");
    expect(request).not.toHaveBeenCalled();
  });
});
