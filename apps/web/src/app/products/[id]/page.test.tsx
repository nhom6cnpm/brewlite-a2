import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductDetailPage from "./page";
import { renderWithQuery } from "@/test/render";
import { useCart, type CartItem } from "@/store/useCart";
import type { AvailabilityLine } from "@/lib/availability";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "coffee" }) }));

const product = {
  id: "coffee", name: "Cà phê sữa", price: 25000, imageUrl: "/images/coffee.jpg",
};

function responseFor(lines: readonly AvailabilityLine[], stock = 5) {
  const items = lines.map((line) => ({ ...line, stock }));
  return Response.json({ available: items.every((item) => item.qty <= item.stock), items });
}

function mockApi(reply: (lines: AvailabilityLine[], call: number) => Response | Promise<Response> = (lines) => responseFor(lines)) {
  let call = 0;
  const request = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) === "http://localhost:3001/products/coffee") return Response.json(product);
    if (String(url) === "http://localhost:3001/products/availability") {
      const { items } = JSON.parse(String(init?.body)) as { items: AvailabilityLine[] };
      return reply(items, ++call);
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  vi.stubGlobal("fetch", request);
  return request;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

const addButton = () => screen.getByRole("button", { name: "Thêm vào giỏ hàng" });
const quantityInput = () => screen.getByRole("spinbutton", { name: "Số lượng ly" });
const cartItem: CartItem = {
  productId: "tea", name: "Trà đào", imageUrl: "/images/peach-tea.jpg",
  size: "S", toppingIds: [], qty: 2, unitPrice: 30000,
};

beforeEach(() => {
  useCart.setState({ items: [], voucherCode: "" });
  localStorage.clear();
});

describe("Chi tiết món — trạng thái dữ liệu Sprint 1", () => {
  it("hiển thị trạng thái tải khi chờ API", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    renderWithQuery(<ProductDetailPage />);
    expect(screen.getByLabelText("Đang tải thông tin món")).toHaveAttribute("aria-busy", "true");
  });

  it("giữ ảnh, tên, giá gốc và link menu khi sản phẩm chưa có stock", async () => {
    const request = mockApi();
    renderWithQuery(<ProductDetailPage />);
    expect(await screen.findByRole("heading", { level: 1, name: "Cà phê sữa" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Cà phê sữa" })).toHaveAttribute("src", "/images/coffee.jpg");
    expect(screen.getByRole("link", { name: /Quay lại thực đơn/ })).toHaveAttribute("href", "/menu");
    expect(screen.getByLabelText("Đơn giá")).toHaveTextContent("25.000đ");
    expect(request).toHaveBeenCalledWith("http://localhost:3001/products/coffee", expect.any(Object));
    await waitFor(() => expect(addButton()).toBeEnabled());
  });

  it("báo món không tồn tại khi API trả 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    renderWithQuery(<ProductDetailPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm không tồn tại");
    expect(screen.getByRole("link", { name: "Về thực đơn" })).toHaveAttribute("href", "/menu");
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
  });

  it("cho thử lại khi API món lỗi", async () => {
    const request = mockApi();
    request.mockResolvedValueOnce(new Response(null, { status: 500 }));
    renderWithQuery(<ProductDetailPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được thông tin món");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("heading", { name: "Cà phê sữa" })).toBeInTheDocument();
    await waitFor(() => expect(addButton()).toBeEnabled());
  });

  it("báo lỗi nếu API trả sai sản phẩm", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...product, id: "other" })));
    renderWithQuery(<ProductDetailPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được thông tin món");
  });
});

describe("Issue #29 — Size, topping, nguyên liệu và thêm giỏ", () => {
  it("WEB-T20: đổi size/topping và số lượng cập nhật giá", async () => {
    mockApi();
    renderWithQuery(<ProductDetailPage />);
    await screen.findByRole("radio", { name: /Size M/ });
    fireEvent.click(screen.getByRole("radio", { name: /Size M/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Kem béo/ }));
    fireEvent.change(quantityInput(), { target: { value: "2" } });
    expect(screen.getByLabelText("Đơn giá")).toHaveTextContent("35.000đ");
    expect(screen.getByLabelText("Thành tiền")).toHaveTextContent("70.000đ");
    fireEvent.click(screen.getByRole("checkbox", { name: /Kem béo/ }));
    expect(screen.getByLabelText("Đơn giá")).toHaveTextContent("30.000đ");
    await waitFor(() => expect(addButton()).toBeEnabled());
  });

  it("WEB-T21: hết nguyên liệu khóa tăng số lượng và thêm giỏ", async () => {
    mockApi((lines) => responseFor(lines, 0));
    renderWithQuery(<ProductDetailPage />);
    expect(await screen.findByText("Chỉ còn 0 ly theo lựa chọn này")).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();
    expect(useCart.getState().items).toEqual([]);
  });

  it("WEB-T22: kiểm tra đúng lựa chọn/số lượng rồi thêm vào store thật", async () => {
    const request = mockApi();
    renderWithQuery(<ProductDetailPage />);
    await screen.findByRole("radio", { name: /Size M/ });
    fireEvent.click(screen.getByRole("radio", { name: /Size M/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Trân châu/ }));
    fireEvent.change(quantityInput(), { target: { value: "2" } });
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(addButton());
    expect(await screen.findByText("Đã thêm 2 ly Cà phê sữa, size M vào giỏ hàng.")).toBeInTheDocument();
    expect(useCart.getState().items).toEqual([{
      productId: "coffee", name: product.name, imageUrl: product.imageUrl,
      size: "M", toppingIds: ["pearls"], qty: 2, unitPrice: 35000,
    }]);
    expect(request).toHaveBeenCalledWith("http://localhost:3001/products/availability", expect.objectContaining({
      body: JSON.stringify({ items: [{ productId: "coffee", size: "M", toppingIds: ["pearls"], qty: 2 }] }),
    }));
    await waitFor(() => expect(addButton()).toBeEnabled());
  });

  it("WEB-T23: đổi size không dùng số ly cũ trong lúc đang tải lựa chọn mới", async () => {
    const pending = deferred<Response>();
    mockApi((lines) => lines.at(-1)?.size === "M" ? pending.promise : responseFor(lines));
    renderWithQuery(<ProductDetailPage />);
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(screen.getByRole("radio", { name: /Size M/ }));
    expect(addButton()).toBeDisabled();
    expect(screen.getByText("Đang kiểm tra số ly còn bán…")).toBeInTheDocument();
    await act(async () => pending.resolve(responseFor([{ productId: "coffee", size: "M", toppingIds: [], qty: 1 }], 0)));
    expect(await screen.findByText("Chỉ còn 0 ly theo lựa chọn này")).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
  });

  it("WEB-T24: kho giảm giữa xem và thêm thì báo lỗi, không thêm", async () => {
    mockApi((lines, call) => responseFor(lines, call === 1 ? 5 : 0));
    renderWithQuery(<ProductDetailPage />);
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(addButton());
    expect(await screen.findByText(/Nguyên liệu vừa thay đổi, không đủ số ly/)).toBeInTheDocument();
    expect(useCart.getState().items).toEqual([]);
  });

  it("WEB-T25: API availability lỗi báo rõ và thử lại được", async () => {
    mockApi((lines, call) => call === 1
      ? Response.json({ message: "Kho tạm thời không kết nối được" }, { status: 503 })
      : responseFor(lines));
    renderWithQuery(<ProductDetailPage />);
    expect(await screen.findByText("Kho tạm thời không kết nối được")).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    expect(screen.queryByText("Chỉ còn 0 ly theo lựa chọn này")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử kiểm tra lại nguyên liệu" }));
    await waitFor(() => expect(addButton()).toBeEnabled());
    expect(screen.getByText("Chỉ còn 5 ly theo lựa chọn này")).toBeInTheDocument();
  });

  it.each(["0", "-1", "1.5", "6"])("WEB-T26: số lượng %s không hợp lệ hoặc vượt kho thì khóa thêm", async (value) => {
    mockApi();
    renderWithQuery(<ProductDetailPage />);
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.change(quantityInput(), { target: { value } });
    expect(addButton()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng chọn số lượng nguyên từ 1 đến 5 ly");
    expect(useCart.getState().items).toEqual([]);
  });

  it("WEB-T27: kiểm tra trước thêm mất mạng thì giữ giỏ và cho bấm lại", async () => {
    mockApi((lines, call) => {
      if (call === 2) throw new Error("Mất kết nối khi kiểm tra nguyên liệu");
      return responseFor(lines);
    });
    renderWithQuery(<ProductDetailPage />);
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(addButton());
    expect(await screen.findByText("Mất kết nối khi kiểm tra nguyên liệu")).toBeInTheDocument();
    expect(useCart.getState().items).toEqual([]);
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(addButton());
    expect(await screen.findByText(/Đã thêm 1 ly/)).toBeInTheDocument();
    expect(useCart.getState().items[0].qty).toBe(1);
    await waitFor(() => expect(addButton()).toBeEnabled());
  });

  it("WEB-T28: bấm liên tiếp khi kiểm tra chậm chỉ thêm một lần", async () => {
    const pending = deferred<Response>();
    let calls = 0;
    mockApi((lines, call) => { calls = call; return call === 2 ? pending.promise : responseFor(lines); });
    renderWithQuery(<ProductDetailPage />);
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(addButton());
    fireEvent.click(screen.getByRole("button", { name: "Đang kiểm tra…" }));
    expect(calls).toBe(2);
    await act(async () => pending.resolve(responseFor([{ productId: "coffee", size: "S", toppingIds: [], qty: 1 }])));
    expect(await screen.findByText(/Đã thêm 1 ly/)).toBeInTheDocument();
    expect(useCart.getState().items).toHaveLength(1);
    expect(useCart.getState().items[0].qty).toBe(1);
    await waitFor(() => expect(addButton()).toBeEnabled());
  });

  it("WEB-T29: số ly được kiểm tra cùng các món có sẵn trong giỏ", async () => {
    useCart.setState({ items: [cartItem] });
    const request = mockApi();
    renderWithQuery(<ProductDetailPage />);
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(addButton());
    expect(await screen.findByText(/Đã thêm 1 ly/)).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("http://localhost:3001/products/availability", expect.objectContaining({
      body: JSON.stringify({ items: [
        { productId: "tea", size: "S", toppingIds: [], qty: 2 },
        { productId: "coffee", size: "S", toppingIds: [], qty: 1 },
      ] }),
    }));
    expect(useCart.getState().items[0]).toEqual(cartItem);
    expect(useCart.getState().items).toHaveLength(2);
    await waitFor(() => expect(addButton()).toBeEnabled());
  });

  it("WEB-T30: không vượt tổng 99 ly của cùng lựa chọn khi gộp vào giỏ", async () => {
    useCart.setState({ items: [{ ...cartItem, productId: "coffee", qty: 98 }] });
    mockApi((lines) => {
      const items = lines.map((line, index) => ({ ...line, stock: index === 0 ? 200 : 10 }));
      return Response.json({ available: true, items });
    });
    renderWithQuery(<ProductDetailPage />);
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.change(quantityInput(), { target: { value: "2" } });
    expect(addButton()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("từ 1 đến 1 ly");
    fireEvent.change(quantityInput(), { target: { value: "1" } });
    fireEvent.click(addButton());
    expect(await screen.findByText(/Đã thêm 1 ly/)).toBeInTheDocument();
    expect(useCart.getState().items[0].qty).toBe(99);
    await waitFor(() => expect(addButton()).toBeDisabled());
  });

  it("WEB-T31: giỏ đổi trong lúc kiểm tra thì không thêm theo kết quả cũ", async () => {
    const pending = deferred<Response>();
    mockApi((lines, call) => call === 2 ? pending.promise : responseFor(lines));
    renderWithQuery(<ProductDetailPage />);
    await waitFor(() => expect(addButton()).toBeEnabled());
    fireEvent.click(addButton());
    act(() => useCart.getState().addItem(cartItem));
    await act(async () => pending.resolve(responseFor([{ productId: "coffee", size: "S", toppingIds: [], qty: 1 }])));
    expect(await screen.findByText("Giỏ hàng vừa thay đổi. Vui lòng kiểm tra và thử lại.")).toBeInTheDocument();
    expect(useCart.getState().items).toEqual([cartItem]);
    await waitFor(() => expect(addButton()).toBeEnabled());
  });
});
