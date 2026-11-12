'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthNav from './AuthNav';

export default function Header() {
  const pathname = usePathname();
  const isMenu =
    pathname.startsWith('/menu') || pathname.startsWith('/products');

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/menu" className="text-xl font-bold text-amber-800">
          BrewLite
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label="Điều hướng chính">
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
          </nav>
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
