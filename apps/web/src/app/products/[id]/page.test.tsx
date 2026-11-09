import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductDetailPage from "./page";
import { renderWithQuery } from "@/test/render";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "coffee" }),
}));

const product = {
  id: "coffee", name: "Cà phê sữa", price: 25000, imageUrl: "/images/coffee.jpg",
};

describe("Chi tiết món", () => {
  it("hiển thị trạng thái tải khi chờ API", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    renderWithQuery(<ProductDetailPage />);

    expect(screen.getByLabelText("Đang tải thông tin món")).toHaveAttribute("aria-busy", "true");
  });

  it("hiển thị ảnh, tên và giá với dữ liệu Sprint 1 không có stock", async () => {
    const request = vi.fn().mockResolvedValue(Response.json(product));
    vi.stubGlobal("fetch", request);
    renderWithQuery(<ProductDetailPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Cà phê sữa" })).toBeInTheDocument();
    expect(screen.getByText("25.000đ")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Cà phê sữa" })).toHaveAttribute("src", "/images/coffee.jpg");
    expect(screen.getByRole("link", { name: /Quay lại thực đơn/ })).toHaveAttribute("href", "/menu");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("http://localhost:3001/products/coffee", expect.any(Object));
  });

  it("báo món không tồn tại khi API trả 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    renderWithQuery(<ProductDetailPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm không tồn tại");
    expect(screen.getByRole("link", { name: "Về thực đơn" })).toHaveAttribute("href", "/menu");
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
  });

  it("cho thử lại khi API lỗi rồi hiển thị chi tiết khi kết nối phục hồi", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(Response.json(product)));
    renderWithQuery(<ProductDetailPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được thông tin món");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("heading", { name: "Cà phê sữa" })).toBeInTheDocument();
  });

  it("báo lỗi nếu API trả sai sản phẩm", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...product, id: "other" })));
    renderWithQuery(<ProductDetailPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được thông tin món");
  });
});
