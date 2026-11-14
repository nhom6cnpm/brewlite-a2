// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advancePreparation,
  listCancellationRequests,
  listPreparationOrders,
  reviewCancellation,
} from "./orders";
import { getAdminOrderDetail, listAdminOrders } from "./history";
import { AdminApiError } from "./request";
import {
  cancellationFixture,
  NOW,
  orderFixture,
  REQUEST,
} from "@/test/admin-order-fixtures";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  localStorage.setItem("brewlite_token", "admin-token");
});
const respond = (data: unknown, status = 200) =>
  fetchMock.mockImplementation(async () => Response.json(data, { status }));
describe("WEB-T100 staff clients: PATCH/POST, strict schemas and account isolation", () => {
  it("sends PATCH and JWT, encodes id, accepts authoritative state", async () => {
    respond(orderFixture({ id: "ORD/1", status: "PREPARING" }));
    await advancePreparation("ORD/1", "PREPARING", "admin-token");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/orders/ORD%2F1/status"),
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
        body: JSON.stringify({ status: "PREPARING" }),
        cache: "no-store",
      }),
    );
  });
  it("lists separate board/request modes and uses AbortSignal", async () => {
    respond([]);
    const controller = new AbortController();
    await listCancellationRequests("admin-token", controller.signal);
    await listPreparationOrders("admin-token");
    expect(fetchMock.mock.calls[0][0]).toContain("cancelRequestStatus=PENDING");
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    expect(fetchMock.mock.calls[1][0]).toContain("status=PAID,PREPARING,READY");
  });
  it("posts exact requestId and trimmed reason; verifies returned decision", async () => {
    const o = cancellationFixture();
    o.cancelRequest = {
      ...o.cancelRequest!,
      status: "REJECTED",
      reviewedAt: NOW,
      reviewedBy: "admin",
      reviewNote: "keep",
    };
    respond(o);
    await reviewCancellation(
      "ORD-1",
      REQUEST,
      false,
      "  keep  ",
      "admin-token",
    );
    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({ requestId: REQUEST, reason: "keep" }),
    );
    await expect(
      reviewCancellation("ORD-1", "old", false, "keep", "admin-token"),
    ).rejects.toThrow("Kết quả duyệt");
  });
  it("preserves backend 400/403/409 errors, 401 signs out, network errors show retry", async () => {
    for (const status of [400, 403, 409]) {
      respond({ message: "Server refused" }, status);
      await expect(listPreparationOrders("admin-token")).rejects.toMatchObject({
        status,
        message: "Server refused",
      });
    }
    respond({ message: "Expired" }, 401);
    await expect(listPreparationOrders("admin-token")).rejects.toBeInstanceOf(
      AdminApiError,
    );
    expect(localStorage.getItem("brewlite_token")).toBeNull();
    localStorage.setItem("brewlite_token", "admin-token");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(listPreparationOrders("admin-token")).rejects.toMatchObject({
      status: 0,
    });
  });
  it("discards a late response after account switch and an aborted request", async () => {
    fetchMock.mockImplementationOnce(async () => {
      localStorage.setItem("brewlite_token", "other");
      return Response.json([orderFixture()]);
    });
    await expect(listPreparationOrders("admin-token")).rejects.toMatchObject({
      name: "AbortError",
    });
    localStorage.setItem("brewlite_token", "admin-token");
    const c = new AbortController();
    respond([]);
    c.abort();
    await expect(
      listPreparationOrders("admin-token", c.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("never relaxes customer snapshot validation for admin rows", async () => {
    respond([{ ...orderFixture(), total: 1 }]);
    await expect(listPreparationOrders("admin-token")).rejects.toThrow(
      "Dữ liệu đơn",
    );
    respond(orderFixture({ status: "READY" }));
    await expect(
      advancePreparation("ORD-1", "PREPARING", "admin-token"),
    ).rejects.toThrow("Trạng thái đơn");
  });
  it("history encodes search, validates counts, email and pagination", async () => {
    const data = {
      items: [{ ...orderFixture(), customerEmail: "customer@test.vn" }],
      total: 1,
      page: 1,
      pageSize: 20,
    };
    respond(data);
    await listAdminOrders(
      { page: 1, q: " a+b@test.vn ", status: "PAID" },
      "admin-token",
    );
    expect(fetchMock.mock.calls[0][0]).toContain("q=a%2Bb%40test.vn");
    for (const bad of [
      { ...data, total: -1 },
      { ...data, page: 2 },
      { ...data, pageSize: 51 },
      { ...data, items: [orderFixture()] },
    ]) {
      respond(bad);
      await expect(listAdminOrders({ page: 1 }, "admin-token")).rejects.toThrow(
        "Dữ liệu lịch sử",
      );
    }
  });
  it("detail rejects malformed payments and mismatched IDs rather than inventing success", async () => {
    const d = {
      ...orderFixture(),
      customerEmail: "customer@test.vn",
      cancelReviewedByEmail: null,
      payments: [],
    };
    respond(d);
    expect(
      (await getAdminOrderDetail("ORD-1", "admin-token")).payments,
    ).toEqual([]);
    for (const bad of [
      { ...d, id: "other" },
      {
        ...d,
        payments: [
          {
            paymentId: "PAY-1",
            method: "WALLET",
            status: "unexpected",
            amount: 35000,
          },
        ],
      },
    ]) {
      respond(bad);
      await expect(getAdminOrderDetail("ORD-1", "admin-token")).rejects.toThrow(
        "Dữ liệu lịch sử",
      );
    }
  });
});
