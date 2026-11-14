import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "@/test/render";
import { loginPaymentUser, paymentFixture } from "@/test/payment-fixtures";
import PaymentSession from "./PaymentSession";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("WEB-T83 — payment polling and customer result", () => {
  beforeEach(() => {
    localStorage.clear();
    loginPaymentUser();
    router.replace.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("shows a real QR and a public mock-bank link, without a self-confirm action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(paymentFixture())));
    renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    expect(await screen.findByRole("img", { name: "Mã QR mở ngân hàng giả lập" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Mở ngân hàng giả lập" })).toHaveAttribute("href", "/mock-bank/PAY-demo");
    expect(screen.queryByRole("button", { name: /đã chuyển|xác nhận thanh toán/i })).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("polls every 3 seconds and redirects only after SUCCESS plus PAID", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(paymentFixture()))
      .mockResolvedValueOnce(Response.json(paymentFixture({ status: "SUCCESS", orderStatus: "PENDING" })))
      .mockResolvedValue(Response.json(paymentFixture({ status: "SUCCESS", orderStatus: "PAID" })));
    vi.stubGlobal("fetch", fetcher);
    const view = renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    await screen.findByRole("link", { name: "Mở ngân hàng giả lập" });
    await act(async () => { vi.advanceTimersByTime(2999); });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(1); });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(router.replace).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(3000); });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/orders/ORD-demo/confirmation"));
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(fetcher).toHaveBeenCalledTimes(3);
    view.unmount();
  });

  it("keeps received money waiting for staff after expiry, with no retry or second transfer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(paymentFixture({
      status: "TRANSFER_RECEIVED", receivedAt: "2026-11-13T07:58:00.000Z", expiresAt: "2026-11-13T07:59:00.000Z",
    }))));
    renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    expect(await screen.findByText(/Tiền đã về đúng hạn/)).toBeVisible();
    expect(screen.getByText(/Đã nhận tiền, đang chờ nhân viên/)).toBeVisible();
    expect(screen.queryByRole("link", { name: "Mở ngân hàng giả lập" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Thử lại" })).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("retries a rejected payment on the same order and keeps the cart", async () => {
    localStorage.setItem("brewlite-cart", "keep-this-cart");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(paymentFixture({
      status: "FAILED", orderStatus: "PAYMENT_FAILED", reviewNote: "Sai nội dung chuyển khoản",
    }))));
    renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sai nội dung chuyển khoản");
    expect(screen.getByRole("link", { name: "Thử lại" })).toHaveAttribute("href", "/pay/order/ORD-demo");
    expect(localStorage.getItem("brewlite-cart")).toBe("keep-this-cart");
  });

  it("gives cancellation priority over an old SUCCESS and does not redirect", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(paymentFixture({ status: "SUCCESS", orderStatus: "CANCELLED" }))));
    renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    expect(await screen.findByRole("heading", { name: "Đơn đã bị hủy hoặc hết hạn" })).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("continues following a rejected order until the server cancels it on expiry", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(paymentFixture({ status: "FAILED", orderStatus: "PAYMENT_FAILED" })))
      .mockResolvedValue(Response.json(paymentFixture({ status: "FAILED", orderStatus: "CANCELLED" })));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    await screen.findByRole("link", { name: "Thử lại" });
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(await screen.findByRole("heading", { name: "Đơn đã bị hủy hoặc hết hạn" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Thử lại" })).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("CARD only waits for staff, without a fake card-number form or mock transfer link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(paymentFixture({ method: "CARD" }))));
    renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    expect(await screen.findByText("Đang chờ nhân viên xác nhận thanh toán thẻ tại quầy.")).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mở ngân hàng giả lập" })).not.toBeInTheDocument();
  });

  it("hides the transfer action on polling errors and recovers with manual refresh", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(paymentFixture()))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValue(Response.json(paymentFixture()));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    await screen.findByRole("link", { name: "Mở ngân hàng giả lập" });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra trạng thái" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không kết nối được máy chủ thanh toán");
    expect(screen.queryByRole("link", { name: "Mở ngân hàng giả lập" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra trạng thái" }));
    expect(await screen.findByRole("link", { name: "Mở ngân hàng giả lập" })).toBeVisible();
  });

  it("clears an expired login on 401 and exposes no private payment", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Unauthorized" }, { status: 401 })));
    renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    expect(await screen.findByRole("heading", { name: "Đăng nhập để xem thanh toán" })).toBeVisible();
    expect(screen.queryByText("ORD-demo")).not.toBeInTheDocument();
  });

  it("stops polling on unmount", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const fetcher = vi.fn().mockResolvedValue(Response.json(paymentFixture()));
    vi.stubGlobal("fetch", fetcher);
    const view = renderWithQuery(<PaymentSession paymentId="PAY-demo" />);
    await screen.findByRole("img");
    view.unmount();
    await act(async () => { vi.advanceTimersByTime(9000); });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
