/**
 * Tiêu chí kiểm tra tính hợp lệ của phản hồi Smoke Test cho Production CD
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  productCount?: number;
}

export function checkHealthPayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Phản hồi health rỗng hoặc không phải object' };
  }

  const data = payload as Record<string, unknown>;
  if (data.status !== 'ok') {
    return {
      valid: false,
      error: `Trường status không hợp lệ, nhận được: ${String(data.status)}`,
    };
  }

  return { valid: true };
}

export function checkProductsPayload(payload: unknown): ValidationResult {
  if (!Array.isArray(payload)) {
    return {
      valid: false,
      error: `Dữ liệu /products phải là mảng, nhận được: ${typeof payload}`,
    };
  }

  if (payload.length === 0) {
    return {
      valid: false,
      error: 'Danh sách sản phẩm rỗng (chưa chạy seed / migration)',
    };
  }

  for (const item of payload) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Phần tử sản phẩm không hợp lệ' };
    }
    const product = item as Record<string, unknown>;
    if (
      product.id === undefined ||
      typeof product.name !== 'string' ||
      typeof product.price !== 'number'
    ) {
      return {
        valid: false,
        error: 'Sản phẩm trong danh sách thiếu trường bắt buộc (id, name, price)',
      };
    }
  }

  return { valid: true, productCount: payload.length };
}
