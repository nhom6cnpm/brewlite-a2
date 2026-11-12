// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import CartPage from "@/app/cart/page";
import { formatPrice } from "@/lib/formatPrice";
import { useCart, type CartItem } from "@/store/useCart";
import { renderWithQuery } from "./render";
import type { VoucherCartItem, VoucherOption } from "@/lib/vouchers";

const coffee: CartItem = {
  productId: "p1",
  name: "Cà phê sữa",
  imageUrl: "/images/coffee.jpg",
  size: "M",
  toppingIds: [],
  qty: 1,
  unitPrice: 30000,
};

const peachTea: CartItem = {
  productId: "p2",
  name: "Trà đào",
  imageUrl: "/images/peach-tea.jpg",
  size: "L",
  toppingIds: [],
  qty: 1,
  unitPrice: 45000,
};

// formatPrice có thể chứa khoảng trắng đặc biệt; testing-library chuẩn hóa khoảng trắng
const priceText = (amount: number) => formatPrice(amount).replace(/\s+/g, " ");

const fetchMock = vi.fn();

const voucher: VoucherOption = {
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
  usage: null,
};

// Independent API fixtures: selected M coffee costs 30k, L tea costs 45k on the server.
function mockCartApi(stock = 5, availabilityFails = false) {
  fetchMock.mockImplementation(async (url: unknown, init?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    if (path === "/vouchers" && (!init?.method || init.method === "GET"))
      return Response.json([voucher]);

    const { items, voucherCode } = JSON.parse(String(init?.body)) as {
      items: VoucherCartItem[];
      voucherCode?: string;
    };
    if (path === "/products/availability") {
      if (availabilityFails)
        return new Response("lỗi máy chủ", { status: 500 });
      return Response.json({
        available: true,
        items: items.map((line) => ({ ...line, stock })),
      });
    }
    if (path === "/vouchers/quote") {
      if (voucherCode && !["THU5K", "NHAP7K"].includes(voucherCode))
        return Response.json(
          { message: "Mã giảm giá không tồn tại." },
          { status: 400 },
        );
      const prices: Record<string, number> = { p1: 30000, p2: 45000 };
      const subtotal = items.reduce(
        (sum, line) => sum + prices[line.productId] * line.qty,
        0,
      );
      const discount = voucherCode === "NHAP7K" ? 7000 : voucherCode ? 5000 : 0;
      return Response.json({
        subtotal,
        discount,
        total: subtotal - discount,
        voucherCode: voucherCode ?? null,
        voucherTitle: voucherCode ? `Ưu đãi ${voucherCode}` : null,
        serverTime: "2026-11-12T10:00:00Z",
        vouchers: [voucher],
        voucherUsage: null,
      });
    }
    throw new Error(`Unexpected cart API: ${path}`);
  });
}

const totalValue = () => screen.getByText("Tổng thanh toán").nextElementSibling;

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ items: [], voucherCode: "" });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
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

describe("Trang giỏ hàng", () => {
  it("WEB-T15: giỏ trống hiện 'Giỏ hàng trống' và nút về Menu", async () => {
    renderWithQuery(<CartPage />);
    expect(await screen.findByText("Giỏ hàng trống")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về Menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("WEB-T16: đổi số lượng thì tổng tiền đổi; xóa dòng thì dòng biến mất", async () => {
    mockCartApi(5);
    useCart.setState({ items: [coffee, peachTea] });
    renderWithQuery(<CartPage />);

    expect(await screen.findByText("Cà phê sữa")).toBeInTheDocument();
    await waitFor(() =>
      expect(totalValue()).toHaveTextContent(priceText(75000)),
    );

    const plusButtons = screen.getAllByRole("button", {
      name: "Tăng số lượng",
    });
    await waitFor(() => expect(plusButtons[0]).toBeEnabled());
    fireEvent.click(plusButtons[0]);
    await waitFor(() =>
      expect(totalValue()).toHaveTextContent(priceText(105000)),
    );
    expect(useCart.getState().items[0].qty).toBe(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Xóa" })[1]);
    expect(screen.queryByText("Trà đào")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(totalValue()).toHaveTextContent(priceText(60000)),
    );
  });

  it("WEB-T17: khóa nút '+' và báo rõ khi số lượng đã bằng số ly còn bán", async () => {
    mockCartApi(1);
    useCart.setState({ items: [coffee] });
    renderWithQuery(<CartPage />);

    expect(await screen.findByText(/Chỉ còn 1 ly/)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Tăng số lượng" }),
      ).toBeDisabled(),
    );
    expect(fetchMock).toHaveBeenCalled();
    const availabilityRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/products/availability"),
    );
    expect(availabilityRequest?.[1]?.method).toBe("POST");
  });

  it("WEB-T18: API lỗi thì hiện lỗi, khóa nút '+' và cho thử kiểm tra lại", async () => {
    mockCartApi(5, true);
    useCart.setState({ items: [coffee] });
    renderWithQuery(<CartPage />);

    expect(
      await screen.findByText(/Không kiểm tra được nguyên liệu/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();

    mockCartApi(5);
    fireEvent.click(screen.getByRole("button", { name: "Thử kiểm tra lại" }));
    expect(
      await screen.findByText(/Đủ nguyên liệu theo lựa chọn hiện tại/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Tăng số lượng" }),
      ).toBeEnabled(),
    );
  });

  it("WEB-T64: chọn voucher ngay trong giỏ, hiện tiền giảm, báo giá lại khi đổi số lượng và bỏ mã", async () => {
    mockCartApi();
    useCart.setState({ items: [coffee, peachTea] });
    renderWithQuery(<CartPage />);

    await screen.findByText("Tổng thanh toán");
    fireEvent.click(screen.getByRole("button", { name: "Chọn hoặc nhập mã" }));
    fireEvent.click(await screen.findByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));

    await screen.findByText("Đã áp dụng THU5K");
    expect(useCart.getState().voucherCode).toBe("THU5K");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Tổng kết thanh toán" });
    expect(within(summary).getByText(`−${priceText(5000)}`)).toBeVisible();
    expect(totalValue()).toHaveTextContent(priceText(70000));

    const plus = screen.getAllByRole("button", { name: "Tăng số lượng" })[0];
    await waitFor(() => expect(plus).toBeEnabled());
    fireEvent.click(plus);
    await waitFor(() =>
      expect(totalValue()).toHaveTextContent(priceText(100000)),
    );

    fireEvent.click(screen.getByRole("button", { name: "Bỏ mã" }));
    await waitFor(() =>
      expect(totalValue()).toHaveTextContent(priceText(105000)),
    );
    expect(useCart.getState().voucherCode).toBe("");
    expect(screen.queryByText("Voucher THU5K")).not.toBeInTheDocument();
  });

  it("WEB-T65: mã nhập sai hiện lý do, mã nhập tay hợp lệ chỉ áp vào giỏ sau xác nhận", async () => {
    mockCartApi();
    useCart.setState({ items: [coffee, peachTea] });
    renderWithQuery(<CartPage />);
    await screen.findByText("Tổng thanh toán");
    fireEvent.click(screen.getByRole("button", { name: "Chọn hoặc nhập mã" }));
    const input = screen.getByLabelText("Nhập mã giảm giá");
    fireEvent.change(input, { target: { value: "SAIMA" } });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mã giảm giá không tồn tại.",
    );
    expect(useCart.getState().voucherCode).toBe("");
    expect(totalValue()).toHaveTextContent(priceText(75000));

    fireEvent.change(input, { target: { value: " nhap7k " } });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" }));
    await screen.findByText(/Mã NHAP7K hợp lệ/);
    expect(useCart.getState().voucherCode).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await screen.findByText("Đã áp dụng NHAP7K");
    expect(useCart.getState().voucherCode).toBe("NHAP7K");
    expect(totalValue()).toHaveTextContent(priceText(68000));
  });
});
