import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStoredUser, saveAuth } from "./auth";
import { customerProfile } from "@/test/order-fixtures";
import { refreshRewardsProfile } from "./rewardsProfile";
const request = vi.fn();
beforeEach(() => {
  localStorage.clear();
  saveAuth("account-A", customerProfile);
  request.mockReset();
  vi.stubGlobal("fetch", request);
});
describe("WEB-T73 server point balance sync", () => {
  it("saves the authenticated server balance without estimating from order totals", async () => {
    request.mockResolvedValue(
      Response.json({ ...customerProfile, loyaltyPoints: 8 }),
    );
    await refreshRewardsProfile("account-A");
    expect(getStoredUser()?.loyaltyPoints).toBe(8);
  });
  it("a late profile cannot overwrite a newer login", async () => {
    request.mockImplementation(async () => {
      saveAuth("account-B", {
        ...customerProfile,
        id: "other",
        loyaltyPoints: 4,
      });
      return Response.json({ ...customerProfile, loyaltyPoints: 8 });
    });
    await expect(refreshRewardsProfile("account-A")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(getStoredUser()?.loyaltyPoints).toBe(4);
  });
  it("invalid or another customer profile never changes the current balance", async () => {
    request
      .mockResolvedValueOnce(
        Response.json({ ...customerProfile, loyaltyPoints: -1 }),
      )
      .mockResolvedValue(
        Response.json({ ...customerProfile, id: "other", loyaltyPoints: 8 }),
      );
    await expect(refreshRewardsProfile("account-A")).rejects.toThrow(
      "Thông tin điểm thưởng",
    );
    await expect(refreshRewardsProfile("account-A")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(getStoredUser()?.loyaltyPoints).toBe(0);
  });
});
