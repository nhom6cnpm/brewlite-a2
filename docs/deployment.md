# Triển khai hệ thống (Deployment & Continuous Delivery)

Tài liệu này đặc tả kiến trúc triển khai, quy trình phân phối liên tục (Continuous Delivery - CD), chiến lược gắn tag container, cơ chế migration an toàn, kiểm thử khói (smoke test) và quy trình dừng/rollback khi phát hiện sự cố cho hệ thống **BrewLite** (đáp ứng đầy đủ 7 tiêu chí của Task 5.3).

---

## 1. Nền tảng và Kiến trúc Production

**Production:** [Render](https://render.com) kết hợp Container Registry [GitHub Packages](https://ghcr.io).

| Thành phần | Render Service | URL | Ghi chú |
|---|---|---|---|
| Frontend (`brewlite-web`) | Web Service | `https://brewlite-web.onrender.com` | Next.js PWA, HTTPS tự động |
| Backend (`brewlite-api`) | Web Service | `https://brewlite-api.onrender.com` | NestJS API, HTTPS tự động |
| Database (`brewlite-db`) | Managed PostgreSQL | Private Network (`:5432`) | Persistent volume, cô lập trong VPC Render |

> ⚠️ **Lưu ý vòng đời Database miễn phí:** Theo chính sách Render Free tier, database PostgreSQL miễn phí sẽ hết hạn sau **30 ngày** (+14 ngày gia hạn trước khi bị xóa). Nhóm tạo instance gần ngày nghiệm thu Task 5, kết hợp migration/seed tự động và sao lưu `pg_dump` để có thể tái tạo database bất kỳ lúc nào chỉ trong 2 phút.

---

## 2. Sơ đồ Triển khai (Deployment Diagram)

Xem [docs/diagrams/deployment.svg](diagrams/deployment.svg) hoặc [.png](diagrams/deployment.png).

Nguồn PlantUML: [docs/diagrams/deployment.puml](diagrams/deployment.puml).

Quyết định kiến trúc chi tiết: [ADR-008: Nền tảng triển khai](architecture/adr/008-nen-tang-trien-khai.md).

---

## 3. Biến môi trường và Secrets

### 3.1. Build Arguments (Bắt buộc lúc đóng gói Docker ở CI)

> ⚠️ **Lưu ý quan trọng cho Web Next.js:** Các biến `NEXT_PUBLIC_*` được Next.js nhúng tĩnh vào mã nguồn JavaScript tại thời điểm **build time**. Khi build Docker image ở CI (GitHub Actions), phải truyền dưới dạng `--build-arg`. Đặt biến này trên Render lúc runtime sẽ không có tác dụng đối với bundle tĩnh của Next.js.

| Build Arg | Mô tả | Giá trị Production |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL backend gọi từ trình duyệt | `https://brewlite-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | URL frontend production | `https://brewlite-web.onrender.com` |
| `NEXT_PUBLIC_ORDER_PAYMENT_TIMEOUT_MINUTES` | Thời hạn hiển thị countdown đơn | `15` |

### 3.2. GitHub Secrets (Dành cho CI/CD Pipeline)

Lưu tại **GitHub Repository → Settings → Secrets and variables → Actions**:

| Secret Name | Mô tả | Sử dụng tại |
|---|---|---|
| `RENDER_API_DEPLOY_HOOK` | Webhook URL kích hoạt Render deploy dịch vụ `brewlite-api` | Step `deploy` trong `.github/workflows/cd.yml` |
| `RENDER_WEB_DEPLOY_HOOK` | Webhook URL kích hoạt Render deploy dịch vụ `brewlite-web` | Step `deploy` trong `.github/workflows/cd.yml` |
| `GITHUB_TOKEN` | Token do GitHub Actions tự động cấp quyền `packages: write` | Đăng nhập và push image lên `ghcr.io` |

### 3.3. Runtime Environment Variables (Lưu trên Render Secrets)

Toàn bộ secret chạy thực tế được cấu hình an toàn trên Render Dashboard (**không commit file `.env` vào repository**):

#### Backend (`brewlite-api`)
| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `DATABASE_URL` | Render Internal PostgreSQL URL (`postgres://...:5432/...`) | ✅ |
| `JWT_SECRET` | Secret để ký và xác thực JWT token | ✅ |
| `JWT_EXPIRES_IN` | Thời hạn token (ví dụ `1d`) | ✅ |
| `FRONTEND_URL` | `https://brewlite-web.onrender.com` (CORS whitelist) | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `PORT` | `3001` (hoặc do Render gán) | ✅ |
| `ADMIN_EMAIL` | Email tài khoản quản trị viên seed | ✅ |
| `ADMIN_PASSWORD` | Mật khẩu tài khoản quản trị viên seed | ✅ |
| `ORDER_PAYMENT_TIMEOUT_MINUTES` | Thời hạn giữ nguyên liệu/đơn hàng (phút) | ⬜ |

#### Frontend (`brewlite-web`)
| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `PORT` | `3000` | ✅ |
| `API_INTERNAL_URL` | `https://brewlite-api.onrender.com` (URL gọi API từ server-side Next.js) | ✅ |
| `NODE_ENV` | `production` | ✅ |

> ℹ️ **Lưu ý mạng nội bộ Render:** Do gói Web Service miễn phí trên Render không hỗ trợ nhận traffic mạng nội bộ ("Free web services can't receive private network traffic"), `API_INTERNAL_URL` được trỏ đến URL HTTPS công khai `https://brewlite-api.onrender.com`.

---

## 4. Pipeline Continuous Delivery (Task 5.3)

Quy trình CD được thiết lập tự động hóa hoàn toàn thông qua file workflow [.github/workflows/cd.yml](../.github/workflows/cd.yml).

### 4.1. Chuỗi thực thi (7 điểm cốt lõi)

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
│    • Push ghcr.io/nhom6cnpm/brewlite-api/web │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 4 & 5. Deploy Render & Migration an toàn     │
│    • Kích hoạt Render Deploy Hooks bằng curl │
│    • API (1 replica) tự migrate lúc khởi động│
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ 6 & 7. Production Smoke Test & Rollback Gate │
│    • Kiểm tra GET /health, /products, Web UI │
│    • Lỗi → Dừng pipeline đỏ + Hướng dẫn roll │
└──────────────────────────────────────────────┘
```

### 4.2. Chiến lược gắn thẻ Container Image (Tagging Strategy)

Mỗi lần build trên CI, image được tạo từ Dockerfile đa tầng (multi-stage build trên nền tảng **Node 24 Alpine** `node:24-alpine`) và đẩy lên GitHub Container Registry (`ghcr.io/nhom6cnpm/...`) với các tag định danh:

1. **Commit SHA:**
   - Tag short SHA: `sha-xxxxxxx` (ví dụ `sha-3ce74b4`) — đảm bảo mỗi bản dựng gắn chặt với đúng commit nguồn.
   - Tag full SHA: `sha-<full_40_chars_sha>` phục vụ đối soát tự động.
2. **Semantic Versioning (SemVer):**
   - Khi gắn Git tag dạng `vX.Y.Z` (ví dụ `v1.0.0`), CI tự động sinh các tag: `v1.0.0`, `1.0.0`, `1.0`.
3. **Latest Tag:**
   - Tag `latest` được gán cho bản build mới nhất của nhánh chính `main`.

### 4.3. Cơ chế Migration an toàn

- **Đơn bản thể (Single Instance / 1 Replica):** Trên môi trường Render Production, `brewlite-api` chạy với cấu hình 1 replica.
- **Tự động chạy khi khởi động (`migrationsRun: true`):** Cấu hình TypeORM trong `AppModule` tự động quét các file migration trong `dist/migrations/*.js`.
- **An toàn giao dịch:** Mỗi migration được TypeORM bọc trong một Database Transaction độc lập. Nếu xảy ra lỗi cú pháp hoặc ràng buộc dữ liệu, migration sẽ tự rollback toàn bộ và API ngừng khởi động, ngăn chặn tình trạng dữ liệu dở dang hoặc bảng hỏng.
- **Thứ tự độc lập:** Container API chỉ mở cổng lắng nghe HTTP và báo `status: "ok"` tại `/health` sau khi toàn bộ migration đã áp dụng thành công.

---

## 5. Kiểm thử khói sau triển khai (Smoke Test)

Smoke test được thực thi tự động qua script [scripts/smoke-test.mjs](../scripts/smoke-test.mjs) trong job `smoke-test` của pipeline CD:

| Kiểm tra | Mục tiêu | Tiêu chí chấp nhận |
|---|---|---|
| `GET /health` | Kiểm tra API sống & kết nối PostgreSQL | HTTP 200, JSON trả về `{ "status": "ok" }` |
| `GET /products` | Kiểm tra database có dữ liệu và ORM hoạt động | HTTP 200, mảng JSON không rỗng (`length > 0`) |
| `GET /` | Kiểm tra frontend Next.js phục vụ giao diện | HTTP 200, nội dung HTML hợp lệ |

- **Xử lý Cold-Start / Pull Image:** Script áp dụng cơ chế retry thông minh với 18 lần thử (mỗi lần cách nhau 10 giây, tối đa 3 phút) để chờ Render hoàn tất quá trình pull Docker image từ `ghcr.io` và khởi động container.
- **Khóa an toàn:** Nếu sau 18 lần thử hệ thống vẫn không phản hồi đúng, script trả về exit code `1`, lập tức **đánh dấu pipeline chuyển sang màu ĐỎ (Failed)** và in bản tin hướng dẫn rollback ra console.

---

## 6. Quy trình Dừng Pipeline và Rollback

Khi chặng deploy hoặc smoke test thất bại, pipeline CD tự động dừng và không cho phép phiên bản lỗi được tiếp tục vận hành. Kỹ sư thực hiện rollback theo 1 trong 2 phương án sau:

### Phương án 1: Rollback tức thời qua Render Dashboard (Khuyến nghị, < 1 phút)

1. Truy cập [Render Dashboard](https://dashboard.render.com).
2. Chọn Web Service bị ảnh hưởng (`brewlite-api` hoặc `brewlite-web`).
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

## 7. Kế hoạch Quản lý Database Render (Hạn mức 30 ngày)

Để đảm bảo hệ thống luôn sẵn sàng phục vụ việc chấm điểm mà không bị ảnh hưởng bởi chính sách xóa database miễn phí sau 30 ngày của Render:

1. **Khởi tạo muộn nhất có thể:** Chỉ tạo instance PostgreSQL trên Render trước mốc nghiệm thu Sprint 2 / Task 5 từ 3–5 ngày.
2. **Kịch bản phục hồi thảm họa trong 2 phút:**
   - Toàn bộ bảng dữ liệu, khóa ngoại, chỉ mục đều được quản lý 100% bằng code TypeORM Migration trong `apps/api/src/migrations/`.
   - Dữ liệu mẫu ban đầu được seed tự động qua migration và `npm run seed`.
   - Khi database hết hạn hoặc bị xóa: Chỉ cần tạo database mới trên Render → copy `Internal Database URL` vào biến `DATABASE_URL` của `brewlite-api` → API khởi động sẽ tự động dựng lại toàn bộ cấu trúc và nạp dữ liệu mẫu hoàn chỉnh.
