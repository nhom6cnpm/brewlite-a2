import { checkHealthPayload, checkProductsPayload } from './health-smoke';

describe('Production Smoke Test Contract (CD-T01 / INT-T01)', () => {
  describe('checkHealthPayload', () => {
    it('chấp nhận phản hồi hợp lệ từ GET /health với status "ok"', () => {
      const payload = { status: 'ok', service: 'brewlite-backend' };
      const result = checkHealthPayload(payload);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('từ chối khi payload rỗng hoặc null', () => {
      expect(checkHealthPayload(null).valid).toBe(false);
      expect(checkHealthPayload(undefined).valid).toBe(false);
      expect(checkHealthPayload({}).valid).toBe(false);
    });

    it('từ chối khi status khác "ok" (ví dụ "error" hoặc "degraded")', () => {
      const result = checkHealthPayload({ status: 'error', error: 'Database disconnected' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('status');
    });
  });

  describe('checkProductsPayload', () => {
    it('chấp nhận mảng sản phẩm hợp lệ có ít nhất 1 sản phẩm', () => {
      const products = [
        { id: 1, name: 'Cà phê sữa đá', price: 29000, stock: 77 },
        { id: 2, name: 'Bạc xỉu', price: 32000, stock: 99 },
      ];
      const result = checkProductsPayload(products);
      expect(result.valid).toBe(true);
      expect(result.productCount).toBe(2);
    });

    it('từ chối khi dữ liệu /products không phải là mảng', () => {
      const result = checkProductsPayload({ message: 'Internal Server Error' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('phải là mảng');
    });

    it('từ chối khi danh sách sản phẩm rỗng (chưa chạy seed / migration)', () => {
      const result = checkProductsPayload([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('rỗng');
    });

    it('từ chối khi phần tử trong mảng thiếu các trường bắt buộc (id, name, price)', () => {
      const invalidProducts = [{ invalidField: true }];
      const result = checkProductsPayload(invalidProducts);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('thiếu trường bắt buộc');
    });
  });
});
