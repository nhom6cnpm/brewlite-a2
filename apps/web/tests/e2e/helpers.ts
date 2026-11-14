import {
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
  type Response,
  type TestInfo,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { E2E, staffMode } from "./environment";

// A1 92a43f4 orders.spec.ts/staff.ts: keep real account/login/staff-context flow;
// no route.fulfill(), fabricated orders, injected auth/cart or direct order creation.
export async function newCustomer(request: APIRequestContext) {
  const credentials = {
    email: `e2e-${randomUUID()}@brewlite-e2e.test`,
    password: `Test-${randomUUID()}!`,
  };
  const registered = await request.post(E2E.api + "/auth/register", {
    data: credentials,
  });
  expect(registered.status(), "Đăng ký tài khoản test riêng").toBe(201);
  return credentials;
}

export function apiResponse(response: Response, path: string, method: string) {
  const url = new URL(response.url());
  return (
    url.origin === E2E.api &&
    url.pathname === path &&
    response.request().method() === method
  );
}

export async function addDrinkFromMenu(page: Page, request: APIRequestContext) {
  const response = await request.get(E2E.api + "/products/p1");
  expect(response.ok()).toBe(true);
  const product = (await response.json()) as {
    name: string;
    price: number;
    stock: number;
  };
  expect(
    product.stock,
    "Stack mới phải đủ nguyên liệu cho 2 ly test",
  ).toBeGreaterThanOrEqual(2);
  await page.goto("/menu");
  await page.locator('a[href="/products/p1"]').click();
  await expect(
    page.getByRole("heading", { name: product.name, exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Size M/ }).check();
  await page.getByRole("checkbox", { name: /Kem béo/ }).check();
  await page.getByRole("spinbutton", { name: "Số lượng ly" }).fill("2");
  await page
    .getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })
    .click();
  await expect(page.getByText(/Đã thêm/)).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: /^Giỏ hàng/ })
    .click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(
    page.getByRole("heading", { name: product.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Size M · Kem béo", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Đủ nguyên liệu theo lựa chọn hiện tại.", { exact: false }),
  ).toBeVisible();
  return { product, subtotal: (product.price + 10_000) * 2 };
}

export async function loginCustomer(
  page: Page,
  credentials: { email: string; password: string },
) {
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(credentials.password);
  const result = page.waitForResponse((response) =>
    apiResponse(response, "/auth/login", "POST"),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const response = await result;
  expect(response.ok()).toBe(true);
  const auth = (await response.json()) as {
    access_token: string;
    user: { email: string; role: string };
  };
  expect(auth.user.role).toBe("CUSTOMER");
  await expect(page).toHaveURL(/\/cart$/);
  return auth;
}

export async function applyVoucher(page: Page) {
  await page
    .getByRole("button", { name: "Chọn hoặc nhập mã", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Chọn ưu đãi BrewLite" });
  await dialog.getByRole("textbox", { name: "Nhập mã giảm giá" }).fill("THU5K");
  await dialog.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(
    dialog.getByText("Đang chọn: THU5K", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("Đã áp dụng THU5K", { exact: true }),
  ).toBeVisible();
}

export async function confirmAsStaff(
  browser: Browser,
  request: APIRequestContext,
  orderId: string,
  paymentId: string,
  testInfo: TestInfo,
) {
  const mode = staffMode();
  testInfo.annotations.push({
    type: "staff-confirmation",
    description:
      mode === "ui"
        ? "Đăng nhập và bấm UI admin #56"
        : "API thật #34 (chế độ tạm theo bàn giao, không kiểm chứng UI admin)",
  });
  if (mode === "api") {
    const response = await request.post(E2E.api + "/auth/login", {
      data: { email: E2E.adminEmail, password: E2E.adminPassword },
    });
    expect(response.ok()).toBe(true);
    const auth = (await response.json()) as {
      access_token: string;
      user: { role: string };
    };
    expect(auth.user.role).toBe("ADMIN");
    const confirmed = await request.post(
      E2E.api + "/admin/payments/" + paymentId + "/confirm",
      { headers: { Authorization: `Bearer ${auth.access_token}` }, data: {} },
    );
    expect(confirmed.ok()).toBe(true);
    return;
  }
  const staffContext = await browser.newContext({
    baseURL: E2E.web,
    viewport: { width: 1280, height: 900 },
  });
  try {
    const staff = await staffContext.newPage();
    staff.on("dialog", (dialog) => dialog.accept());
    await staff.goto(
      "/login?redirect=" +
        encodeURIComponent("/admin/payments?orderId=" + orderId),
    );
    await staff.getByLabel("Email", { exact: true }).fill(E2E.adminEmail);
    await staff.getByLabel("Mật khẩu", { exact: true }).fill(E2E.adminPassword);
    await staff.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(staff).toHaveURL(/\/admin\/payments\?/);
    const row = staff
      .locator("li")
      .filter({ hasText: orderId })
      .filter({
        has: staff.getByRole("button", {
          name: "Xác nhận đã nhận tiền",
          exact: true,
        }),
      })
      .first();
    await row
      .getByRole("button", { name: "Xác nhận đã nhận tiền", exact: true })
      .click();
    await expect(
      staff.getByRole("button", { name: "Xác nhận đã nhận tiền", exact: true }),
    ).toHaveCount(0);
  } finally {
    await staffContext.close();
  }
}

export async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  const image = await page.screenshot({
    path: testInfo.outputPath(name + ".png"),
    fullPage: true,
  });
  await testInfo.attach(name, { body: image, contentType: "image/png" });
}
