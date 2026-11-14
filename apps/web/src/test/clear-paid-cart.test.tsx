// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { saveAuth } from "@/lib/auth";
import {
  getActiveCheckout,
  getCartFingerprint,
  saveCheckout,
} from "@/lib/payments/storage";
import { clearCartIfPaid, useClearPaidCart } from "@/hooks/useClearPaidCart";
import { useCart, type CartItem } from "@/store/useCart";
import type { OrderStatus } from "@/types/order";

const coffee: CartItem = {
  productId: "p1",
  name: "Americano",
  imageUrl: "/images/americano.svg",
  size: "M",
  toppingIds: [],
  qty: 2,
  unitPrice: 40000,
};

const ORDER_ID = "order-1";

/** Cart the order was placed from, saved the way the cart page does it. */
function placeOrderFrom(items: CartItem[]) {
  useCart.setState({ items, voucherCode: "" });
  saveCheckout({
    orderId: ORDER_ID,
    total: 80000,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    cartFingerprint: getCartFingerprint(items),
  });
}

beforeEach(() => {
  localStorage.clear();
  saveAuth("token-1", { id: "u1", email: "khach@brewlite.vn", loyaltyPoints: 0 });
  useCart.setState({ items: [], voucherCode: "" });
});

// WEB-T54: giỏ chỉ được xóa khi đơn đặt từ đúng giỏ đó đã PAID
describe("WEB-T54: xóa giỏ khi đơn PAID", () => {
  it("đơn PAID và giỏ trùng với lúc đặt đơn thì xóa giỏ", () => {
    placeOrderFrom([coffee]);

    clearCartIfPaid({ id: ORDER_ID, status: "PAID" });

    expect(useCart.getState().items).toEqual([]);
    expect(getActiveCheckout(getCartFingerprint([coffee]))).toBeNull();
  });

  it("giỏ đã đổi sau khi đặt đơn thì giữ nguyên giỏ", () => {
    placeOrderFrom([coffee]);
    const changed = [{ ...coffee, qty: 3 }];
    useCart.setState({ items: changed });

    clearCartIfPaid({ id: ORDER_ID, status: "PAID" });

    expect(useCart.getState().items).toEqual(changed);
  });

  it("đơn chưa thanh toán thì không xóa giỏ", () => {
    placeOrderFrom([coffee]);

    clearCartIfPaid({ id: ORDER_ID, status: "PENDING" });

    expect(useCart.getState().items).toEqual([coffee]);
  });

  it("hook useClearPaidCart xóa giỏ khi danh sách đơn có đơn PAID", () => {
    placeOrderFrom([coffee]);

    const { rerender } = renderHook(
      ({ status }: { status: OrderStatus }) =>
        useClearPaidCart([{ id: ORDER_ID, status }]),
      { initialProps: { status: "PENDING" } },
    );
    expect(useCart.getState().items).toEqual([coffee]);

    rerender({ status: "PAID" });
    expect(useCart.getState().items).toEqual([]);
  });
});
