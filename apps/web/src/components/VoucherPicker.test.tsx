import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithQuery } from "@/test/render";
import VoucherPicker from "./VoucherPicker";
import type {
  VoucherOption,
  VoucherQuote,
  VoucherQuoteRequest,
} from "@/lib/vouchers";

const items = [{ productId: "p1", size: "S" as const, toppingIds: [], qty: 2 }];
const option: VoucherOption = {
  code: "THU5K",
  title: "Giảm 5.000đ cho đơn từ 30.000đ",
  discountType: "FIXED",
  discountValue: 5000,
  minSubtotal: 30000,
  maxDiscount: null,
  startsAt: "2026-11-01T00:00:00Z",
  endsAt: "2026-12-01T00:00:00Z",
  unavailableReason: null,
  discount: 5000,
  maxUsesPerUser: 3,
  usage: { maxUsesPerUser: 3, reservedUses: 0, usedUses: 0, availableUses: 3 },
};
const quote: VoucherQuote = {
  subtotal: 60000,
  discount: 0,
  total: 60000,
  voucherCode: null,
  voucherTitle: null,
  serverTime: "2026-11-11T10:00:00Z",
  voucherUsage: null,
  vouchers: [option],
};
const checked = (code: string): VoucherQuote => ({
  ...quote,
  voucherCode: code,
  voucherTitle: option.title,
  discount: 5000,
  total: 55000,
});
function props(
  request: VoucherQuoteRequest = vi.fn(async (_items, code) =>
    code ? checked(code) : quote,
  ),
) {
  return {
    items,
    selectedCode: "",
    onSelect: vi.fn(),
    request,
    token: "account-A",
  };
}
function open() {
  fireEvent.click(screen.getByRole("button", { name: "Chọn hoặc nhập mã" }));
}

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});

describe("WEB-T61 — voucher selection UI", () => {
  it("shows a top-corner x3 badge and hides x1", async () => {
    const request = vi.fn(async () => ({
      ...quote,
      vouchers: [
        option,
        {
          ...option,
          code: "ONE",
          usage: { ...option.usage!, usedUses: 2, availableUses: 1 },
        },
      ],
    }));
    renderWithQuery(<VoucherPicker {...props(request)} />);
    open();
    expect(await screen.findByText("x3")).toHaveClass(
      "absolute",
      "right-0",
      "top-0",
    );
    expect(screen.queryByText("x1")).not.toBeInTheDocument();
  });
  it("keeps selection as a draft and revalidates it on confirmation", async () => {
    const p = props();
    renderWithQuery(<VoucherPicker {...p} />);
    open();
    fireEvent.click(await screen.findByRole("radio"));
    expect(p.onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(p.onSelect).toHaveBeenCalledWith("THU5K"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("accepts a manually entered hidden code without adding it to the public list", async () => {
    const p = props();
    renderWithQuery(<VoucherPicker {...p} />);
    open();
    await screen.findByRole("radio");
    fireEvent.change(screen.getByLabelText("Nhập mã giảm giá"), {
      target: { value: " nhap7k " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" }));
    await screen.findByText(/Mã NHAP7K hợp lệ/);
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(p.onSelect).toHaveBeenCalledWith("NHAP7K"));
  });
  it("disables ineligible codes and explains why", async () => {
    renderWithQuery(
      <VoucherPicker
        {...props(
          vi.fn(async () => ({
            ...quote,
            vouchers: [
              { ...option, unavailableReason: "Chưa đủ giá trị tối thiểu." },
            ],
          })),
        )}
      />,
    );
    open();
    expect(await screen.findByRole("radio")).toBeDisabled();
    expect(screen.getByText("Chưa đủ giá trị tối thiểu.")).toBeVisible();
  });
  it("supports removing a selected code and shows an applied discount", () => {
    const p = { ...props(), selectedCode: "THU5K", appliedDiscount: 5000 };
    renderWithQuery(<VoucherPicker {...p} />);
    expect(screen.getByText("Đã áp dụng THU5K")).toBeVisible();
    expect(screen.getByLabelText("Khoản giảm đã áp dụng")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ mã" }));
    expect(p.onSelect).toHaveBeenCalledWith("");
  });
  it("locks both change and removal after an order is created", () => {
    const p = { ...props(), selectedCode: "THU5K", locked: true };
    renderWithQuery(<VoucherPicker {...p} />);
    expect(
      screen.getByRole("button", { name: "Chọn hoặc nhập mã" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bỏ mã" })).toBeDisabled();
  });
  it("does not open for an empty cart", () => {
    renderWithQuery(<VoucherPicker {...props()} items={[]} />);
    expect(
      screen.getByRole("button", { name: "Chọn hoặc nhập mã" }),
    ).toBeDisabled();
  });
});

describe("WEB-T62 — voucher loading/errors and stale results", () => {
  it("shows a list load error, supports retry and empty state", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("API chưa sẵn sàng."))
      .mockResolvedValue({ ...quote, vouchers: [] });
    renderWithQuery(<VoucherPicker {...props(request)} />);
    open();
    await screen.findByText("API chưa sẵn sàng.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText(/Hiện chưa có mã ưu đãi công khai/);
  });
  it("keeps the dialog open when a code becomes invalid at confirmation", async () => {
    const request = vi.fn(async (_items, code) => {
      if (code) throw new Error("Mã giảm giá đã hết hạn.");
      return quote;
    });
    const p = props(request);
    renderWithQuery(<VoucherPicker {...p} />);
    open();
    fireEvent.click(await screen.findByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await screen.findByText("Mã giảm giá đã hết hạn.");
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(p.onSelect).not.toHaveBeenCalled();
  });
  it("discards an in-flight confirmation after the account changes", async () => {
    let resolve!: (data: VoucherQuote) => void;
    let pendingSignal: AbortSignal | undefined;
    const request: VoucherQuoteRequest = vi.fn(async (_items, code, signal) => {
      if (!code) return quote;
      pendingSignal = signal;
      return new Promise<VoucherQuote>((done) => {
        resolve = done;
      });
    });
    const p = props(request);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const view = render(
      <QueryClientProvider client={client}>
        <VoucherPicker {...p} />
      </QueryClientProvider>,
    );
    open();
    fireEvent.click(await screen.findByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    view.rerender(
      <QueryClientProvider client={client}>
        <VoucherPicker {...p} token="account-B" />
      </QueryClientProvider>,
    );
    expect(pendingSignal?.aborted).toBe(true);
    resolve(checked("THU5K"));
    await waitFor(() => expect(p.onSelect).not.toHaveBeenCalled());
  });
});
