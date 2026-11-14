// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithQuery } from "./render";
import AdminHistoryPage from "@/app/admin/history/page";
import OrderHistoryDetail from "@/components/admin/OrderHistoryDetail";
import { cancellationFixture, NOW, orderFixture } from "./admin-order-fixtures";
import { formatPrice } from "@/lib/formatPrice";

const auth = vi.hoisted(() => ({
  token: "admin-token" as string | null,
  user: {
    id: "staff",
    email: "staff@test.vn",
    role: "ADMIN",
    loyaltyPoints: 0,
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ ...auth }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/history" }));
const fetchMock = vi.fn();
beforeEach(() => {
  auth.token = "admin-token";
  auth.user.role = "ADMIN";
  localStorage.setItem("brewlite_token", "admin-token");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
describe("WEB-T103 history filter/search/pagination", () => {
  it("searches all states, resets page on filter/search and links to staff detail", async () => {
    fetchMock.mockImplementation(async (input: string) => {
      const url = new URL(input);
      const page = Number(url.searchParams.get("page"));
      return Response.json({
        items: [
          {
            ...orderFixture({ id: "ORD-PAGE-" + page, status: "COMPLETED" }),
            customerEmail: "customer@test.vn",
          },
        ],
        total: 21,
        page,
        pageSize: 20,
      });
    });
    renderWithQuery(<AdminHistoryPage />);
    await screen.findByRole("link", { name: "ORD-PAGE-1" });
    fireEvent.click(screen.getByRole("button", { name: "Sau" }));
    await screen.findByRole("link", { name: "ORD-PAGE-2" });
    fireEvent.change(screen.getByRole("combobox", { name: "Trạng thái" }), {
      target: { value: "CANCELLED" },
    });
    await waitFor(() =>
      expect(fetchMock.mock.calls.at(-1)?.[0]).toContain(
        "page=1&status=CANCELLED",
      ),
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "customer@test.vn" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.at(-1)?.[0]).toContain(
        "q=customer%40test.vn",
      ),
    );
    expect(screen.getByRole("link", { name: "ORD-PAGE-1" })).toHaveAttribute(
      "href",
      "/admin/history/ORD-PAGE-1",
    );
  });
  it("shows empty/error/retry and clears old-account data on logout", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ items: [], total: 0, page: 1, pageSize: 20 }),
    );
    const view = renderWithQuery(<AdminHistoryPage />);
    await screen.findByText("Không có đơn nào phù hợp.");
    auth.token = null;
    view.rerender(<AdminHistoryPage />);
    await screen.findByRole("link", { name: "Đăng nhập" });
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });
  it("failed query presents explicit retry", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "Không có quyền" }, { status: 403 }),
    );
    renderWithQuery(<AdminHistoryPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không có quyền",
    );
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeEnabled();
  });
});
describe("WEB-T104 admin detail snapshot, audit and shared statement", () => {
  it("retains saved prices/refund/points, reviewer, payment attempts and one statement", async () => {
    const o = cancellationFixture();
    const d = {
      ...o,
      status: "CANCELLED",
      cancelledAt: NOW,
      cancelReason: "USER_CANCELLED",
      pointsReversed: 3,
      pointsReversedAt: NOW,
      refundedAmount: 35000,
      customerEmail: "customer@test.vn",
      cancelReviewedByEmail: "reviewer@test.vn",
      cancelRequest: {
        ...o.cancelRequest,
        status: "APPROVED",
        reviewedAt: NOW,
        reviewedBy: "staff",
        reviewNote: "agreed",
      },
      payments: [
        {
          paymentId: "PAY-1",
          method: "WALLET",
          status: "FAILED",
          amount: 35000,
          createdAt: NOW,
          receivedAt: NOW,
          reviewedAt: NOW,
          reviewedByEmail: "cashier@test.vn",
          reviewNote: "Cancelled",
        },
      ],
    };
    fetchMock.mockImplementation(async (input: string) =>
      String(input).includes("/admin/bank-transactions")
        ? Response.json([
            {
              id: "TX-1",
              orderId: "ORD-1",
              paymentId: "PAY-1",
              type: "IN",
              amount: 35000,
              content: "IN ORD-1",
              createdAt: NOW,
            },
            {
              id: "TX-2",
              orderId: "ORD-1",
              paymentId: "PAY-1",
              type: "REFUND",
              amount: 35000,
              content: "REFUND ORD-1",
              createdAt: NOW,
            },
          ])
        : Response.json(d),
    );
    renderWithQuery(<OrderHistoryDetail id="ORD-1" />);
    await screen.findByText("reviewer@test.vn");
    expect(screen.getByText(/Cà phê lưu trong đơn/)).toBeInTheDocument();
    expect(screen.getByText("Ưu đãi đã lưu")).toBeInTheDocument();
    expect(screen.getByText(/cashier@test.vn/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("region", { name: "Sao kê đơn hàng" }),
    ).toHaveLength(1);
    expect(await screen.findByText("REFUND ORD-1")).toBeInTheDocument();
    expect(
      screen.getByText("Đã hoàn tiền: " + formatPrice(35000)),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("/admin/bank-transactions?orderId=ORD-1"),
      ),
    ).toBe(true);
  });
  it("404 is explicit and retry remains available", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "missing" }, { status: 404 }),
    );
    renderWithQuery(<OrderHistoryDetail id="missing" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tìm thấy đơn hàng",
    );
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeEnabled();
  });
});
