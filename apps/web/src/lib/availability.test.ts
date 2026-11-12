import { describe, expect, it, vi } from "vitest";
import { getCartAvailability, type AvailabilityLine } from "./availability";

const line: AvailabilityLine = { productId: "coffee", size: "M", toppingIds: ["pearls", "cream"], qty: 2 };
const result = { ...line, toppingIds: ["cream", "pearls"], stock: 3 };

describe("API availability — contract Issue #28 / #29", () => {
  it("WEB-T40: dùng API URL cấu hình, gửi đúng giỏ và AbortSignal", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.example:3001/");
    const request = vi.fn().mockResolvedValue(Response.json({ available: true, items: [result] }));
    vi.stubGlobal("fetch", request);
    const controller = new AbortController();
    await expect(getCartAvailability([line], controller.signal)).resolves.toEqual({ available: true, items: [result] });
    expect(request).toHaveBeenCalledWith("http://api.example:3001/products/availability", expect.objectContaining({
      method: "POST", signal: controller.signal, cache: "no-store",
      body: JSON.stringify({ items: [{ ...line, toppingIds: ["cream", "pearls"] }] }),
    }));
  });

  it.each([0, -1, 1.5, 100])("WEB-T41: số lượng %s sai thì không gửi request", async (qty) => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(getCartAvailability([{ ...line, qty }])).rejects.toThrow("Lựa chọn món không hợp lệ");
    expect(request).not.toHaveBeenCalled();
  });

  it("WEB-T42: giữ thông báo validate từ backend", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: ["Size không hợp lệ", "Thiếu mã món"] }, { status: 400 })));
    await expect(getCartAvailability([line])).rejects.toThrow("Size không hợp lệ, Thiếu mã món");
  });

  it.each([
    null,
    { available: true, items: [] },
    { available: true, items: [{ ...result, productId: "other" }] },
    { available: true, items: [{ ...result, size: "L" }] },
    { available: true, items: [{ ...result, toppingIds: [] }] },
    { available: true, items: [{ ...result, qty: 1 }] },
    { available: true, items: [{ ...result, stock: -1 }] },
    { available: true, items: [{ ...result, stock: 1.5 }] },
  ])("WEB-T43: chặn phản hồi sai định dạng hoặc sai lựa chọn %#", async (data) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(data)));
    await expect(getCartAvailability([line])).rejects.toThrow("không đúng định dạng");
  });

  it("WEB-T44: không tin available nếu mâu thuẫn với số ly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ available: true, items: [{ ...result, stock: 0 }] })));
    await expect(getCartAvailability([line])).rejects.toThrow("không nhất quán");
  });

  it("WEB-T45: endpoint chưa có thì báo lỗi, không tạo dữ liệu mẫu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(getCartAvailability([line])).rejects.toThrow("Không kiểm tra được số ly còn bán");
  });
});
