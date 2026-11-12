import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithQuery } from "@/test/render";
import { useCart } from "@/store/useCart";
import CartVoucherSummary from "./CartVoucherSummary";
import type { VoucherQuote } from "@/lib/vouchers";

const auth = vi.hoisted(() => ({ token: null as string | null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));
const cartItem = {
  productId: "p1",
  name: "Americano",
  imageUrl: "/images/americano.jpg",
  size: "M" as const,
  toppingIds: ["cream"],
  qty: 2,
  unitPrice: 1,
};
const quote: VoucherQuote = {
  subtotal: 80000,
  discount: 8000,
  total: 72000,
  voucherCode: "BREW10",
  voucherTitle: "Giảm 10%",
  serverTime: "2026-11-12T10:00:00Z",
  vouchers: [],
  voucherUsage: null,
};
const request = vi.fn();
beforeEach(() => {
  localStorage.clear();
  auth.token = null;
  request.mockReset();
  useCart.setState({ items: [cartItem], voucherCode: "BREW10" });
  vi.stubGlobal("fetch", request);
});

describe("WEB-T63 — cart voucher handoff component", () => {
  it("uses server totals and existing PriceSummary rather than trusting client unitPrice", async () => {
    request.mockResolvedValue(Response.json(quote));
    renderWithQuery(<CartVoucherSummary />);
    await screen.findByText("Tổng thanh toán");
    expect(
      screen.getByText("Tổng thanh toán").nextElementSibling?.textContent,
    ).toContain("72.000");
    expect(screen.getByText("Đã áp dụng BREW10")).toBeVisible();
    const body = JSON.parse(request.mock.calls[0][1].body);
    expect(body.items[0]).not.toHaveProperty("unitPrice");
  });
  it("shows quote errors and retry, without displaying a fabricated payable total", async () => {
    request
      .mockResolvedValueOnce(
        Response.json({ message: "Mã giảm giá đã hết hạn." }, { status: 400 }),
      )
      .mockResolvedValue(Response.json(quote));
    renderWithQuery(<CartVoucherSummary />);
    await screen.findByText("Mã giảm giá đã hết hạn.");
    expect(screen.queryByText("Tổng thanh toán")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Thử lấy báo giá lại" }),
    );
    await screen.findByText("Tổng thanh toán");
  });
  it("removes the selected voucher through Mai's existing store setter", async () => {
    request.mockImplementation(async (_url, options) =>
      JSON.parse(options.body).voucherCode
        ? Response.json(quote)
        : Response.json({
            ...quote,
            discount: 0,
            total: 80000,
            voucherCode: null,
            voucherTitle: null,
          }),
    );
    renderWithQuery(<CartVoucherSummary />);
    await screen.findByText("Đã áp dụng BREW10");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ mã" }));
    await waitFor(() => expect(useCart.getState().voucherCode).toBe(""));
    await waitFor(() =>
      expect(
        screen.getByText("Tổng thanh toán").nextElementSibling?.textContent,
      ).toContain("80.000"),
    );
  });
  it("does not reuse the previous account's quote while the next account loads", async () => {
    auth.token = "account-A";
    request.mockImplementation(async (_url, options) =>
      options.headers.Authorization === "Bearer account-B"
        ? new Promise(() => {})
        : Response.json(quote),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const view = render(
      <QueryClientProvider client={client}>
        <CartVoucherSummary />
      </QueryClientProvider>,
    );
    await screen.findByText("Tổng thanh toán");
    auth.token = "account-B";
    view.rerender(
      <QueryClientProvider client={client}>
        <CartVoucherSummary />
      </QueryClientProvider>,
    );
    expect(screen.queryByText("Tổng thanh toán")).not.toBeInTheDocument();
    expect(screen.getByText("Đang lấy báo giá từ hệ thống…")).toBeVisible();
    await waitFor(() =>
      expect(request.mock.calls.at(-1)?.[1].headers.Authorization).toBe(
        "Bearer account-B",
      ),
    );
  });
  it("does not request quotes for an empty cart", () => {
    useCart.setState({ items: [], voucherCode: "" });
    renderWithQuery(<CartVoucherSummary />);
    expect(
      screen.queryByRole("region", { name: "Ưu đãi và tổng tiền giỏ hàng" }),
    ).not.toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });
});
