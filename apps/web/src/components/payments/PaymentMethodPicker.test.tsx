import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "@/test/render";
import { deferred, loginPaymentUser, paymentFixture, paymentOrderFixture } from "@/test/payment-fixtures";
import PaymentMethodPicker from "./PaymentMethodPicker";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const response = (data: unknown, status = 200) => Response.json(data, { status });

describe("WEB-T82 — payment method picker", () => {
  beforeEach(() => {
    localStorage.clear();
    loginPaymentUser();
    router.push.mockReset();
    router.replace.mockReset();
  });

  it("requires login without requesting a private order", async () => {
    localStorage.clear();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<PaymentMethodPicker orderId="ORD-demo" />);
    expect(await screen.findByRole("heading", { name: "Đăng nhập để thanh toán" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/login?redirect=%2Fpay%2Forder%2FORD-demo");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rechecks the order and creates CARD using only the server order and a key", async () => {
    const fetcher = vi.fn().mockImplementation((_url: string, init: RequestInit) =>
      Promise.resolve(response(init.method === "POST" ? paymentFixture({ method: "CARD" }) : paymentOrderFixture())));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<PaymentMethodPicker orderId="ORD-demo" />);
    fireEvent.click(await screen.findByRole("radio", { name: /Thẻ tại quầy/ }));
    fireEvent.click(screen.getByRole("button", { name: /Thanh toán ·/ }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pay/PAY-demo"));
    const calls = fetcher.mock.calls;
    expect(calls.filter(([, init]) => init.method !== "POST")).toHaveLength(2);
    const init = calls.find(([, init]) => init.method === "POST")![1];
    expect(JSON.parse(init.body as string)).toEqual({ orderId: "ORD-demo", method: "CARD" });
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBeTruthy();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("blocks duplicate submits while the response is pending", async () => {
    const pending = deferred<Response>();
    const fetcher = vi.fn().mockImplementation((_url: string, init: RequestInit) =>
      init.method === "POST" ? pending.promise : Promise.resolve(response(paymentOrderFixture())));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<PaymentMethodPicker orderId="ORD-demo" />);
    const button = await screen.findByRole("button", { name: /Thanh toán ·/ });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(fetcher.mock.calls.filter(([, init]) => init.method === "POST")).toHaveLength(1));
    expect(button).toBeDisabled();
    await act(async () => pending.resolve(response(paymentFixture())));
    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
  });

  it("does not charge when the order was cancelled between load and click", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(paymentOrderFixture()))
      .mockResolvedValueOnce(response(paymentOrderFixture({ status: "CANCELLED", canPay: false })));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<PaymentMethodPicker orderId="ORD-demo" />);
    fireEvent.click(await screen.findByRole("button", { name: /Thanh toán ·/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("không còn chờ thanh toán");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each([
    { status: "CANCELLED", canPay: false },
    { expiresAt: "2026-11-13T07:59:00.000Z", canPay: false },
    { cancelRequest: { id: "cancel-demo", status: "PENDING" } },
  ])("blocks closed, expired or cancellation-pending orders: %j", async (overrides) => {
    const fetcher = vi.fn().mockResolvedValue(response(paymentOrderFixture(overrides)));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<PaymentMethodPicker orderId="ORD-demo" />);
    await screen.findByRole("heading", { name: "Chọn cách thanh toán" });
    expect(screen.queryByRole("button", { name: /Thanh toán ·/ })).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("can reopen an already received transfer after the countdown ends", async () => {
    const fetcher = vi.fn().mockImplementation((_url: string, init: RequestInit) => Promise.resolve(response(
      init.method === "POST" ? paymentFixture({ status: "TRANSFER_RECEIVED", receivedAt: "2026-11-13T07:58:00.000Z" }) :
        paymentOrderFixture({ canPay: false, transferReceived: true, expiresAt: "2026-11-13T07:59:00.000Z" }),
    )));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<PaymentMethodPicker orderId="ORD-demo" />);
    fireEvent.click(await screen.findByRole("button", { name: "Mở phiên đang chờ" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/pay/PAY-demo"));
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows backend errors and can reload the real order", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ message: "Không được xem đơn này" }, 403))
      .mockResolvedValue(response(paymentOrderFixture()));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<PaymentMethodPicker orderId="ORD-demo" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không được xem đơn này");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("radio", { name: /Ví điện tử/ })).toBeChecked();
  });
});
