import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuthNav from './AuthNav';

const mockLogout = vi.fn();
let mockAuthState = {
  user: null as { email: string; loyaltyPoints: number; role?: string } | null,
  isAuthenticated: false,
  logout: mockLogout,
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

describe('AuthNav', () => {
  it('hiển thị nút Đăng nhập khi chưa xác thực', () => {
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      logout: mockLogout,
    };

    render(<AuthNav />);

    const loginLink = screen.getByRole('link', { name: 'Đăng nhập' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('hiển thị email, điểm thưởng và nút Đăng xuất khi đã đăng nhập (CUSTOMER)', () => {
    mockAuthState = {
      user: {
        email: 'customer@brewlite.com',
        loyaltyPoints: 150,
        role: 'CUSTOMER',
      },
      isAuthenticated: true,
      logout: mockLogout,
    };

    render(<AuthNav />);

    expect(screen.getByText('customer@brewlite.com')).toBeInTheDocument();
    expect(screen.getByText('⭐ 150 điểm')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', { name: 'Đăng xuất' });
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('hiển thị nút Quản trị khi người dùng có role là ADMIN', () => {
    mockAuthState = {
      user: {
        email: 'admin@brewlite.com',
        loyaltyPoints: 0,
        role: 'ADMIN',
      },
      isAuthenticated: true,
      logout: mockLogout,
    };

    render(<AuthNav />);

    const adminLink = screen.getByRole('link', { name: 'Quản trị' });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/admin/payments');
  });
});

