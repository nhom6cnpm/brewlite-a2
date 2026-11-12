// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { toppingOptions } from "@/lib/productOptions";
import {
  getLineKey,
  selectTotalPrice,
  selectTotalQty,
  useCart,
  type CartItem,
} from "@/store/useCart";

const STORAGE_KEY = "brewlite-cart";
const [topA, topB] = toppingOptions.map((option) => option.id);

const coffee: CartItem = {
  productId: "p1",
  name: "Cà phê sữa",
  imageUrl: "/images/coffee.jpg",
  size: "M",
  toppingIds: [],
  qty: 1,
  unitPrice: 30000,
};

const peachTea: CartItem = {
  productId: "p2",
  name: "Trà đào",
  imageUrl: "/images/peach-tea.jpg",
  size: "L",
  toppingIds: [topA, topB],
  qty: 2,
  unitPrice: 45000,
};

beforeEach(() => {
  localStorage.clear();
  useCart.setState({ items: [], voucherCode: "" });
});

describe("useCart", () => {
  it("WEB-T10: thêm món; gộp dòng cùng món/size/topping (khác thứ tự topping vẫn gộp); khác tùy chọn thì tách dòng", () => {
    const { addItem } = useCart.getState();

    addItem(coffee);
    expect(useCart.getState().items).toHaveLength(1);

    addItem({ ...peachTea, toppingIds: [topB, topA], qty: 1 });
    addItem({ ...peachTea, toppingIds: [topA, topB], qty: 2 });
    const merged = useCart
      .getState()
      .items.filter((item) => item.productId === "p2");
    expect(merged).toHaveLength(1);
    expect(merged[0].qty).toBe(3);

    addItem({ ...coffee, size: "L" });
    addItem({ ...coffee, toppingIds: [topA] });
    expect(useCart.getState().items).toHaveLength(4);
  });

  it("WEB-T11: số lượng của dòng luôn nằm trong khoảng 1..99", () => {
    useCart.getState().addItem(coffee);
    const key = getLineKey(coffee);

    useCart.getState().setQty(key, 5);
    expect(useCart.getState().items[0].qty).toBe(5);

    useCart.getState().setQty(key, 0);
    expect(useCart.getState().items[0].qty).toBe(1);

    useCart.getState().setQty(key, 500);
    expect(useCart.getState().items[0].qty).toBe(99);
  });

  it("WEB-T12: xóa một dòng không ảnh hưởng dòng khác; clear() xóa giỏ và mã voucher", () => {
    useCart.getState().addItem(coffee);
    useCart.getState().addItem(peachTea);

    useCart.getState().removeItem(getLineKey(coffee));
    expect(useCart.getState().items.map((item) => item.productId)).toEqual([
      "p2",
    ]);

    useCart.getState().setVoucherCode(" abc ");
    expect(useCart.getState().voucherCode).toBe("ABC");

    useCart.getState().clear();
    expect(useCart.getState().items).toHaveLength(0);
    expect(useCart.getState().voucherCode).toBe("");
  });

  it("WEB-T13: tổng số ly và tổng tiền tính đúng trên nhiều dòng", () => {
    useCart.getState().addItem(coffee); // 1 x 30.000
    useCart.getState().addItem(peachTea); // 2 x 45.000

    expect(selectTotalQty(useCart.getState())).toBe(3);
    expect(selectTotalPrice(useCart.getState())).toBe(120000);

    useCart.getState().setQty(getLineKey(coffee), 3); // 3 x 30.000
    expect(selectTotalQty(useCart.getState())).toBe(5);
    expect(selectTotalPrice(useCart.getState())).toBe(180000);
  });

  it("WEB-T14: giỏ được lưu ở localStorage (brewlite-cart) và khôi phục sau khi tải lại", async () => {
    useCart.getState().addItem(coffee);
    useCart.getState().addItem(peachTea);

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved as string).state.items).toHaveLength(2);

    // Mô phỏng tải lại trang: bộ nhớ mất, localStorage còn
    useCart.setState({ items: [], voucherCode: "" });
    localStorage.setItem(STORAGE_KEY, saved as string);
    await useCart.persist.rehydrate();

    const { items } = useCart.getState();
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("Cà phê sữa");
    expect(selectTotalPrice(useCart.getState())).toBe(120000);
  });
});
