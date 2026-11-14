import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "@/test/render";
import { bankFixture, deferred } from "@/test/payment-fixtures";
import MockBankTransfer from "./MockBankTransfer";

describe("WEB-T84 — public mock bank", () => {
  beforeEach(() => localStorage.clear());

  it("loads without login and submits no editable amount, credentials or order content", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(bankFixture()))
      .mockResolvedValue(Response.json(bankFixture({ status: "TRANSFER_RECEIVED", receivedAt: "2026-11-13T08:01:00.000Z" })));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<MockBankTransfer paymentId="PAY-demo" />);
    fireEvent.click(await screen.findByRole("button", { name: "Chuyển tiền (mô phỏng)" }));
    expect(await screen.findByRole("heading", { name: "Đã ghi nhận chuyển tiền" })).toBeVisible();
    expect(screen.getByText("ORD-demo")).toBeVisible();
    expect(screen.getByText(/không dùng tiền thật/)).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    const [url, init] = fetcher.mock.calls[1];
    expect(url).toBe("/api/mock-bank/PAY-demo");
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(screen.queryByRole("button", { name: "Chuyển tiền (mô phỏng)" })).not.toBeInTheDocument();
  });

  it("blocks double clicking and waits for the real response", async () => {
    const pending = deferred<Response>();
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(bankFixture())).mockImplementation(() => pending.promise);
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<MockBankTransfer paymentId="PAY-demo" />);
    const button = await screen.findByRole("button", { name: "Chuyển tiền (mô phỏng)" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(Response.json(bankFixture({ status: "TRANSFER_RECEIVED", receivedAt: "2026-11-13T08:01:00.000Z" }))));
    await screen.findByRole("heading", { name: "Đã ghi nhận chuyển tiền" });
  });

  it.each([
    { method: "CARD" as const },
    { orderStatus: "CANCELLED" as const },
    { status: "FAILED" as const },
    { expiresAt: "2026-11-13T07:59:00.000Z" },
  ])("disallows transfer when not payable: %j", async (overrides) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(bankFixture(overrides))));
    renderWithQuery(<MockBankTransfer paymentId="PAY-demo" />);
    await screen.findByText("ORD-demo");
    expect(screen.queryByRole("button", { name: "Chuyển tiền (mô phỏng)" })).not.toBeInTheDocument();
  });

  it("keeps received money waiting after expiry, rather than calling it cancelled", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(bankFixture({
      status: "TRANSFER_RECEIVED", receivedAt: "2026-11-13T07:58:00.000Z", expiresAt: "2026-11-13T07:59:00.000Z",
    }))));
    renderWithQuery(<MockBankTransfer paymentId="PAY-demo" />);
    expect(await screen.findByText(/Tiền đã vào sao kê giả lập/)).toBeVisible();
    expect(screen.queryByText(/Phiên đã đóng/)).not.toBeInTheDocument();
  });

  it("displays server errors then retries loading, without a fabricated success", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ message: "Không tìm thấy phiên" }, { status: 404 }))
      .mockResolvedValue(Response.json(bankFixture()));
    vi.stubGlobal("fetch", fetcher);
    renderWithQuery(<MockBankTransfer paymentId="PAY-demo" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy phiên");
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra lại" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Chuyển tiền (mô phỏng)" })).toBeEnabled());
  });
});
