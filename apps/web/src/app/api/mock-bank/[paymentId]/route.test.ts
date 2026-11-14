// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const context = (paymentId = "PAY-demo") => ({ params: Promise.resolve({ paymentId }) });

describe("WEB-T85 — server proxy for the public bank", () => {
  it("uses the internal API and forwards no browser credentials or editable transfer body", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api:3001");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ status: "TRANSFER_RECEIVED" }));
    vi.stubGlobal("fetch", fetcher);
    const req = new NextRequest("http://localhost:3000/api/mock-bank/PAY-demo", {
      method: "POST", headers: { Authorization: "Bearer do-not-forward", Cookie: "private=true" },
      body: JSON.stringify({ amount: 1, orderId: "ORD-fake" }),
    });
    const result = await POST(req, context());
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ status: "TRANSFER_RECEIVED" });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("http://api:3001/mock-bank/payments/PAY-demo/transfer");
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(init.cache).toBe("no-store");
    expect(result.headers.get("Cache-Control")).toContain("no-store");
  });

  it("passes backend status through and supports the public API fallback", async () => {
    vi.stubEnv("API_INTERNAL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4401/");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ message: "Not found" }, { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    const result = await GET(new NextRequest("http://localhost:3000/api/mock-bank/PAY-demo"), context());
    expect(fetcher.mock.calls[0][0]).toBe("http://localhost:4401/mock-bank/payments/PAY-demo");
    expect(result.status).toBe(404);
    expect(await result.json()).toEqual({ message: "Not found" });
  });

  it("rejects malformed ids before fetching and returns 502 for an unavailable API", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetcher);
    const req = new NextRequest("http://localhost:3000/api/mock-bank/x");
    expect((await GET(req, context("../admin"))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await GET(req, context())).status).toBe(502);
  });
});
