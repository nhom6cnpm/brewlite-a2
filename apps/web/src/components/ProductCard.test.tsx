import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductCard from './ProductCard';
import type { Product } from '@/types/product';

const base: Product = {
  id: 'p1',
  name: 'Americano',
  price: 30000,
  imageUrl: '/images/americano.jpg',
};

describe('ProductCard', () => {
  it('WEB-T50: hiện nhãn "Hết hàng" khi stock = 0', () => {
    render(<ProductCard product={{ ...base, stock: 0 }} />);
    expect(screen.getByText('Hết hàng')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/p1');
  });

  it('WEB-T50: không hiện "Hết hàng" khi còn ly hoặc chưa có stock', () => {
    const { rerender } = render(<ProductCard product={{ ...base, stock: 12 }} />);
    expect(screen.queryByText('Hết hàng')).not.toBeInTheDocument();
    rerender(<ProductCard product={base} />);
    expect(screen.queryByText('Hết hàng')).not.toBeInTheDocument();
    expect(screen.getByText('Americano')).toBeInTheDocument();
  });
});
