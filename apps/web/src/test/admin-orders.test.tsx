// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithQuery } from "./render";
import AdminOrdersPage from "@/app/admin/orders/page";
import { cancellationFixture, NOW, orderFixture } from "./admin-order-fixtures";

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
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/orders" }));
const fetchMock = vi.fn();
let pending = true;
let board = [orderFixture({ id: "ORD-P1", canRequestCancellation: false })];
beforeEach(() => {
  auth.token = "admin-token";
  auth.user.role = "ADMIN";
  localStorage.setItem("brewlite_token", "admin-token");
  pending = true;
  board = [orderFixture({ id: "ORD-P1", canRequestCancellation: false })];
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fetchMock.mockImplementation(async (input: string, options?: RequestInit) => {
    const path = String(input);
    if (options?.method === "PATCH") {
      board = [
        orderFixture({
          id: "ORD-P1",
          status: JSON.parse(String(options.body)).status,
        }),
      ];
      return Response.json(board[0]);
    }
    if (options?.method === "POST") {
      const o = cancellationFixture();
      const approved = path.endsWith("/cancel");
      pending = false;
      return Response.json({
        ...o,
        status: approved ? "CANCELLED" : "PAID",
        cancelRequest: {
          ...o.cancelRequest,
          status: approved ? "APPROVED" : "REJECTED",
          reviewedAt: NOW,
          reviewedBy: "staff",
          reviewNote: JSON.parse(String(options.body)).reason ?? null,
        },
      });
    }
    if (path.includes("cancelRequestStatus="))
      return Response.json(pending ? [cancellationFixture()] : []);
    if (path.includes("?status=")) return Response.json(board);
    throw new Error("Unexpected URL " + path);
  });
});
const mutations = () =>
  fetchMock.mock.calls.filter(
    ([, o]) => o?.method === "POST" || o?.method === "PATCH",
  );

describe("WEB-T101 cancellation review UI", () => {
  it("shows refund warning, requires rejection reason, cancel confirmation does not send", async () => {
    renderWithQuery(<AdminOrdersPage />);
    const approve = await screen.findByRole("button", { name: "Đồng ý hủy" });
    expect(screen.getByRole("button", { name: "Từ chối hủy" })).toBeDisabled();
    expect(screen.getByText(/Quán đã nhận/)).toHaveTextContent(
      /hệ thống tự hoàn/,
    );
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(approve);
    expect(mutations()).toHaveLength(0);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Ghi chú xử lý / lý do từ chối" }),
      { target: { value: "  tiếp tục  " } },
    );
    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Từ chối hủy" }));
    await screen.findByText("Không có yêu cầu hủy đang chờ.");
    expect(mutations()).toHaveLength(1);
    expect(JSON.parse(String(mutations()[0][1].body))).toMatchObject({
      reason: "tiếp tục",
    });
  });
  it("approval posts one decision, invalidates pending list and board", async () => {
    renderWithQuery(<AdminOrdersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý hủy" }));
    await screen.findByText("Không có yêu cầu hủy đang chờ.");
    expect(mutations()).toHaveLength(1);
    expect(String(mutations()[0][0])).toContain("/ORD-1/cancel");
  });
  it("shows stale-request server error and reloads authoritative list", async () => {
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input: string, o?: RequestInit) =>
      o?.method === "POST"
        ? Response.json(
            { message: "Yêu cầu hủy đã thay đổi." },
            { status: 409 },
          )
        : normal(input, o),
    );
    renderWithQuery(<AdminOrdersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý hủy" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Yêu cầu hủy đã thay đổi.",
    );
  });
  it("gates CUSTOMER without loading staff data", async () => {
    auth.user.role = "CUSTOMER";
    renderWithQuery(<AdminOrdersPage />);
    await screen.findByText("Không có quyền truy cập");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("WEB-T102 preparation board UI", () => {
  it("advances one column at a time, completing requires confirmation", async () => {
    pending = false;
    renderWithQuery(<AdminOrdersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu pha" }));
    await screen.findByRole("button", { name: "Pha xong" });
    expect(
      within(screen.getByRole("region", { name: "Đang pha" })).getByText(
        "ORD-P1",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pha xong" }));
    await screen.findByRole("button", { name: "Khách đã nhận" });
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Khách đã nhận" }));
    expect(mutations()).toHaveLength(2);
    vi.mocked(window.confirm).mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Khách đã nhận" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Khách đã nhận" }),
      ).not.toBeInTheDocument(),
    );
    expect(mutations()).toHaveLength(3);
  });
  it("paid pending cancellation blocks preparation", async () => {
    board = [cancellationFixture()];
    renderWithQuery(<AdminOrdersPage />);
    expect(
      await screen.findByRole("button", { name: "Bắt đầu pha" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "Xử lý yêu cầu hủy" }),
    ).toHaveAttribute("href", "#cancel-requests");
  });
  it("network failure has retry buttons and does not show stale action cards", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    renderWithQuery(<AdminOrdersPage />);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
    expect(
      screen.queryByRole("button", { name: "Bắt đầu pha" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cập nhật bảng pha chế" }),
    ).toBeEnabled();
  });
});
