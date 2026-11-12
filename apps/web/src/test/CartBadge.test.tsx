// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CartBadge from "@/components/CartBadge";
import { useCart, type CartItem } from "@/store/useCart";

const coffee: CartItem = {
  productId: "p1",
  name: "Cà phê sữa",
  imageUrl: "/images/coffee.jpg",
  size: "M",
  toppingIds: [],
  qty: 2,
  unitPrice: 30000,
};

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ items: [], voucherCode: "" });
});

describe("CartBadge", () => {
  it("WEB-T19: không hiện gì khi giỏ trống", () => {
    const { container } = render(<CartBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it("WEB-T19: hiện đúng tổng số ly của mọi dòng", () => {
    useCart.setState({
      items: [coffee, { ...coffee, productId: "p2", size: "L", qty: 3 }],
    });
    render(<CartBadge />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
