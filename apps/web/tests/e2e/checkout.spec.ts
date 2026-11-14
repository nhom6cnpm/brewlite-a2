import { expect, test } from "@playwright/test";
import {
  addDrinkFromMenu,
  apiResponse,
  applyVoucher,
  confirmAsStaff,
  loginCustomer,
  newCustomer,
  screenshot,
} from "./helpers";
import { E2E } from "./environment";

test("E2E-T01 @full menu → giỏ → đăng nhập → đặt đơn → Ví → ngân hàng → xác nhận → PAID", async ({
  page,
  request,
  browser,
}, testInfo) => {
  const credentials = await newCustomer(request);
  const jsErrors: string[] = [];
  page.on("pageerror", (error) => jsErrors.push(error.message));
  const { product, subtotal } =
    await test.step("Xem menu, chọn món và thêm giỏ bằng UI", () =>
      addDrinkFromMenu(page, request));

  const auth =
    await test.step("Khách chưa đăng nhập bấm đặt hàng rồi đăng nhập về giỏ", async () => {
      const checkout = page.getByRole("button", {
        name: "Đặt hàng",
        exact: true,
      });
      await expect(
        checkout,
        "Cần checkout #57 đã merge/build, không bỏ qua bước đặt từ giỏ",
      ).toBeVisible();
      await checkout.click();
      await expect(page).toHaveURL(/\/login\?redirect=(%2Fcart|\/cart)$/);
      const signedIn = await loginCustomer(page, credentials);
      await expect(
        page.getByRole("heading", { name: product.name, exact: true }),
      ).toBeVisible();
      await applyVoucher(page);
      return signedIn;
    });

  const created =
    await test.step("POST /orders phải phát sinh từ nút Đặt hàng, có Idempotency-Key", async () => {
      const pending = page.waitForResponse((response) =>
        apiResponse(response, "/orders", "POST"),
      );
      await page.getByRole("button", { name: "Đặt hàng", exact: true }).click();
      const response = await pending;
      expect(response.status()).toBe(201);
      expect(response.request().headers()["idempotency-key"]).toBeTruthy();
      const body = response.request().postDataJSON() as {
        voucherCode: string;
        items: unknown[];
      };
      expect(body.voucherCode).toBe("THU5K");
      expect(body.items).toEqual([
        { productId: "p1", size: "M", toppingIds: ["cream"], qty: 2 },
      ]);
      const order = (await response.json()) as {
        orderId: string;
        total: number;
        subtotal: number;
        discount: number;
        status: string;
      };
      expect(order).toMatchObject({
        status: "PENDING",
        subtotal,
        discount: 5000,
        total: subtotal - 5000,
      });
      expect(order.orderId).toMatch(/^ORD-/);
      // Review #57 permits either paymentSelectionPath or a checkout page
      // embedding Bách's PaymentMethodPicker (current head 1c413d3).
      await expect(page).toHaveURL(
        new RegExp(`/(?:checkout|pay/order)/${order.orderId}$`),
      );
      return order;
    });
  const headers = { Authorization: `Bearer ${auth.access_token}` };
  const readOrder = async () => {
    const response = await request.get(E2E.api + "/orders/" + created.orderId, {
      headers,
    });
    expect(response.ok()).toBe(true);
    return response.json() as Promise<{
      status: string;
      total: number;
      discount: number;
      transferReceived: boolean;
      pointsEarned: number;
    }>;
  };

  const paymentId =
    await test.step("Chọn Ví, mở phiên từ UI và hiển thị QR thật", async () => {
      await expect(
        page.getByRole("heading", {
          name: "Chọn cách thanh toán",
          exact: true,
        }),
      ).toBeVisible();
      await page.getByRole("radio", { name: /Ví điện tử/ }).check();
      const pending = page.waitForResponse((response) =>
        apiResponse(response, "/payments", "POST"),
      );
      await page.getByRole("button", { name: /^Thanh toán ·/ }).click();
      const response = await pending;
      expect(response.ok()).toBe(true);
      const payment = (await response.json()) as {
        paymentId: string;
        orderId: string;
        amount: number;
      };
      expect(payment).toMatchObject({
        orderId: created.orderId,
        amount: created.total,
      });
      await expect(page).toHaveURL(E2E.web + "/pay/" + payment.paymentId);
      await expect(
        page.getByRole("img", { name: "Mã QR mở ngân hàng giả lập" }),
      ).toBeVisible();
      return payment.paymentId;
    });

  await test.step("Ngân hàng công khai: chuyển tiền bằng nút UI; đơn vẫn PENDING", async () => {
    const link = page.getByRole("link", {
      name: "Mở ngân hàng giả lập",
      exact: true,
    });
    await expect(link).toHaveAttribute("href", "/mock-bank/" + paymentId);
    const bankContext = await browser.newContext({ baseURL: E2E.web });
    try {
      const bank = await bankContext.newPage();
      bank.on("pageerror", (error) => jsErrors.push(error.message));
      await bank.goto("/mock-bank/" + paymentId);
      expect(
        await bank.evaluate(() => localStorage.getItem("brewlite_token")),
      ).toBeNull();
      await expect(
        bank.getByText(created.orderId, { exact: true }),
      ).toBeVisible();
      await bank
        .getByRole("button", { name: "Chuyển tiền (mô phỏng)", exact: true })
        .click();
      await expect(
        bank.getByRole("heading", {
          name: "Đã ghi nhận chuyển tiền",
          exact: true,
        }),
      ).toBeVisible();
      await screenshot(bank, testInfo, "mock-bank-transfer");
    } finally {
      await bankContext.close();
    }
    expect(await readOrder()).toMatchObject({
      status: "PENDING",
      transferReceived: true,
      total: created.total,
    });
    await expect(
      page.getByText(
        "Đã nhận tiền, đang chờ nhân viên xác nhận. Không cần chuyển lại.",
        { exact: true },
      ),
    ).toBeVisible();
  });

  await test.step("Nhân viên xác nhận bằng phiên riêng; khách tự chuyển sang confirmation", async () => {
    await confirmAsStaff(
      browser,
      request,
      created.orderId,
      paymentId,
      testInfo,
    );
    await expect(page).toHaveURL(
      E2E.web + "/orders/" + created.orderId + "/confirmation",
    );
    await expect(
      page.getByRole("heading", { name: "Đặt hàng thành công!", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Thanh toán đã được xác nhận · PAID", { exact: true }),
    ).toBeVisible();
    expect(await readOrder()).toMatchObject({
      status: "PAID",
      total: created.total,
      discount: 5000,
      pointsEarned: Math.floor(created.total / 10000),
    });
    await screenshot(page, testInfo, "paid-confirmation");
  });
  await test.step("Lịch sử giữ đúng đơn; chỉ xóa giỏ sau PAID (#57)", async () => {
    // Navigating to /cart must not mask a missing confirmation hook by
    // clearing the cart only on that later visit. This is a read, not injection.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const stored = localStorage.getItem("brewlite-cart");
            return stored
              ? (JSON.parse(stored).state.items.length as number)
              : -1;
          }),
        { message: "Confirmation PAID cần nối useClearPaidCart của #57" },
      )
      .toBe(0);
    const history = await request.get(E2E.api + "/orders/me", { headers });
    expect(history.ok()).toBe(true);
    const rows = (await history.json()) as { id: string }[];
    expect(rows.map((row) => row.id)).toEqual([created.orderId]);
    await page.goto("/cart");
    await expect(
      page.getByText("Giỏ hàng trống", { exact: true }),
    ).toBeVisible();
  });
  expect(jsErrors).toEqual([]);
});
