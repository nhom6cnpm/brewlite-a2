import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MenuPage from "./page";
import { renderWithQuery } from "@/test/render";

const products = [
  { id: "coffee", name: "Cà phê sữa", price: 25000, imageUrl: "/images/coffee.jpg" },
  { id: "peach-tea", name: "Trà đào", price: 30000, imageUrl: "/images/peach-tea.jpg" },
];

describe("Menu", () => {
  it("minh chứng CI phát hiện lỗi (cố ý làm hỏng test)", () => {
    // Cố ý thất bại để kiểm chứng quality gate của CI workflow
    expect(true).toBe(false);
  });

  it("hiển thị skeleton khi đang chờ API", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    renderWithQuery(<MenuPage />);

    expect(screen.getByLabelText("Đang tải thực đơn")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Chưa có món nào")).not.toBeInTheDocument();
  });

  it("hiển thị trạng thái rỗng khi API không có món", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
    renderWithQuery(<MenuPage />);

    expect(await screen.findByText("Chưa có món nào")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("hiển thị lỗi API và tải lại danh sách khi bấm Thử lại", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json(products));
    vi.stubGlobal("fetch", request);
    renderWithQuery(<MenuPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được thực đơn");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByRole("heading", { name: "Cà phê sữa" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("báo lỗi khi mất kết nối", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    renderWithQuery(<MenuPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được thực đơn");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeEnabled();
  });

  it("gọi API được cấu hình, hiển thị tên/giá và liên kết tới chi tiết", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4301/");
    const request = vi.fn().mockResolvedValue(Response.json(products));
    vi.stubGlobal("fetch", request);
    renderWithQuery(<MenuPage />);

    expect(await screen.findByRole("heading", { name: "Cà phê sữa" })).toBeInTheDocument();
    expect(screen.getByText("25.000đ")).toBeInTheDocument();
    expect(screen.getByText("30.000đ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cà phê sữa/ })).toHaveAttribute("href", "/products/coffee");
    expect(screen.getByRole("img", { name: "Trà đào" })).toHaveAttribute("src", "/images/peach-tea.jpg");
    expect(screen.queryByText("Hết hàng")).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("http://localhost:4301/products", expect.any(Object));
  });

  it("không hiển thị dữ liệu sai từ API như một thực đơn rỗng", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "invalid" })));
    renderWithQuery(<MenuPage />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Chưa có món nào")).not.toBeInTheDocument();
  });
});
