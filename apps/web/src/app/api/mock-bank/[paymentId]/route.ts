import type { NextRequest } from "next/server";

const PAYMENT_ID = /^[A-Za-z0-9-]{1,64}$/;

async function forward(request: NextRequest, paymentId: string, transfer: boolean): Promise<Response> {
  if (!PAYMENT_ID.test(paymentId)) return Response.json({ message: "Mã thanh toán không hợp lệ." }, { status: 400 });
  const base = (process.env.API_INTERNAL_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3001").replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/mock-bank/payments/${encodeURIComponent(paymentId)}${transfer ? "/transfer" : ""}`, {
      method: transfer ? "POST" : "GET", signal: request.signal, cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ message: "Ngân hàng giả lập tạm thời không kết nối được máy chủ." }, { status: 502 });
  }
}

type Context = { params: Promise<{ paymentId: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  return forward(request, (await params).paymentId, false);
}
export async function POST(request: NextRequest, { params }: Context) {
  return forward(request, (await params).paymentId, true);
}
