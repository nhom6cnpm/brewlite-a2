import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter } from 'next/navigation';
import CheckoutPage from '../app/cart/page'; 
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../store/useCart';
import { submitOrderApi } from '@/lib/orders/orders'; 
import { getStoredToken } from '@/lib/auth';

// --- Mock các module ---
vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getStoredToken: vi.fn() })); 

vi.mock('@/components/CartVoucherSummary', () => ({
  default: () => <div data-testid="mock-voucher-summary">Voucher Summary</div>,
}));

vi.mock('../store/useCart', () => ({
  useCart: vi.fn(),
  getLineKey: vi.fn(() => 'mock-key'),
}));

vi.mock('@/lib/orders/orders', () => ({ submitOrderApi: vi.fn() }));
vi.mock('@/lib/payments/storage', () => ({
  getOrderRequestKey: vi.fn(() => 'mock-idempotency-key'),
  getActiveCheckout: vi.fn(() => null),
  saveCheckout: vi.fn(),
  clearOrderRequestKey: vi.fn(),
  clearActiveCheckout: vi.fn(),
  getCartFingerprint: vi.fn(() => 'mock-fingerprint'),
}));

vi.mock('@/hooks/useHydrated', () => ({ useHydrated: vi.fn(() => true) }));
vi.mock('@/hooks/useAvailability', () => ({
  useAvailability: vi.fn(() => ({
    data: { available: true, items: [] },
    isPending: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn().mockResolvedValue({ data: { available: true } }),
  })),
}));
vi.mock('@/hooks/useClearPaidCart', () => ({ useClearPaidCart: vi.fn() }));
vi.mock('@/hooks/useOrderHistory', () => ({
  useOwnOrder: vi.fn(() => ({ data: null, isError: false })),
  useOrderClock: vi.fn(() => Date.now()),
}));
vi.mock('@/lib/orderUtils', () => ({
  canPay: vi.fn(() => true),
  isPaid: vi.fn(() => false),
}));

describe('Trang Giỏ Hàng - Đặt hàng (Task 5.2)', () => {
  const mockPush = vi.fn();
  const mockClearCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
    
    vi.mocked(useCart).mockImplementation((selector: unknown) => {
      const state = {
        items: [{ productId: '1', name: 'Cà phê sữa', qty: 2, size: 'M', toppingIds: [], unitPrice: 30000, imageUrl: '' }],
        voucherCode: '',
        setQty: vi.fn(),
        removeItem: vi.fn(),
        clear: mockClearCart,
      };
      // Ép kiểu hàm selector để tránh lỗi TypeScript
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });
  });

  // WEB-T70
  it('WEB-T70: Chưa đăng nhập thì chuyển hướng sang trang đăng nhập', async () => {
    vi.mocked(getStoredToken).mockReturnValue(null);
    vi.mocked(useAuth).mockReturnValue({ user: null, token: null } as unknown as ReturnType<typeof useAuth>);

    render(<CheckoutPage />);

    fireEvent.click(screen.getByRole('button', { name: /đặt hàng/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=/cart');
    });
  });

  // WEB-T71
  it('WEB-T71: Bấm đúp "Đặt hàng" chỉ gọi API 1 lần với cùng Idempotency-Key', async () => {
    vi.mocked(getStoredToken).mockReturnValue('mock-token');
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, token: 'mock-token' } as unknown as ReturnType<typeof useAuth>);
    
    vi.mocked(submitOrderApi).mockResolvedValue({ 
      orderId: 'order-123', status: 'PENDING', message: 'Thành công', total: 60000, subtotal: 60000, discount: 0, voucherCode: null, voucherTitle: null, createdAt: new Date().toISOString(), expiresAt: new Date().toISOString(),
    });

    render(<CheckoutPage />);

    const btn = screen.getByRole('button', { name: /đặt hàng/i });
    fireEvent.click(btn);
    fireEvent.click(btn); 

    await waitFor(() => {
      expect(submitOrderApi).toHaveBeenCalledTimes(1);
      expect(submitOrderApi).toHaveBeenCalledWith(
        expect.any(Array), undefined, 'mock-idempotency-key' 
      );
    });
  });

  // WEB-T72
  it('WEB-T72: API trả lỗi hết nguyên liệu thì hiện lỗi và không xóa giỏ', async () => {
    vi.mocked(getStoredToken).mockReturnValue('mock-token');
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, token: 'mock-token' } as unknown as ReturnType<typeof useAuth>);
    
    vi.mocked(submitOrderApi).mockRejectedValue(
      new Error('Nguyên liệu sữa đã hết, vui lòng chọn món khác.')
    );

    render(<CheckoutPage />);

    fireEvent.click(screen.getByRole('button', { name: /đặt hàng/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Nguyên liệu sữa đã hết/i);
    });
    
    expect(mockClearCart).not.toHaveBeenCalled();
  });
});