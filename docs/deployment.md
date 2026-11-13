# Triển khai hệ thống (Deployment & Continuous Delivery)

Tài liệu này đặc tả kiến trúc triển khai, quy trình phân phối liên tục (Continuous Delivery - CD), chiến lược gắn tag container, cơ chế migration an toàn, kiểm thử khói (smoke test) và quy trình dừng/rollback khi phát hiện sự cố cho hệ thống **BrewLite A2** (đáp ứng đầy đủ 7 tiêu chí của Task 5.3).

---

## 1. Nền tảng và Kiến trúc Production

**Production:** [Render](https://render.com) kết hợp Container Registry [GitHub Packages](https://ghcr.io).

| Thành phần | Render Service | URL Production | Ghi chú |
|---|---|---|---|
| Frontend (`brewlite-a2-web`) | Web Service | `https://brewlite-a2-web.onrender.com` | Next.js PWA, HTTPS tự động |
| Backend (`brewlite-a2-api`) | Web Service | `https://brewlite-a2-api.onrender.com` | NestJS API, HTTPS tự động |
| Database (`brewlite-a2-db`) | Managed PostgreSQL | Private Network (`:5432`) | Persistent volume, cô lập trong VPC Render |

> ⚠️ **Lưu ý vòng đời Database miễn phí:** Theo chính sách Render Free tier, database PostgreSQL miễn phí sẽ hết hạn sau **30 ngày** (+14 ngày gia hạn trước khi bị xóa). Nhóm tạo instance gần ngày nghiệm thu Task 5, kết hợp migration tự động (chứa sẵn seed) và sao lưu `pg_dump` để có thể tái tạo database bất kỳ lúc nào chỉ trong 2 phút.

---

## 2. Sơ đồ Triển khai (Deployment Diagram)

Xem [docs/diagrams/deployment.svg](diagrams/deployment.svg) hoặc [.png](diagrams/deployment.png).

Nguồn PlantUML: [docs/diagrams/deployment.puml](diagrams/deployment.puml).

Quyết định kiến trúc chi tiết: [ADR-008: Nền tảng triển khai](architecture/adr/008-nen-tang-trien-khai.md).

---

## 3. Cấu hình Quyền Container Registry (`ghcr.io`) trên Render

Mặc định khi GitHub Actions đẩy container image lên GitHub Packages (`ghcr.io`), package sẽ được gán quyền **Private** trong tổ chức `nhom6cnpm`. Để Render có thể pull image về triển khai, nhóm thực hiện theo một trong hai cách sau:

### Cách 1: Chuyển Package sang chế độ Public (Khuyến nghị cho bài tập lớn)
1. Đăng nhập GitHub với tài khoản quản trị tổ chức `nhom6cnpm`.
2. Truy cập tab **Packages** của tổ chức:
   - `ghcr.io/nhom6cnpm/brewlite-api`
   - `ghcr.io/nhom6cnpm/brewlite-web`
3. Chọn từng package → **Package settings**.
4. Cuộn xuống phần **Danger Zone** → Nhấp **Change visibility** → Chọn **Public** → Nhập tên package để xác nhận.
5. Sau khi chuyển sang Public, Render có thể pull image tự do mà không cần cấu hình token.

### Cách 2: Cấu hình Registry Credential trên Render Dashboard
1. Tạo một GitHub Personal Access Token (classic) hoặc fine-grained token có quyền `read:packages`.
2. Trên Render Dashboard → Chọn **Account Settings** (hoặc **Workspace Settings**) → Điều hướng đến mục **Registry Credentials**.
3. Nhấp **Add Credential**:
   - **Registry:** `ghcr.io`
   - **Username:** Tên tài khoản GitHub của bạn.
   - **Password / Token:** Dán Personal Access Token vừa tạo.
4. Gán credential này cho các Web Service `brewlite-a2-api` và `brewlite-a2-web`.

---

## 4. Biến môi trường và Secrets

### 4.1. Build Arguments (Bắt buộc lúc đóng gói Docker ở CI)

> ⚠️ **Lưu ý quan trọng cho Web Next.js:** Các biến `NEXT_PUBLIC_*` được Next.js nhúng tĩnh vào mã nguồn JavaScript tại thời điểm **build time**. Khi build Docker image ở CI (GitHub Actions), phải truyền dưới dạng `--build-arg`. Đặt biến này trên Render lúc runtime sẽ không có tác dụng đối với bundle tĩnh của Next.js.

| Build Arg | Mô tả | Giá trị Production A2 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL backend gọi từ trình duyệt | `https://brewlite-a2-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | URL frontend production | `https://brewlite-a2-web.onrender.com` |
| `NEXT_PUBLIC_ORDER_PAYMENT_TIMEOUT_MINUTES` | Thời hạn hiển thị countdown đơn | `15` |
| `GIT_SHA` (cho API) | Commit SHA ngắn được truyền vào API image | `${{ github.sha }}` ngắn |

### 4.2. GitHub Secrets (Dành cho CI/CD Pipeline)

Lưu tại **GitHub Repository → Settings → Secrets and variables → Actions**:

| Secret Name | Mô tả | Bắt buộc trên `main` |
|---|---|:---:|
| `RENDER_API_DEPLOY_HOOK` | Webhook URL kích hoạt Render deploy dịch vụ `brewlite-a2-api` | ✅ (Thiếu sẽ dừng pipeline đỏ) |
| `RENDER_WEB_DEPLOY_HOOK` | Webhook URL kích hoạt Render deploy dịch vụ `brewlite-a2-web` | ✅ (Thiếu sẽ dừng pipeline đỏ) |
| `GITHUB_TOKEN` | Token do GitHub Actions tự động cấp quyền `packages: write` | ✅ (Tự động) |

### 4.3. Runtime Environment Variables (Lưu trên Render Secrets)

Toàn bộ secret chạy thực tế được cấu hình an toàn trên Render Dashboard (**không commit file `.env` vào repository**):

#### Backend (`brewlite-a2-api`)
| Biến | Mô tả | Bắt buộc |
|---|---|:---:|
| `DATABASE_URL` | Render Internal PostgreSQL URL (`postgres://...:5432/...`) | ✅ |
| `JWT_SECRET` | Secret để ký và xác thực JWT token | ✅ |
| `JWT_EXPIRES_IN` | Thời hạn token (ví dụ `1d`) | ✅ |
| `FRONTEND_URL` | `https://brewlite-a2-web.onrender.com` (CORS whitelist) | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `PORT` | `3001` (hoặc do Render gán) | ✅ |
| `ADMIN_EMAIL` | Email tài khoản quản trị viên seed | ✅ |
| `ADMIN_PASSWORD` | Mật khẩu tài khoản quản trị viên seed | ✅ |
| `ORDER_PAYMENT_TIMEOUT_MINUTES` | Thời hạn giữ nguyên liệu/đơn hàng (phút) | ⬜ |

#### Frontend (`brewlite-a2-web`)
| Biến | Mô tả | Bắt buộc |
|---|---|:---:|
| `PORT` | `3000` | ✅ |
| `API_INTERNAL_URL` | `https://brewlite-a2-api.onrender.com` (URL gọi API từ server-side Next.js) | ✅ |
| `NODE_ENV` | `production` | ✅ |

> ℹ️ **Lưu ý mạng nội bộ Render:** Do gói Web Service miễn phí trên Render không hỗ trợ nhận traffic mạng nội bộ ("Free web services can't receive private network traffic"), `API_INTERNAL_URL` được trỏ đến URL HTTPS công khai `https://brewlite-a2-api.onrender.com`.

---

## 5. Pipeline Continuous Delivery (Task 5.3)

Quy trình CD được thiết lập tự động hóa hoàn toàn thông qua file workflow [.github/workflows/cd.yml](../.github/workflows/cd.yml).

### 5.1. Chuỗi thực thi 7 chặng chuẩn

```
Push vào 'main' hoặc Tag 'v*'
               │
               ▼
┌──────────────────────────────────────────────┐
│ 1. Quality Gate (API & Web song song)        │
│    • npm ci → npm run lint → npm test → build│
└──────────────────────┬───────────────────────┘
                       │ (Vượt qua tất cả)
                       ▼
┌──────────────────────────────────────────────┐
│ 2 & 3. Multi-stage Docker Build (Node 24)    │
│    • Tag theo sha-<commit> và vX.Y.Z, latest │
│    • Nhúng GIT_SHA vào API image             │
│    • Push ghcr.io/nhom6cnpm/brewlite-api/web │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 4 & 5. Deploy Render & Migration an toàn     │
│    • Gọi webhook kèm param &imgURL=<imageTag>│
│    • Bắt buộc có secret (thiếu secret → exit 1)│
│    • API (1 replica) tự migrate lúc khởi động│
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 6 & 7. Production Smoke Test & Rollback Gate │
│    • Chờ Render deploy xong: kiểm tra commit │
│    • Kiểm tra GET /health, /products, Web UI │
│    • Lỗi → Dừng pipeline đỏ + Hướng dẫn roll │
└──────────────────────────────────────────────┘
```

### 5.2. Kích hoạt Deploy Hook kèm Image Tag chính xác
Để đảm bảo Render deploy đúng container image vừa build thay vì image cũ hoặc cache:
- CI gọi webhook kèm tham số truy vấn `imgURL`:
  ```bash
  curl -X POST "${RENDER_API_DEPLOY_HOOK}&imgURL=ghcr.io/nhom6cnpm/brewlite-api:sha-${SHORT_SHA}"
  curl -X POST "${RENDER_WEB_DEPLOY_HOOK}&imgURL=ghcr.io/nhom6cnpm/brewlite-web:sha-${SHORT_SHA}"
  ```

### 5.3. Chiến lược kiểm thử phiên bản vừa deploy (Tránh giả xanh)
- Khi build API Docker image, CI truyền commit SHA ngắn qua `GIT_SHA`. Endpoint `GET /health` trả về:
  ```json
  { "status": "ok", "commit": "3ce74b4" }
  ```
- Script kiểm thử khói [scripts/smoke-test.mjs](../scripts/smoke-test.mjs) nhận biến môi trường `EXPECTED_COMMIT` từ CI.
- Smoke test liên tục thăm dò endpoint `/health`. Nếu giá trị `commit` trả về chưa trùng khớp với commit vừa build, script tiếp tục chờ Render hoàn tất chu kỳ deploy container mới.
- Chỉ khi `/health` trả về đúng commit mới, kiểm tra `/products` chuẩn A2 (ID chuỗi `p1..p6`) và Web UI trả về 200, smoke test mới xác nhận thành công.

### 5.4. Cơ chế Migration an toàn
- **Đơn bản thể (Single Instance / 1 Replica):** Trên môi trường Render Production, `brewlite-a2-api` chạy với cấu hình 1 replica, loại bỏ hoàn toàn rủi ro xung đột ghi đồng thời (race condition) giữa nhiều tiến trình migration.
- **Tự động chạy khi khởi động (`migrationsRun: true`):** Cấu hình TypeORM trong `AppModule` tự động quét các file migration trong `dist/migrations/*.js`.
- **An toàn giao dịch:** Mỗi migration được TypeORM bọc trong một Database Transaction độc lập. Nếu xảy ra lỗi cú pháp hoặc ràng buộc dữ liệu, migration sẽ tự rollback toàn bộ và API ngừng khởi động, ngăn chặn tình trạng dữ liệu dở dang hoặc bảng hỏng.
- **Dữ liệu mẫu (Seed):** Dữ liệu mẫu (sản phẩm, nguyên liệu, voucher...) được nhúng trực tiếp trong các migration khởi tạo (`InitialProducts`, `AddInventory`, `SeedSampleVouchers`). Khi container API khởi động, toàn bộ cấu trúc và dữ liệu mẫu được nạp tự động mà không cần chạy lệnh thủ công riêng.

---

## 6. Kiểm thử khói sau triển khai (Smoke Test)

Smoke test được thực thi tự động qua script [scripts/smoke-test.mjs](../scripts/smoke-test.mjs) và kiểm định hợp đồng qua [tests/smoke-test.test.mjs](../tests/smoke-test.test.mjs) (`CD-T01`):

| Kiểm tra | Mục tiêu | Tiêu chí chấp nhận |
|---|---|---|
| `GET /health` | Kiểm tra API sống, kết nối PostgreSQL và đúng commit vừa deploy | HTTP 200, JSON `{ "status": "ok", "commit": "<short_sha>" }` |
| `GET /products` | Kiểm tra dữ liệu sản phẩm chuẩn A2 | HTTP 200, mảng không rỗng, ID sản phẩm dạng chuỗi (không phải số nguyên A1) |
| `GET /` | Kiểm tra frontend Next.js phục vụ giao diện | HTTP 200, nội dung HTML hợp lệ |

- **Xử lý Cold-Start / Deploy trễ:** Script áp dụng cơ chế retry thông minh với 24 lần thử (mỗi lần cách nhau 10 giây, tối đa 4 phút) để chờ Render pull Docker image từ `ghcr.io` và khởi động container.
- **Khóa an toàn:** Nếu sau 24 lần thử hệ thống vẫn không phản hồi đúng hoặc thiếu commit mới, script trả về exit code `1`, lập tức **đánh dấu pipeline chuyển sang màu ĐỎ (Failed)** và in bản tin hướng dẫn rollback ra console.

---

## 7. Quy trình Dừng Pipeline và Rollback

Khi chặng deploy hoặc smoke test thất bại, pipeline CD tự động dừng và không cho phép phiên bản lỗi được tiếp tục vận hành. Kỹ sư thực hiện rollback theo 1 trong 3 phương án sau:

### Phương án 1: Rollback tức thời qua Render Dashboard (Khuyến nghị, < 1 phút)

1. Truy cập [Render Dashboard](https://dashboard.render.com).
2. Chọn Web Service bị ảnh hưởng (`brewlite-a2-api` hoặc `brewlite-a2-web`).
3. Điều hướng tới tab **Events**.
4. Xác định bản deploy ổn định gần nhất (có nhãn màu xanh lá).
5. Nhấp vào nút **Rollback to this deploy**.
6. Render sẽ kích hoạt lại container image của phiên bản ổn định đó mà không cần rebuild.

### Phương án 2: Rollback qua Container Registry Tag & GitHub Actions

Nếu cần rollback về một commit cụ thể trong lịch sử:
1. Tra cứu commit SHA ổn định trước đó (ví dụ: `sha-3ce74b4`).
2. Trên Render Dashboard → **Settings** → Cập nhật Image URL trỏ trực tiếp vào tag ổn định:
   ```
   ghcr.io/nhom6cnpm/brewlite-api:sha-3ce74b4
   ghcr.io/nhom6cnpm/brewlite-web:sha-3ce74b4
   ```
3. Nhấp **Manual Deploy** → **Deploy latest image** để áp dụng.

### Phương án 3: Rollback cấu trúc Database (nếu migration gây lỗi)

Nếu phiên bản mới đã chạy một migration sai lệch cấu trúc dữ liệu:
1. Kết nối vào database qua Render Shell hoặc máy local có kết nối tới `DATABASE_URL`:
   ```bash
   cd apps/api
   npm run migration:revert
   ```
2. TypeORM sẽ thực thi hàm `down()` của migration gần nhất để khôi phục cấu trúc bảng về trạng thái trước đó.

---

## 8. Kế hoạch Quản lý Database Render (Hạn mức 30 ngày)

Để đảm bảo hệ thống luôn sẵn sàng phục vụ việc chấm điểm mà không bị ảnh hưởng bởi chính sách xóa database miễn phí sau 30 ngày của Render:

1. **Khởi tạo muộn nhất có thể:** Chỉ tạo instance PostgreSQL trên Render trước mốc nghiệm thu Sprint 2 / Task 5 từ 3–5 ngày.
2. **Kịch bản phục hồi thảm họa trong 2 phút:**
   - Toàn bộ bảng dữ liệu, khóa ngoại, chỉ mục và dữ liệu mẫu đều được quản lý 100% bằng code TypeORM Migration trong `apps/api/src/migrations/`.
   - Khi database hết hạn hoặc bị xóa: Chỉ cần tạo database mới trên Render → copy `Internal Database URL` vào biến `DATABASE_URL` của `brewlite-a2-api` → API khởi động sẽ tự động dựng lại toàn bộ cấu trúc và nạp dữ liệu mẫu hoàn chỉnh.
