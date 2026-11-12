import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import RegisterPage from './page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockRegister = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    register: mockRegister,
    isAuthenticated: false,
    user: null,
  }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị form tạo tài khoản đầy đủ các trường', () => {
    render(<RegisterPage />);

    expect(
      screen.getByRole('heading', { name: 'Tạo tài khoản mới' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Mật khẩu (tối thiểu 6 ký tự)'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Xác nhận mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng ký' })).toBeInTheDocument();
  });

  it('báo lỗi khi mật khẩu quá ngắn (< 6 ký tự)', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu (tối thiểu 6 ký tự)'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    expect(
      await screen.findByText('Mật khẩu phải dài ít nhất 6 ký tự.'),
    ).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('báo lỗi khi mật khẩu xác nhận không khớp', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu (tối thiểu 6 ký tự)'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), {
      target: { value: '654321' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    expect(
      await screen.findByText('Mật khẩu xác nhận không khớp.'),
    ).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('gọi register và chuyển hướng khi đăng ký thành công', async () => {
    mockRegister.mockResolvedValueOnce({
      access_token: 'fake-token',
      user: { id: '1', email: 'user@test.com', loyaltyPoints: 0 },
    });

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu (tối thiểu 6 ký tự)'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('user@test.com', '123456');
      expect(mockPush).toHaveBeenCalledWith('/menu');
    });
  });
});

