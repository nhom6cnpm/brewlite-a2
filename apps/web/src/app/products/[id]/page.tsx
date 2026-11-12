"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatPrice } from "@/lib/formatPrice";
import { getProduct, ProductNotFoundError } from "@/lib/products";
import type { Product } from "@/types/product";
import ProductOptions from "@/components/ProductOptions";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link
        href="/menu"
        className="mb-6 inline-block font-semibold text-amber-800 hover:underline"
      >
        ← Quay lại thực đơn
      </Link>
      <ProductDetails key={id} id={id} />
    </div>
  );
}

function ProductDetails({ id }: { id: string }) {
  const { data: product, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["products", id],
    queryFn: ({ signal }) => getProduct(id, signal),
    staleTime: 30_000,
    retry: false,
  });

  if (isPending) {
    return (
      <section
        aria-busy="true"
        aria-label="Đang tải thông tin món"
        className="overflow-hidden rounded-2xl border border-stone-200 bg-white sm:grid sm:grid-cols-2"
      >
        <div aria-hidden="true" className="aspect-square animate-pulse bg-stone-200" />
        <div aria-hidden="true" className="space-y-4 p-6">
          <div className="h-8 w-3/4 animate-pulse rounded bg-stone-200" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-stone-200" />
        </div>
      </section>
    );
  }

  if (!product) {
    const isMissing = error instanceof ProductNotFoundError;

    return (
      <section
        role="alert"
        className="rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center"
      >
        <h1 className="text-2xl font-bold">
          {isMissing ? "Sản phẩm không tồn tại" : "Không tải được thông tin món"}
        </h1>
        <p className="mt-3 text-stone-600">
          {isMissing
            ? "Món này không có trong thực đơn. Vui lòng chọn món khác."
            : "Vui lòng kiểm tra kết nối và thử lại."}
        </p>
        {isMissing ? (
          <Link
            href="/menu"
            className="mt-6 inline-block rounded-full bg-amber-800 px-5 py-2 font-semibold text-white"
          >
            Về thực đơn
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-6 rounded-full bg-amber-800 px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {isFetching ? "Đang thử lại…" : "Thử lại"}
          </button>
        )}
      </section>
    );
  }

  return (
    <>
      {error && (
        <div role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-amber-900">
          <p>Chưa cập nhật được thông tin món.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-2 font-semibold underline disabled:opacity-60"
          >
            {isFetching ? "Đang thử lại…" : "Thử lại"}
          </button>
        </div>
      )}
      <ProductInfo key={product.id} product={product} disabled={isFetching || Boolean(error)} />
    </>
  );
}

function ProductInfo({ product, disabled }: { product: Product; disabled: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section
      aria-labelledby="product-name"
      className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm sm:grid sm:grid-cols-2"
    >
      <div className="aspect-square bg-stone-100">
        {!imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            role="img"
            aria-label={"Chưa có ảnh cho " + product.name}
            className="flex h-full items-center justify-center text-6xl"
          >
            ☕
          </div>
        )}
      </div>
      <div className="p-6 sm:p-8">
        <h1 id="product-name" className="text-3xl font-bold text-stone-900">
          {product.name}
        </h1>
        <p className="mt-4 text-2xl font-semibold text-amber-800">
          {formatPrice(product.price)}
        </p>
        <ProductOptions product={product} disabled={disabled} />
      </div>
    </section>
  );
}
