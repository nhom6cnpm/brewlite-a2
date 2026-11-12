// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import CartPage from "@/app/cart/page";
import { formatPrice } from "@/lib/formatPrice";
import { useCart, type CartItem } from "@/store/useCart";
import { renderWithQuery } from "./render";

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

// Trả về số ly còn bán `stock` cho từng dòng trong body của POST /products/availability
function mockAvailability(stock: number) {
  fetchMock.mockImplementation(async (_url: unknown, init?: RequestInit) => {
    const { items } = JSON.parse(String(init?.body)) as {
      items: Record<string, unknown>[];
    };
    return new Response(
      JSON.stringify({
        available: true,
        items: items.map((line) => ({ ...line, stock })),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
}

const totalValue = () => screen.getByText("Tổng thanh toán").nextElementSibling;

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ items: [], voucherCode: "" });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
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
    mockAvailability(5);
    useCart.setState({ items: [coffee, peachTea] });
    renderWithQuery(<CartPage />);

    expect(await screen.findByText("Cà phê sữa")).toBeInTheDocument();
    expect(totalValue()).toHaveTextContent(priceText(75000));

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
    expect(totalValue()).toHaveTextContent(priceText(60000));
  });

  it("WEB-T17: khóa nút '+' và báo rõ khi số lượng đã bằng số ly còn bán", async () => {
    mockAvailability(1);
    useCart.setState({ items: [coffee] });
    renderWithQuery(<CartPage />);

    expect(await screen.findByText(/Chỉ còn 1 ly/)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Tăng số lượng" }),
      ).toBeDisabled(),
    );
    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/products/availability",
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });

  it("WEB-T18: API lỗi thì hiện lỗi, khóa nút '+' và cho thử kiểm tra lại", async () => {
    fetchMock.mockImplementation(
      async () => new Response("lỗi máy chủ", { status: 500 }),
    );
    useCart.setState({ items: [coffee] });
    renderWithQuery(<CartPage />);

    expect(
      await screen.findByText(/Không kiểm tra được nguyên liệu/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();

    mockAvailability(5);
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
});
