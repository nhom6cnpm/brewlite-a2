import { describe, expect, it, vi } from "vitest";
import { bankFixture } from "@/test/payment-fixtures";
import { getMockBankTransfer, sendMockBankTransfer } from "./mockBank";

describe("WEB-T80 — public bank client validation", () => {
  it.each([
    { paymentId: "PAY-other" }, { amount: "1" }, { transferContent: "ORD-other" },
    { account: null }, { status: "TRANSFER_RECEIVED", receivedAt: null },
  ])("rejects a wrong bank response: %j", async (overrides) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...bankFixture(), ...overrides })));
    await expect(getMockBankTransfer("PAY-demo")).rejects.toThrow("không đúng định dạng");
  });

  it("displays a network error and preserves abort semantics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(sendMockBankTransfer("PAY-demo")).rejects.toThrow("Không kết nối được ngân hàng giả lập");
    const controller = new AbortController();
    controller.abort();
    await expect(getMockBankTransfer("PAY-demo", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
