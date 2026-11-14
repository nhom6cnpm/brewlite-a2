import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStoredToken, saveAuth } from "@/lib/auth";
import { createPayment, getPayment, getPaymentOrder, parsePayment } from "./api";
import { paymentFixture, paymentOrderFixture, loginPaymentUser, deferred, TEST_PAYMENT_TOKEN } from "@/test/payment-fixtures";
import { formatPaymentRemaining, publicAppOrigin } from "./links";

beforeEach(() => { localStorage.clear(); loginPaymentUser(); });

describe("WEB-T80 — API thanh toán và địa chỉ QR", () => {
  it("gửi đúng JWT, method và key; không gửi số tiền từ client", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.example:3001/");
    const request = vi.fn().mockResolvedValue(Response.json(paymentFixture()));
    vi.stubGlobal("fetch", request);
    const signal = new AbortController().signal;
    await createPayment("ORD-demo", "WALLET", "request-key", signal);
    expect(request).toHaveBeenCalledWith("http://api.example:3001/payments", expect.objectContaining({
      method: "POST", signal, cache: "no-store", body: JSON.stringify({ orderId: "ORD-demo", method: "WALLET" }),
      headers: expect.objectContaining({ Authorization: `Bearer ${TEST_PAYMENT_TOKEN}`, "Idempotency-Key": "request-key" }),
    }));
  });

  it("đọc trạng thái bằng GET và kiểm tra đúng paymentId", async () => {
    const request = vi.fn().mockResolvedValue(Response.json(paymentFixture()));
    vi.stubGlobal("fetch", request);
    await expect(getPayment("PAY-demo")).resolves.toHaveProperty("orderId", "ORD-demo");
    expect(request).toHaveBeenCalledWith("http://localhost:3001/payments/PAY-demo", expect.objectContaining({ cache: "no-store" }));
    request.mockResolvedValueOnce(Response.json(paymentFixture({ paymentId: "PAY-other" })));
    await expect(getPayment("PAY-demo")).rejects.toThrow("không khớp");
  });

  it.each([
    { amount: -1 }, { amount: 1.5 }, { amount: "50000" }, { status: "PAID" },
    { method: "CASH" }, { serverTime: "invalid" }, { expiresAt: "invalid" },
    { cancellationPending: "false" }, { status: "TRANSFER_RECEIVED", receivedAt: null },
  ])("chặn payload sai %#", (override) => {
    expect(() => parsePayment({ ...paymentFixture(), ...override })).toThrow("không đúng định dạng");
  });

  it("không chấp nhận phiên của đơn khác khi tạo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(paymentFixture({ orderId: "ORD-other" }))));
    await expect(createPayment("ORD-demo", "WALLET", "key")).rejects.toThrow("không khớp đơn");
  });

  it("hiện lý do validate từ backend và không tự đánh dấu FAILED khi lỗi mạng", async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json({ message: ["Đơn đã hết hạn", "Vui lòng đặt lại"] }, { status: 400 }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", request);
    await expect(createPayment("ORD-demo", "WALLET", "key")).rejects.toThrow("Đơn đã hết hạn, Vui lòng đặt lại");
    await expect(getPayment("PAY-demo")).rejects.toThrow("Không kết nối được máy chủ thanh toán");
  });

  it("401 của phiên hiện tại đăng xuất, 403 không đăng xuất", async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json({ message: "Không có quyền" }, { status: 403 }))
      .mockResolvedValueOnce(Response.json({ message: "Token hết hạn" }, { status: 401 }));
    vi.stubGlobal("fetch", request);
    await expect(getPayment("PAY-demo")).rejects.toMatchObject({ status: 403 });
    expect(getStoredToken()).toBe(TEST_PAYMENT_TOKEN);
    await expect(getPayment("PAY-demo")).rejects.toMatchObject({ status: 401 });
    expect(getStoredToken()).toBeNull();
  });

  it("phản hồi 401 cũ không làm mất phiên mới", async () => {
    const pending = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => pending.promise));
    const request = getPayment("PAY-demo");
    saveAuth("new-token", { id: "customer-b", email: "b@example.test", loyaltyPoints: 0 });
    pending.resolve(Response.json({ message: "Old token" }, { status: 401 }));
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(getStoredToken()).toBe("new-token");
  });

  it("đọc đơn để chọn phương thức và chặn sai orderId", async () => {
    const request = vi.fn().mockResolvedValue(Response.json(paymentOrderFixture()));
    vi.stubGlobal("fetch", request);
    await expect(getPaymentOrder("ORD-demo")).resolves.toMatchObject({ total: 50000, cancellationPending: false });
    request.mockResolvedValueOnce(Response.json(paymentOrderFixture({ id: "ORD-other" })));
    await expect(getPaymentOrder("ORD-demo")).rejects.toThrow("không đúng định dạng");
  });

  it("mã đầu vào sai không gọi API", async () => {
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    await expect(createPayment("../orders", "WALLET", "key")).rejects.toThrow("không hợp lệ");
    await expect(createPayment("ORD-demo", "WALLET", "")).rejects.toThrow("không hợp lệ");
    expect(request).not.toHaveBeenCalled();
  });

  it("QR chọn IP LAN thay localhost, bỏ URL cấu hình sai và định dạng đồng hồ", () => {
    expect(publicAppOrigin("http://192.168.1.2:3000", "http://localhost:3000")).toBe("http://192.168.1.2:3000");
    expect(publicAppOrigin("http://localhost:3000", "https://web.example/any-path")).toBe("https://web.example");
    expect(publicAppOrigin("http://localhost:3000", "javascript:alert(1)")).toBe("http://localhost:3000");
    expect(formatPaymentRemaining(90_000)).toBe("01:30");
    expect(formatPaymentRemaining(-1000)).toBe("00:00");
  });
});
