import { expect, test } from "@playwright/test";
import { E2E } from "./environment";
import {
  addDrinkFromMenu,
  applyVoucher,
  loginCustomer,
  newCustomer,
  screenshot,
} from "./helpers";

test("E2E-T02 @prepare menu → tùy chọn → giỏ → đăng nhập; chưa đặt đơn", async ({
  page,
  request,
}, testInfo) => {
  const customer = await newCustomer(request);
  const orders: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/orders")
      orders.push(req.url());
  });
  const { product } =
    await test.step("Chọn 2 ly size M + Kem béo bằng UI", () =>
      addDrinkFromMenu(page, request));
  await test.step("Giỏ giữ món khi tải lại và đăng nhập", async () => {
    await page.reload();
    await expect(
      page.getByRole("heading", { name: product.name, exact: true }),
    ).toBeVisible();
    // main chưa có checkout #57: mở form đăng nhập thật, không giả lập nút đặt đơn.
    await page.goto("/login?redirect=/cart");
    const auth = await loginCustomer(page, customer);
    const mine = await request.get(E2E.api + "/orders/me", {
      headers: { Authorization: `Bearer ${auth.access_token}` },
    });
    expect(mine.ok()).toBe(true);
    expect(
      await mine.json(),
      "Phần chuẩn bị chưa tạo đơn cho khách test",
    ).toEqual([]);
    await expect(
      page.getByRole("heading", { name: product.name, exact: true }),
    ).toBeVisible();
  });
  await test.step("Chọn voucher bằng giao diện, không giữ lượt/đặt đơn", () =>
    applyVoucher(page));
  expect(orders, "E2E-T02 chỉ chuẩn bị, không tạo đơn qua UI hoặc API").toEqual(
    [],
  );
  await screenshot(page, testInfo, "prepare-cart-after-login");
});
