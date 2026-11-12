import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LoginPage from './page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockLogin = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    user: null,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị form đăng nhập đầy đủ các trường', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', { name: 'Đăng nhập tài khoản' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Đăng nhập' }),
    ).toBeInTheDocument();
  });

  it('gửi thông tin đăng nhập và chuyển hướng khi thành công', async () => {
    mockLogin.mockResolvedValueOnce({
      access_token: 'fake-token',
      user: { id: '1', email: 'test@brewlite.com', loyaltyPoints: 0 },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@brewlite.com' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@brewlite.com', 'password123');
      expect(mockPush).toHaveBeenCalledWith('/menu');
    });
  });

  it('hiển thị thông báo lỗi khi đăng nhập thất bại', async () => {
    mockLogin.mockRejectedValueOnce(
      new Error('Email hoặc mật khẩu không chính xác.'),
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'wrong@brewlite.com' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(
      await screen.findByText('Email hoặc mật khẩu không chính xác.'),
    ).toBeInTheDocument();
  });
});

