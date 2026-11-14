import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { orderFixture, customerProfile } from "@/test/order-fixtures";
import { saveAuth, clearAuth, getStoredUser } from "@/lib/auth";
import { useCart } from "@/store/useCart";
import { OrderHistory } from "./OrderHistory";
import { OrderDetail } from "./OrderDetail";
import OrderCancellation from "./OrderCancellation";
import { PaymentAction, OrderProgress } from "./OrderParts";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const request = vi.fn();
const now = Date.parse(orderFixture.serverTime);
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  saveAuth("account-A", customerProfile);
  useCart.setState({ items: [], voucherCode: "" });
  request.mockReset();
  router.replace.mockClear();
  vi.stubGlobal("fetch", async (url: unknown, options?: RequestInit) => {
    if (String(url).endsWith("/auth/me")) return Response.json(getStoredUser());
    const response = await request(url, options);
    return response.clone();
  });
});
describe("WEB-T71 history/detail/confirmation customer UI", () => {
  it("requires login and does not request another account data while logged out", async () => {
    clearAuth();
    renderWithQuery(<OrderHistory />);
    expect(
      await screen.findByRole("link", { name: "Đăng nhập" }),
    ).toHaveAttribute("href", "/login?redirect=%2Forders");
    expect(request).not.toHaveBeenCalled();
  });
  it("shows the empty history and menu link", async () => {
    request.mockResolvedValue(Response.json([]));
    renderWithQuery(<OrderHistory />);
    expect(await screen.findByText("Bạn chưa có đơn hàng nào")).toBeVisible();
    expect(screen.getByRole("link", { name: "Về thực đơn" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });
  it("filters completed and failed/cancelled orders without adding reorder controls", async () => {
    request.mockResolvedValue(
      Response.json([
        orderFixture,
        {
          ...orderFixture,
          id: "ORD-done",
          status: "COMPLETED",
          canPay: false,
          canCancelImmediately: false,
        },
      ]),
    );
    renderWithQuery(<OrderHistory />);
    await screen.findByText("ORD-done");
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất" }));
    expect(screen.queryByText(orderFixture.id)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Đặt lại/ }),
    ).not.toBeInTheDocument();
  });
  it("shows a read failure and retries against the server", async () => {
    request
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValue(Response.json([]));
    renderWithQuery(<OrderHistory />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Bạn chưa có đơn hàng nào")).toBeVisible();
  });
  it("shows stored voucher totals, refunded money and reversed points in detail", async () => {
    request.mockResolvedValue(
      Response.json({
        ...orderFixture,
        status: "CANCELLED",
        canPay: false,
        canCancelImmediately: false,
        cancelledAt: orderFixture.serverTime,
        cancelReason: "USER_CANCELLED",
        refundedAmount: 35000,
        pointsEarned: 3,
        pointsReversed: 3,
        pointsAwardedAt: orderFixture.createdAt,
        pointsReversedAt: orderFixture.serverTime,
      }),
    );
    renderWithQuery(<OrderDetail id={orderFixture.id} />);
    await screen.findByText("Đã thu hồi 3 điểm");
    expect(screen.getByText(/Đã hoàn 35\.000/)).toBeVisible();
    const totals = screen.getByRole("region", { name: "Tổng kết thanh toán" });
    expect(within(totals).getByText("THU5K").parentElement).toHaveTextContent(
      "Voucher THU5K",
    );
    expect(
      within(totals).getByText("Tổng thanh toán").nextElementSibling,
    ).toHaveTextContent("35.000");
  });
  it("confirmation is shown only after PAID; another state goes to detail", async () => {
    request.mockResolvedValue(Response.json(orderFixture));
    renderWithQuery(<OrderDetail id={orderFixture.id} confirmation />);
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/orders/" + orderFixture.id),
    );
    expect(screen.queryByText("Đặt hàng thành công!")).not.toBeInTheDocument();
  });
  it("PAID confirmation shows success and progress", async () => {
    request.mockResolvedValue(
      Response.json({
        ...orderFixture,
        status: "PAID",
        canPay: false,
        canCancelImmediately: false,
        canRequestCancellation: true,
      }),
    );
    renderWithQuery(<OrderDetail id={orderFixture.id} confirmation />);
    expect(await screen.findByText("Đặt hàng thành công!")).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Tiến trình đơn hàng" }),
    ).toBeVisible();
  });
  it("re-fetches on refresh and changes displayed progress to READY", async () => {
    request
      .mockResolvedValueOnce(
        Response.json({
          ...orderFixture,
          status: "PREPARING",
          canPay: false,
          canCancelImmediately: false,
        }),
      )
      .mockResolvedValue(
        Response.json({
          ...orderFixture,
          status: "READY",
          canPay: false,
          canCancelImmediately: false,
        }),
      );
    renderWithQuery(<OrderDetail id={orderFixture.id} />);
    await screen.findByText("Chi tiết đơn hàng");
    fireEvent.click(
      screen.getByRole("button", { name: "Cập nhật trạng thái" }),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("list", { name: "Tiến trình đơn hàng" })
          .querySelector('[aria-current="step"]'),
      ).toHaveTextContent("Sẵn sàng nhận"),
    );
  });
  it("account switch hides the previous account snapshot while the next one loads", async () => {
    request.mockImplementation(async (_url, options) =>
      options.headers.Authorization === "Bearer account-B"
        ? new Promise(() => {})
        : Response.json([orderFixture]),
    );
    renderWithQuery(<OrderHistory />);
    await screen.findByText(orderFixture.id);
    act(() =>
      saveAuth("account-B", { ...customerProfile, id: "another-account" }),
    );
    expect(screen.queryByText(orderFixture.id)).not.toBeInTheDocument();
  });
  it("polls detail automatically without requiring a refresh click", async () => {
    let reads = 0;
    request.mockImplementation(async () =>
      Response.json({
        ...orderFixture,
        status: ++reads > 1 ? "READY" : "PREPARING",
        canPay: false,
        canCancelImmediately: false,
      }),
    );
    renderWithQuery(<OrderDetail id={orderFixture.id} />);
    await screen.findByText("Chi tiết đơn hàng");
    await waitFor(
      () =>
        expect(
          screen
            .getByRole("list", { name: "Tiến trình đơn hàng" })
            .querySelector('[aria-current="step"]'),
        ).toHaveTextContent("Sẵn sàng nhận"),
      { timeout: 4500 },
    );
  });
});

describe("WEB-T72 cancellation actions and received-transfer deadline", () => {
  it("immediate cancellation posts empty body, refreshes and keeps the current cart", async () => {
    const cart = [
      {
        productId: "p2",
        name: "Bạc xỉu",
        imageUrl: "/images/bac-xiu.jpg",
        size: "S" as const,
        toppingIds: [],
        qty: 1,
        unitPrice: 30000,
      },
    ];
    useCart.setState({ items: cart });
    request.mockResolvedValue(Response.json({ status: "CANCELLED" }));
    renderWithQuery(<OrderCancellation order={orderFixture} serverNow={now} />);
    fireEvent.click(screen.getByRole("button", { name: "Hủy đơn hàng" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận hủy" }));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({});
    expect(useCart.getState().items).toEqual(cart);
  });
  it("money received before the deadline still allows a request after it passes", async () => {
    const order = {
      ...orderFixture,
      transferReceived: true,
      canPay: false,
      canCancelImmediately: false,
      canRequestCancellation: true,
      expiresAt: "2026-11-13T11:59:00Z",
    };
    renderWithQuery(
      <>
        <OrderCancellation order={order} serverNow={now} />
        <PaymentAction order={order} serverNow={now} />
      </>,
    );
    expect(
      screen.getByRole("button", { name: "Yêu cầu hủy đơn" }),
    ).toBeVisible();
    expect(
      screen.getByText(/Đã nhận tiền, chờ nhân viên xác nhận/),
    ).toBeVisible();
    expect(screen.queryByText(/Đã hết hạn thanh toán/)).not.toBeInTheDocument();
  });
  it("requires a nonblank reason and shows server errors without changing state", async () => {
    request.mockResolvedValue(
      Response.json({ message: "Đơn đã bắt đầu pha chế." }, { status: 400 }),
    );
    renderWithQuery(
      <OrderCancellation
        order={{
          ...orderFixture,
          status: "PAID",
          canCancelImmediately: false,
          canRequestCancellation: true,
        }}
        serverNow={now}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Yêu cầu hủy đơn" }));
    const submit = screen.getByRole("button", { name: "Gửi yêu cầu hủy" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Lý do hủy"), {
      target: { value: "changed schedule" },
    });
    fireEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Đơn đã bắt đầu pha chế.",
    );
  });
  it.each(["PREPARING", "READY", "COMPLETED"] as const)(
    "%s has progress but no customer cancellation action",
    (status) => {
      const order = {
        ...orderFixture,
        status,
        canPay: false,
        canCancelImmediately: false,
      };
      renderWithQuery(
        <>
          <OrderCancellation order={order} serverNow={now} />
          <OrderProgress order={order} />
        </>,
      );
      expect(
        screen.queryByRole("button", { name: /Hủy đơn|Yêu cầu hủy/ }),
      ).not.toBeInTheDocument();
    },
  );
});
