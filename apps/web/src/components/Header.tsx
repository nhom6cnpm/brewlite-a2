'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import AuthNav from './AuthNav';

const CartBadge = dynamic(() => import('./CartBadge'), { ssr: false });

export default function Header() {
  const pathname = usePathname();
  const isMenu =
    pathname.startsWith('/menu') || pathname.startsWith('/products');
  const isCart = pathname.startsWith('/cart');
  const isOrders = pathname.startsWith('/orders');

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/menu" className="text-xl font-bold text-amber-800">
          BrewLite
        </Link>
        
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <nav aria-label="Điều hướng chính" className="flex flex-wrap items-center gap-2">
            <Link
              href="/menu"
              aria-current={isMenu ? 'page' : undefined}
              className={
                'inline-block rounded-full px-4 py-2 text-sm font-medium ' +
                (isMenu
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-stone-600 hover:bg-stone-100')
              }
            >
              Menu
            </Link>
            <Link
              href="/cart"
              aria-current={isCart ? 'page' : undefined}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ' +
                (isCart
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-stone-600 hover:bg-stone-100')
              }
            >
              Giỏ hàng
              <CartBadge />
            </Link>
            <Link
              href="/orders"
              aria-current={isOrders ? 'page' : undefined}
              className={'inline-block rounded-full px-4 py-2 text-sm font-medium ' +
                (isOrders ? 'bg-amber-100 text-amber-900' : 'text-stone-600 hover:bg-stone-100')}
            >
              Đơn hàng
            </Link>
          </nav>
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
