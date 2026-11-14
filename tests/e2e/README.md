# E2E trình duyệt thật — Issue #40

**Trạng thái:** chuẩn bị trên nhánh `feature/task-5-2-e2e`, từ main `7ea8b1d`.
Tại mốc 14/11/2026, #53 đã merge; #57 (checkout) và #56 (admin) chưa merge.
Chưa nghiệm thu E2E-T01 và chưa có kết quả browser chạy trên stack Docker E2E.

## Phạm vi và nguồn

- Chuyển cách tổ chức cấu hình, desktop/mobile, tạo tài khoản riêng, đăng nhập,
  mở ngân hàng và phiên nhân viên từ A1 `Bai_Tap_Lon_CNPM@92a43f4`:
  `frontend/playwright.config.ts`, `frontend/tests/orders.spec.ts`, `staff.ts`.
- File mới nằm ở `apps/web/tests/e2e/`, cấu hình `apps/web/playwright.config.ts`.
  Không chép các response giả, SQL fixture hoặc helper tạo đơn trực tiếp của A1
  vào luồng E2E-T01; không nhập lịch sử Git A1.
- **E2E-T01 @full:** menu → chọn 2 ly p1 size M + Kem béo → giỏ → khách chưa
  đăng nhập bấm Đặt hàng → đăng nhập về giỏ → áp THU5K → tạo đơn bằng nút UI
  (Idempotency-Key) → trang chọn Ví của Bách → QR → ngân hàng công khai, bấm
  chuyển tiền → kiểm tra đơn vẫn PENDING → nhân viên xác nhận → tự chuyển tới
  confirmation PAID → tiền/voucher/điểm/lịch sử đúng → giỏ đã thanh toán được xóa.
- **E2E-T02 @prepare:** phần menu/tùy chọn/giỏ, giữ giỏ sau reload/đăng nhập và
  voucher. Mở form login trực tiếp do main chưa có nút checkout; không tạo đơn,
  không chuyển tiền. Kết quả này không thay thế E2E-T01.
- **WEB-T110:** unit test kiểm tra từ chối stack dùng DB/volume/cổng khác.
- Đọc API thật để kiểm chứng kết quả và tạo tài khoản CUSTOMER mới là fixture.
  Đơn hàng và thanh toán của E2E-T01 phải được tạo qua UI. Không inject JWT/giỏ,
  không mock response, không skip/fixme bước đang thiếu để báo toàn luồng xanh.

## Chuẩn bị công cụ

Node **24**, Docker Desktop/Engine, Docker Compose **2.24.4 trở lên**.
Playwright Test **1.64.1** được khóa trong `apps/web/package-lock.json`.

Ở thư mục gốc repo:

```powershell
npm --prefix apps/web ci
```

Windows mặc định dùng Edge đã cài trên máy, không cần tải browser khác.
Trên Linux hoặc máy chưa có browser phù hợp, chạy trong `apps/web`:

```bash
npx playwright install --with-deps chromium
```

## Stack Docker riêng, dùng Compose của nhóm

Chạy ở **gốc `brewlite-a2`**, luôn dùng đúng cả hai file và đúng project name:

```powershell
docker compose --env-file .env.example -p brewlite-a2-e2e -f docker-compose.yml -f tests/e2e/compose.e2e.yml config --quiet
docker compose --env-file .env.example -p brewlite-a2-e2e -f docker-compose.yml -f tests/e2e/compose.e2e.yml up --build --detach --wait
```

- Giữ Dockerfile, ba service, migration/seed và healthcheck của Lương; override
  riêng cho test, không sửa `docker-compose.yml` hoặc Dockerfile sản phẩm.
- Web `http://127.0.0.1:3200`, API `http://127.0.0.1:3201`, DB `127.0.0.1:35432`.
  Tên container do Compose project `brewlite-a2-e2e` tạo, không chiếm các tên/cổng
  `brewlite-*`/3000/3001/5432 của đồ án đang chạy.
- DB `brewlite_e2e_test` dùng tmpfs 192 MB, không mount `pgdata` hay thư mục host.
  Các credential trong override chỉ dành cho môi trường test này.
- Mỗi lần test dùng email CUSTOMER ngẫu nhiên; để lặp trên database seed mới,
  dừng stack theo lệnh bên dưới rồi khởi động lại. Không dọn DB đồ án.
- Cần đủ dung lượng và RAM để build hai image mới. Ở bản chuẩn bị này đã kiểm tra
  cấu hình Compose; chưa build stack mới hoặc chạy browser trên stack này.

## Chạy và xem kết quả

Chỉ thu thập danh sách test (không mở browser, không chứng minh test đã qua):

```powershell
npm --prefix apps/web run test:e2e -- --list
npm --prefix apps/web run test:e2e:prepare -- --list
```

Chạy phần chuẩn bị đã có trên main, **sau khi stack test riêng đã healthy**:

```powershell
npm --prefix apps/web run test:e2e:prepare
```

Sau khi #57 và #56 đã merge: ghép main mới vào nhánh test, kiểm tra lại selector
theo giao diện checkout đã review, build lại stack rồi chạy toàn bộ:

```powershell
npm --prefix apps/web run test:e2e
```

Mặc định chạy desktop 1280×900 và mobile iPhone 13/Chromium, một worker,
không retry tự động. Thêm `-- --project=desktop --headed` để xem browser trực tiếp.
Giữ trace/screenshot khi lỗi; các ảnh mốc được đính kèm vào báo cáo HTML.
Kết quả ở `test-results/e2e/` và `playwright-report/`, đã ignore, không commit
artifact hoặc credential/tài khoản test. Trong `apps/web`, xem bằng:

```powershell
npx playwright show-report ../../playwright-report
```

Global setup kiểm tra nhãn project/service, health, cổng, database và tmpfs trước
khi đăng ký tài khoản hay đặt đơn. Nếu chỉ có stack đồ án hiện tại thì lệnh dừng
với lỗi rõ ràng. Chạy toàn luồng còn kiểm tra route checkout #57/admin #56;
không có route thì báo thiếu phụ thuộc, không bỏ qua test.

### Chế độ nhân viên gọi API tạm thời

Theo bàn giao của nhóm trưởng, sau khi #57 vào main mà #56 chưa vào, có thể kiểm
tra phần khách với API xác nhận thật #34. Chế độ này được ghi rõ bằng annotation
`staff-confirmation: api` trong report; không chứng minh thao tác UI admin:

```powershell
$env:E2E_STAFF_MODE='api'
npm --prefix apps/web run test:e2e
Remove-Item Env:\E2E_STAFF_MODE
```

Mặc định là `ui`: đăng nhập ADMIN qua form trong một browser context riêng,
bấm Xác nhận đã nhận tiền ở `/admin/payments?orderId=...`.

## Dừng stack test

Ở gốc repo:

```powershell
docker compose --env-file .env.example -p brewlite-a2-e2e -f docker-compose.yml -f tests/e2e/compose.e2e.yml down
```

Database test tmpfs mất khi dừng; giữ image để chạy lại. Lệnh này không dừng
container hoặc xóa dữ liệu của stack đồ án khác. Không dùng lệnh `down -v`
trên project đồ án để chuẩn bị E2E.

## Điều kiện hoàn thành còn chờ

- [x] Cấu hình/fixtures/selector bám API và UI A2 đã có; hai project browser.
- [x] Viết E2E-T01/T02 và unit test chặn dùng sai stack.
- [x] Compose config: ba service riêng, không cổng/volume dự án.
- [ ] Checkout #57 đã ghép, rà lại selector/hook xóa giỏ trên bản đã review.
- [ ] Admin #56 đã ghép để E2E-T01 chạy mặc định bằng UI nhân viên.
- [ ] Build stack mới, chạy E2E-T01/T02 thật qua cả desktop/mobile, lưu kết quả.
- [ ] Thêm CI E2E riêng khi luồng đủ; chưa đổi CI hiện tại để tránh báo xanh giả.
- [ ] Người dùng cho phép push; review Hiếu, CI xanh, merge commit; không tự merge.

Tham khảo công cụ: [Playwright configuration](https://playwright.dev/docs/test-configuration),
[test.step](https://playwright.dev/docs/api/class-test#test-step),
[Docker Compose merge/reset/override](https://docs.docker.com/reference/compose-file/merge/).
