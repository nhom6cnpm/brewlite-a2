"use client";

import { useEffect, useRef, useState } from "react";
import { useAvailability } from "@/hooks/useAvailability";
import { useHydrated } from "@/hooks/useHydrated";
import { getCartAvailability } from "@/lib/availability";
import { formatPrice } from "@/lib/formatPrice";
import {
  calculateUnitPrice, sizeOptions, toppingOptions,
  type ProductSize, type ToppingId,
} from "@/lib/productOptions";
import { getLineKey, useCart } from "@/store/useCart";
import type { Product } from "@/types/product";

/** Product selection from A1 92a43f4, adapted to the Sprint 1 detail layout. */
export default function ProductOptions({
  product, disabled = false,
}: { product: Product; disabled?: boolean }) {
  const [size, setSize] = useState<ProductSize>("S");
  const [toppingIds, setToppingIds] = useState<ToppingId[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  const items = useCart((state) => state.items);
  const hydrated = useHydrated();
  const selection = { productId: product.id, size, toppingIds, qty: 1 };
  const availability = useAvailability([...items, selection], hydrated);
  const stock = availability.data?.items[items.length]?.stock ?? 0;
  const alreadyInCart = items.find((item) => getLineKey(item) === getLineKey(selection))?.qty ?? 0;
  const maximum = Math.max(0, Math.min(stock, 99 - alreadyInCart));
  const checking = !hydrated || availability.isPending || availability.isFetching;
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= maximum;
  const unavailable = disabled || adding || checking || availability.isError ||
    !availability.data?.available || !validQuantity;
  const unitPrice = calculateUnitPrice(product.price, size, toppingIds);

  useEffect(() => () => request.current?.abort(), []);

  function changed() {
    setError("");
    setMessage("");
  }

  function toggleTopping(id: ToppingId) {
    setToppingIds((previous) => previous.includes(id)
      ? previous.filter((value) => value !== id) : [...previous, id]);
    changed();
  }

  async function addSelection() {
    if (unavailable || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setAdding(true);
    changed();
    const previousCart = useCart.getState().items;
    try {
      // Verify the actual requested quantity, including every line already in the cart.
      const latest = await getCartAvailability(
        [...previousCart, { ...selection, qty: quantity }], controller.signal,
      );
      if (controller.signal.aborted) return;
      if (useCart.getState().items !== previousCart) {
        throw new Error("Giỏ hàng vừa thay đổi. Vui lòng kiểm tra và thử lại.");
      }
      if (!latest.available || latest.items[previousCart.length].stock < quantity) {
        void availability.refetch();
        throw new Error("Nguyên liệu vừa thay đổi, không đủ số ly đã chọn. Vui lòng thử lại.");
      }
      useCart.getState().addItem({
        productId: product.id, name: product.name, imageUrl: product.imageUrl,
        size, toppingIds, qty: quantity, unitPrice,
      });
      setMessage(`Đã thêm ${quantity} ly ${product.name}, size ${size} vào giỏ hàng.`);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Không thêm được món. Vui lòng thử lại.");
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setAdding(false);
    }
  }

  return (
    <div className="mt-6 space-y-5 border-t border-stone-200 pt-5">
      <fieldset disabled={adding || disabled}>
        <legend className="font-semibold">Chọn kích cỡ (Size)</legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {sizeOptions.map((option) => (
            <label key={option.id} className={`cursor-pointer rounded-xl border p-3 text-center focus-within:outline-2 focus-within:outline-amber-800 ${size === option.id ? "border-amber-800 bg-amber-50" : "border-stone-200"}`}>
              <input type="radio" name={`size-${product.id}`} value={option.id}
                checked={size === option.id} onChange={() => { setSize(option.id); changed(); }}
                className="mr-1 accent-amber-800" />
              <span>Size {option.id}</span>
              <span className="mt-1 block text-xs text-stone-600">+{formatPrice(option.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={adding || disabled}>
        <legend className="font-semibold">Topping thêm</legend>
        <div className="mt-3 space-y-2">
          {toppingOptions.map((option) => (
            <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 p-3">
              <input type="checkbox" checked={toppingIds.includes(option.id)}
                onChange={() => toggleTopping(option.id)} className="accent-amber-800" />
              <span className="flex-1">{option.name}</span><span>+{formatPrice(option.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <p role="status" className="text-sm text-stone-600">
          {checking ? "Đang kiểm tra số ly còn bán…"
            : availability.isError ? "Chưa kiểm tra được số ly còn bán"
              : `Chỉ còn ${stock} ly theo lựa chọn này`}
        </p>
        {items.length > 0 && <p className="mt-1 text-xs text-stone-600">Đã tính nguyên liệu cho các món đang có trong giỏ.</p>}
        {!checking && !availability.isError && availability.data?.available === false && stock > 0 && (
          <p role="alert" className="mt-2 text-sm text-red-700">Giỏ hàng hiện tại vượt số ly còn bán. Vui lòng điều chỉnh giỏ.</p>
        )}
        {availability.isError && (
          <div role="alert" className="mt-2 text-sm text-red-700">
            <p>{availability.error.message}</p>
            <button type="button" onClick={() => void availability.refetch()}
              disabled={availability.isFetching} className="mt-2 font-semibold underline">Thử kiểm tra lại nguyên liệu</button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={`quantity-${product.id}`} className="font-semibold">Số lượng ly</label>
        <div className="flex items-center rounded-xl border border-stone-200">
          <button type="button" aria-label="Giảm số lượng" disabled={adding || disabled || quantity <= 1}
            onClick={() => { setQuantity(quantity - 1); changed(); }} className="h-11 w-11 disabled:opacity-40">−</button>
          <input id={`quantity-${product.id}`} type="number" inputMode="numeric" min={1} max={Math.max(1, maximum)}
            value={Number.isFinite(quantity) ? quantity : ""} disabled={adding || disabled}
            onChange={(event) => { setQuantity(event.target.valueAsNumber); changed(); }}
            className="w-16 bg-transparent text-center" />
          <button type="button" aria-label="Tăng số lượng" disabled={adding || disabled || checking || quantity >= maximum || !Number.isSafeInteger(quantity)}
            onClick={() => { setQuantity(quantity + 1); changed(); }} className="h-11 w-11 disabled:opacity-40">+</button>
        </div>
      </div>
      {!checking && !availability.isError && !validQuantity && maximum > 0 && (
        <p role="alert" className="text-sm text-red-700">Vui lòng chọn số lượng nguyên từ 1 đến {maximum} ly (tối đa 99 ly cho cùng lựa chọn trong giỏ).</p>
      )}
      {!checking && !availability.isError && maximum === 0 && (
        <p role="alert" className="text-sm text-red-700">{stock === 0 ? "Không đủ nguyên liệu theo lựa chọn." : "Giỏ đã có 99 ly cho lựa chọn này."}</p>
      )}
      <div className="space-y-2 rounded-xl bg-amber-50 p-4">
        <p>Đơn giá 1 ly: <output aria-label="Đơn giá" className="font-semibold">{formatPrice(unitPrice)}</output></p>
        <p>Thành tiền: <output aria-label="Thành tiền" className="font-bold text-amber-800">{Number.isSafeInteger(quantity) && quantity > 0 ? formatPrice(unitPrice * quantity) : "—"}</output></p>
      </div>
      <button type="button" disabled={unavailable} onClick={() => void addSelection()}
        className="min-h-12 w-full rounded-xl bg-amber-800 px-4 py-3 font-bold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50">
        {adding ? "Đang kiểm tra…" : "Thêm vào giỏ hàng"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-green-800">{message}</p>}
    </div>
  );
}
