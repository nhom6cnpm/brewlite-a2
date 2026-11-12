'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/types/product';
import { formatPrice } from '@/lib/formatPrice';

export default function ProductCard({ product }: { product: Product }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = product.imageUrl && !imgFailed;
  const isOutOfStock = product.stock === 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-amber-700"
    >
      {/* Nhãn Hết hàng khi stock = 0 */}
      {isOutOfStock && (
        <div className="absolute top-3 right-3 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow">
          Hết hàng
        </div>
      )}

      <div className={`relative aspect-square w-full bg-stone-100 ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}>
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">☕</div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <h2 className="line-clamp-1 font-semibold text-stone-900">{product.name}</h2>
        <p className="mt-1 font-medium text-amber-800">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}