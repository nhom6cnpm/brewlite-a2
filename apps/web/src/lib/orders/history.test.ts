import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveAuth, clearAuth } from "@/lib/auth";
import { orderFixture, customerProfile } from "@/test/order-fixtures";
import { getMyOrder, getMyOrders, parseOrder } from "./history";
import { cancelOwnOrder, requestCancellation } from "./cancellation";

const request = vi.fn();
beforeEach(() => {
  localStorage.clear();
  saveAuth("account-A", customerProfile);
  request.mockReset();
  vi.stubGlobal("fetch", request);
});
describe("WEB-T70 customer order API contract", () => {
  it("reads snapshots using the current JWT and no-store, never sending prices/identity", async () => {
    request.mockResolvedValue(Response.json([orderFixture]));
    expect(await getMyOrders()).toEqual([orderFixture]);
    expect(request.mock.calls[0][1]).toMatchObject({
      cache: "no-store",
      headers: { Authorization: "Bearer account-A" },
    });
  });
  it.each([
    { total: 1 },
    { refundedAmount: -1 },
    { status: "UNKNOWN" },
    { transferReceived: undefined },
    { canCancelImmediately: undefined },
    { pointsEarned: undefined },
    { items: [] },
  ])("rejects malformed or incomplete order data", (changes) => {
    expect(() => parseOrder({ ...orderFixture, ...changes })).toThrow(
      "Dữ liệu đơn hàng",
    );
  });
  it("rejects a different order ID even if the payload is otherwise valid", async () => {
    request.mockResolvedValue(
      Response.json({ ...orderFixture, id: "someone-else" }),
    );
    await expect(getMyOrder(orderFixture.id)).rejects.toThrow(
      "Dữ liệu đơn hàng",
    );
  });
  it("401 clears only the still-current account; no fetch without a token", async () => {
    request.mockResolvedValue(Response.json({}, { status: 401 }));
    await expect(getMyOrders()).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem("brewlite_token")).toBeNull();
    request.mockClear();
    await expect(getMyOrders()).rejects.toMatchObject({ status: 401 });
    expect(request).not.toHaveBeenCalled();
  });
  it("late responses from the previous account never enter the current account cache", async () => {
    request.mockImplementation(async () => {
      saveAuth("account-B", { ...customerProfile, id: "other" });
      return Response.json([orderFixture]);
    });
    await expect(getMyOrders()).rejects.toMatchObject({ name: "AbortError" });
  });
  it("immediate cancellation sends an empty POST and surfaces server conflicts", async () => {
    request.mockResolvedValue(
      Response.json({ message: "Đơn đang chờ duyệt hủy." }, { status: 409 }),
    );
    await expect(cancelOwnOrder(orderFixture.id, "account-A")).rejects.toThrow(
      "Đơn đang chờ duyệt hủy.",
    );
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({});
  });
  it("request cancellation returns the refreshed order and preserves server DTO messages", async () => {
    request
      .mockResolvedValueOnce(Response.json(orderFixture))
      .mockResolvedValue(
        Response.json(
          { message: ["Lý do phải có 1–500 ký tự."] },
          { status: 400 },
        ),
      );
    await expect(
      requestCancellation(orderFixture.id, "reason", "account-A"),
    ).resolves.toEqual(orderFixture);
    await expect(
      requestCancellation(orderFixture.id, "", "account-A"),
    ).rejects.toThrow("Lý do phải có 1–500 ký tự.");
  });
  it("a logout while a mutation is in flight aborts its UI result", async () => {
    request.mockImplementation(async () => {
      clearAuth();
      return Response.json(orderFixture);
    });
    await expect(
      requestCancellation(orderFixture.id, "reason", "account-A"),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
