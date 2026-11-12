import { beforeEach, describe, expect, it, vi } from "vitest";
import { quoteVoucher, type VoucherQuote } from "./vouchers";

const items = [
  {
    productId: "p1",
    size: "M" as const,
    toppingIds: ["cream"],
    qty: 2,
    unitPrice: 1,
    name: "Client name",
  },
];
const valid: VoucherQuote = {
  subtotal: 80000,
  discount: 5000,
  total: 75000,
  voucherCode: "THU5K",
  voucherTitle: "Giảm 5.000đ",
  serverTime: "2026-11-11T10:00:00Z",
  voucherUsage: null,
  vouchers: [],
};

describe("WEB-T60 — voucher API client", () => {
  const request = vi.fn();
  beforeEach(() => {
    request.mockReset();
    vi.stubGlobal("fetch", request);
  });
  it("sends only cart selection and code; identity is in the bearer header", async () => {
    request.mockResolvedValue(Response.json(valid));
    expect(await quoteVoucher(items, "THU5K", undefined, "token-A")).toEqual(
      valid,
    );
    const [url, options] = request.mock.calls[0];
    expect(url).toMatch(/\/vouchers\/quote$/);
    expect(options.headers.Authorization).toBe("Bearer token-A");
    expect(JSON.parse(options.body)).toEqual({
      items: [{ productId: "p1", size: "M", toppingIds: ["cream"], qty: 2 }],
      voucherCode: "THU5K",
    });
    expect(options.cache).toBe("no-store");
  });
  it("does not send a bearer header for guests", async () => {
    request.mockResolvedValue(Response.json(valid));
    await quoteVoucher(items, "THU5K");
    expect(request.mock.calls[0][1].headers).not.toHaveProperty(
      "Authorization",
    );
  });
  it("shows API validation errors and handles non-JSON failures", async () => {
    request.mockResolvedValueOnce(
      Response.json(
        { message: ["Mã đã hết hạn.", "Chọn mã khác."] },
        { status: 400 },
      ),
    );
    await expect(quoteVoucher(items)).rejects.toThrow(
      "Mã đã hết hạn. Chọn mã khác.",
    );
    request.mockResolvedValueOnce(
      new Response("<html>error</html>", { status: 503 }),
    );
    await expect(quoteVoucher(items)).rejects.toThrow(/Không kiểm tra được/);
  });
  it.each([
    { ...valid, total: 1 },
    { ...valid, discount: -1 },
    { ...valid, voucherCode: null },
    { ...valid, serverTime: "invalid" },
    { ...valid, vouchers: [{}] },
    { ...valid, voucherCode: "OTHER" },
    {
      ...valid,
      voucherUsage: {
        maxUsesPerUser: 3,
        usedUses: 2,
        reservedUses: 1,
        availableUses: 3,
      },
    },
  ])("rejects inconsistent or malformed responses %#", async (data) => {
    request.mockResolvedValue(Response.json(data));
    await expect(quoteVoucher(items, "THU5K")).rejects.toThrow(/chưa hợp lệ/);
  });
  it("discards a response after cancellation even if the transport ignores AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();
    request.mockResolvedValue(Response.json(valid));
    await expect(
      quoteVoucher(items, "THU5K", controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
