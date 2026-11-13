"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * Shows children only to a logged-in ADMIN. The API checks the role too
 * (RolesGuard → 403); this only hides staff pages from customers.
 */
export default function AdminGate({
  redirect,
  children,
}: {
  redirect: string;
  children: (token: string) => ReactNode;
}) {
  const { token, user } = useAuth();
  const hydrated = useHydrated();
  if (!hydrated)
    return (
      <p role="status" className="mx-auto max-w-6xl px-4 py-12 text-stone-600">
        Đang tải…
      </p>
    );
  if (!token)
    return (
      <section className="mx-auto max-w-xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Trang dành cho nhân viên</h1>
        <p className="mt-3 text-stone-600">
          Vui lòng đăng nhập bằng tài khoản quản trị.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(redirect)}`}
          className="mt-6 inline-block rounded-full bg-amber-800 px-6 py-3 font-semibold text-white"
        >
          Đăng nhập
        </Link>
      </section>
    );
  if (user?.role !== "ADMIN")
    return (
      <section className="mx-auto max-w-xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Không có quyền truy cập</h1>
        <p className="mt-3 text-stone-600">
          Chỉ nhân viên cửa hàng mới xem được trang này.
        </p>
        <Link
          href="/menu"
          className="mt-6 inline-block font-semibold text-amber-800 underline"
        >
          Về Menu
        </Link>
      </section>
    );
  return <>{children(token)}</>;
}
