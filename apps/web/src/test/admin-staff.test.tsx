// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithQuery } from "./render";
import AdminGate from "@/components/admin/AdminGate";
import AdminNav from "@/components/admin/AdminNav";
import BankStatement from "@/components/admin/BankStatement";
import AdminPaymentsPage from "@/app/admin/payments/page";
import AdminIngredientsPage from "@/app/admin/ingredients/page";
import { listAdminPayments } from "@/lib/admin/payments";
import { AdminApiError } from "@/lib/admin/request";
import { formatPrice } from "@/lib/formatPrice";

const auth = vi.hoisted(() => ({
  token: "admin-token" as string | null,
  user: { id: "a1", email: "staff@brew.vn", loyaltyPoints: 0, role: "ADMIN" } as {
    id: string;
    email: string;
    loyaltyPoints: number;
    role?: string;
  } | null,
}));
const nav = vi.hoisted(() => ({ pathname: "/admin/payments" }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ ...auth, isAuthenticated: !!auth.token }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

const price = (n: number) => formatPrice(n).replace(/\s+/g, " ");
const NOW = new Date().toISOString();
const IN_10_MIN = new Date(Date.now() + 10 * 60_000).toISOString();

const payment = (overrides: Record<string, unknown> = {}) => ({
  paymentId: "PAY-1",
  orderId: "ORD-1",
  amount: 84000,
  method: "WALLET",
  status: "TRANSFER_RECEIVED",
  orderStatus: "PENDING",
  receivedAt: NOW,
  reviewNote: null,
  cancellationPending: false,
  createdAt: NOW,
  expiresAt: IN_10_MIN,
  serverTime: NOW,
  customerEmail: "khach@brew.vn",
  itemCount: 2,
  reviewedAt: null,
  ...overrides,
});

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) =>
  Promise.resolve(Response.json(body, { status }));

beforeEach(() => {
  auth.token = "admin-token";
  auth.user = { id: "a1", email: "staff@brew.vn", loyaltyPoints: 0, role: "ADMIN" };
  nav.pathname = "/admin/payments";
  localStorage.setItem("brewlite_token", "admin-token");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("WEB-T90 AdminGate: chỉ ADMIN mới thấy trang quản trị", () => {
  const child = (token: string) => <p>Nội dung admin {token}</p>;

  it("chưa đăng nhập: mời đăng nhập và quay lại đúng trang", () => {
    auth.token = null;
    auth.user = null;
    renderWithQuery(<AdminGate redirect="/admin/ingredients">{child}</AdminGate>);
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fadmin%2Fingredients",
    );
    expect(screen.queryByText(/Nội dung admin/)).not.toBeInTheDocument();
  });

  it("khách (CUSTOMER) bị chặn", () => {
    auth.user = { id: "c1", email: "k@brew.vn", loyaltyPoints: 3, role: "CUSTOMER" };
    renderWithQuery(<AdminGate redirect="/admin/payments">{child}</AdminGate>);
    expect(
      screen.getByRole("heading", { name: "Không có quyền truy cập" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Nội dung admin/)).not.toBeInTheDocument();
  });

  it("ADMIN thấy nội dung, nhận token", () => {
    renderWithQuery(<AdminGate redirect="/admin/payments">{child}</AdminGate>);
    expect(screen.getByText("Nội dung admin admin-token")).toBeInTheDocument();
  });
});

describe("WEB-T91 AdminNav", () => {
  it("có 4 tab và đánh dấu tab đang mở (kể cả trang con)", () => {
    nav.pathname = "/admin/history/ORD-1";
    renderWithQuery(<AdminNav />);
    const links = within(screen.getByRole("navigation", { name: "Quản trị" }))
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("aria-current")]);
    expect(links).toEqual([
      ["Thanh toán", null],
      ["Đơn hàng", null],
      ["Lịch sử đơn", "page"],
      ["Nguyên liệu", null],
    ]);
  });
});

describe("WEB-T92 Tab Thanh toán", () => {
  it("hiện phiên đang chờ, xác nhận gửi POST confirm kèm JWT", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json(payment({ status: "SUCCESS", orderStatus: "PAID" }))
        : json([payment()]),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithQuery(<AdminPaymentsPage />);
    const card = (await screen.findByText("ORD-1")).closest("li")!;
    expect(within(card).getByText("Tiền đã về")).toBeInTheDocument();
    expect(within(card).getByText(price(84000))).toBeInTheDocument();
    expect(within(card).getByText(/khach@brew\.vn · 2 món/)).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Xác nhận đã nhận tiền" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3001/admin/payments/PAY-1/confirm",
        expect.objectContaining({ method: "POST", body: "{}" }),
      ),
    );
    const [, init] = fetchMock.mock.calls.find(([, i]) => i?.method === "POST")!;
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer admin-token",
    });
    expect(await screen.findByText("Đã xác nhận đơn ORD-1 → PAID")).toBeInTheDocument();
  });

  it("từ chối hỏi lý do (báo sẽ hoàn tiền) và gửi kèm ghi chú", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json(payment({ status: "FAILED", orderStatus: "PAYMENT_FAILED" }))
        : json([payment()]),
    );
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("Sai số tiền");
    renderWithQuery(<AdminPaymentsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Từ chối" }));
    expect(prompt.mock.calls[0][0]).toContain(`hoàn ${formatPrice(84000)}`);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3001/admin/payments/PAY-1/reject",
        expect.objectContaining({ body: JSON.stringify({ note: "Sai số tiền" }) }),
      ),
    );
  });

  it("bấm Hủy ở hộp thoại thì không gửi gì", async () => {
    fetchMock.mockImplementation(() => json([payment()]));
    vi.spyOn(window, "confirm").mockReturnValue(false);
    vi.spyOn(window, "prompt").mockReturnValue(null);
    renderWithQuery(<AdminPaymentsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận đã nhận tiền" }));
    fireEvent.click(screen.getByRole("button", { name: "Từ chối" }));
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === "POST")).toBe(false);
  });

  it("đơn đang chờ duyệt hủy: khóa nút xác nhận/từ chối", async () => {
    fetchMock.mockImplementation(() => json([payment({ cancellationPending: true })]));
    renderWithQuery(<AdminPaymentsPage />);
    expect(await screen.findByText(/Đơn đang chờ duyệt hủy/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xác nhận đã nhận tiền" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Từ chối" })).toBeDisabled();
  });

  it("lỗi xác nhận (đơn hết hạn) hiện thông báo của server", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ message: "Đơn đã hết hạn hoặc bị hủy", statusCode: 400 }, 400)
        : json([payment()]),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithQuery(<AdminPaymentsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận đã nhận tiền" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Đơn đã hết hạn hoặc bị hủy");
  });

  it("403 từ API: báo không có quyền", async () => {
    fetchMock.mockImplementation(() => json({ message: "Forbidden" }, 403));
    renderWithQuery(<AdminPaymentsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tài khoản này không có quyền quản trị.",
    );
  });

  it("không có phiên nào: báo trống; tab Sao kê mở BankStatement", async () => {
    fetchMock.mockImplementation((url: string) =>
      json(String(url).includes("bank-transactions") ? [] : []),
    );
    renderWithQuery(<AdminPaymentsPage />);
    expect(await screen.findByText("Không có thanh toán chờ xác nhận.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sao kê" }));
    expect(await screen.findByText("Chưa có giao dịch nào.")).toBeInTheDocument();
  });
});

describe("WEB-T93 Sao kê (BankStatement)", () => {
  it("tổng tiền vào, đã hoàn, còn giữ và từng dòng", async () => {
    fetchMock.mockImplementation(() =>
      json([
        { id: "T2", type: "REFUND", amount: 84000, orderId: "ORD-1", paymentId: "PAY-1", content: "Hoàn tiền ORD-1 - nhân viên từ chối", createdAt: NOW },
        { id: "T1", type: "IN", amount: 84000, orderId: "ORD-1", paymentId: "PAY-1", content: "ORD-1", createdAt: NOW },
        { id: "T0", type: "IN", amount: 30000, orderId: "ORD-2", paymentId: "PAY-2", content: "ORD-2", createdAt: NOW },
        { id: "bad", type: "OTHER" },
      ]),
    );
    renderWithQuery(<BankStatement token="admin-token" orderId=" ORD " />);
    expect(await screen.findByText(`+${price(114000)}`)).toBeInTheDocument();
    expect(screen.getByText(`−${price(84000)}`, { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText(price(30000), { selector: "dd" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:3001/admin/bank-transactions?orderId=ORD",
    );
  });
});

describe("WEB-T94 Tab Nguyên liệu", () => {
  it("bảng tồn kho, phần đang giữ, cảnh báo sắp hết và số ly còn bán", async () => {
    fetchMock.mockImplementation(() =>
      json({
        lowStockCups: 10,
        ingredients: [
          { id: "coffee", name: "Cà phê", unit: "g", quantity: 36, reserved: 18, cupsLeft: 2, low: true, usedBy: ["Americano", "Bạc xỉu"] },
          { id: "tea", name: "Trà", unit: "g", quantity: 1000, reserved: 0, cupsLeft: 200, low: false, usedBy: ["Trà đào"] },
        ],
        products: [
          { id: "p1", name: "Americano", sellableCups: 2, limitingIngredientId: "coffee" },
          { id: "p6", name: "Trà đào", sellableCups: 0, limitingIngredientId: "peach" },
        ],
      }),
    );
    nav.pathname = "/admin/ingredients";
    renderWithQuery(<AdminIngredientsPage />);
    const coffee = (await screen.findByRole("rowheader", { name: /Cà phê/ })).closest("tr")!;
    expect(within(coffee).getByText("Sắp hết")).toBeInTheDocument();
    expect(within(coffee).getByText("18 g")).toBeInTheDocument();
    expect(within(coffee).getByText("2 ly")).toBeInTheDocument();
    expect(screen.getByText(/1 nguyên liệu sắp hết/)).toBeInTheDocument();
    const stock = within(screen.getByRole("list", { name: "Số ly còn bán" }));
    expect(stock.getByText("Hết")).toBeInTheDocument();
    expect(stock.getByText("Giới hạn bởi: Cà phê")).toBeInTheDocument();
  });
});

describe("WEB-T95 Client API quản trị", () => {
  it("lọc theo trạng thái và mã đơn, có JWT", async () => {
    fetchMock.mockImplementation(() => json([payment()]));
    const rows = await listAdminPayments("admin-token", "ALL", "  ORD-1 ");
    expect(rows[0]).toMatchObject({ paymentId: "PAY-1", itemCount: 2 });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:3001/admin/payments?status=ALL&orderId=ORD-1",
    );
  });

  it("401 đăng xuất; dữ liệu sai định dạng bị từ chối", async () => {
    fetchMock.mockImplementationOnce(() => json({ message: "Unauthorized" }, 401));
    await expect(listAdminPayments("admin-token", "ACTIVE")).rejects.toEqual(
      new AdminApiError(401, "Unauthorized"),
    );
    expect(localStorage.getItem("brewlite_token")).toBeNull();
    localStorage.setItem("brewlite_token", "admin-token");
    fetchMock.mockImplementationOnce(() => json([{ paymentId: 1 }]));
    await expect(listAdminPayments("admin-token", "ACTIVE")).rejects.toThrow(
      "Phản hồi thanh toán không đúng định dạng.",
    );
  });

  it("bỏ phản hồi về sau khi đã đổi tài khoản", async () => {
    fetchMock.mockImplementationOnce(() => {
      localStorage.setItem("brewlite_token", "other-token");
      return json([payment()]);
    });
    await expect(listAdminPayments("admin-token", "ACTIVE")).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("mất kết nối: báo lỗi dễ hiểu", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(listAdminPayments("admin-token", "ACTIVE")).rejects.toThrow(
      "Không kết nối được máy chủ. Vui lòng thử lại.",
    );
  });
});
