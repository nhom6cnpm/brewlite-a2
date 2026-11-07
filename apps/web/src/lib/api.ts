import type { Product } from '@/types/product';
import { getApiBaseUrl, isProduct } from '@/lib/products';

export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await fetch(getApiBaseUrl() + '/products', {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Không tải được dữ liệu (mã lỗi ' + response.status + ')');
  }

  const raw: unknown = await response.json();
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' && raw !== null && 'data' in raw
      ? raw.data
      : null;
  if (!Array.isArray(list) || !list.every(isProduct)) {
    throw new Error('Invalid products response');
  }
  return list;
}
