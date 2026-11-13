# Tài liệu Triển khai Hệ thống (Deployment Guide)

> **Môn học:** Công nghệ Phần mềm — Trường Đại học Sài Gòn (HK I, 2026–2027)  
> **Dự án:** BrewLite A2 — Ứng dụng đặt đồ uống không dùng tiền mặt  
> **Người thực hiện:** Lương (DevOps & Deployment), Phúc (API & Verification)  
> **Liên quan:** NFR-04, Deployment-01, ADR-008, Task 3.2, Task 5.3, Task 5.4

---

## 1. Nền tảng & Kiến trúc Triển khai Production

Toàn bộ hệ thống **BrewLite A2** được triển khai trên nền tảng đám mây [Render](https://render.com) kết hợp với Container Registry [GitHub Container Registry (ghcr.io)](https://ghcr.io). Mọi dịch vụ đều được bảo vệ và phục vụ qua giao thức mã hóa **HTTPS tự động** (Let's Encrypt TLS).

| Thành phần | Dịch vụ Render | URL Production / Endpoint | Ghi chú & Bảo mật |
|---|---|---|---|
| **Frontend Web** (`brewlite-web`) | Web Service | `https://brewlite-a2-web.onrender.com` | Next.js 15 PWA, HTTPS tự động, đóng gói Docker đa tầng từ `ghcr.io`. |
| **Backend API** (`brewlite-api`) | Web Service | `https://brewlite-a2-api.onrender.com` | NestJS 11 REST API, HTTPS tự động, CORS giới hạn domain Frontend. |
| **Database** (`brewlite-db`) | Managed PostgreSQL 16 | Private Network (`:5432`) | **Access Control: Tắt Public Network**, chỉ kết nối nội bộ giữa API và DB. |
| **Health Check** | API Endpoint | `https://brewlite-a2-api.onrender.com/health` | HTTP 200 `{"status":"ok","database":"up","commit":"..."}`. |
| **Swagger API Docs** | API Interactive UI | `https://brewlite-a2-api.onrender.com/api/docs` | Swagger UI trực quan, hỗ trợ thử nghiệm API kèm Bearer JWT. |
| **OpenAPI Spec** | API Raw JSON | `https://brewlite-a2-api.onrender.com/api/docs-json` | Định nghĩa OpenAPI 3.0 chuẩn cho Postman / công cụ tự động hóa. |

> [!WARNING]
> **Vòng đời Database miễn phí trên Render (30 ngày):**  
> Theo chính sách của Render Free tier, database PostgreSQL miễn phí sẽ tự động hết hạn sau **30 ngày** (kèm 14 ngày gia hạn trước khi bị xóa hoàn toàn).  
> Nhóm tuân thủ đúng khuyến nghị của đề bài: **Khởi tạo database Render sát thời điểm nghiệm thu Task 5**. Đồng thời, hệ thống tích hợp sẵn cơ chế **TypeORM migration tự động chạy khi container API khởi động** (trong migration đã nhúng sẵn dữ liệu mẫu về danh mục, món, công thức nguyên liệu, tài khoản quản trị và voucher), kết hợp tệp sao lưu dữ liệu `pg_dump`. Do đó, nếu database bị xóa hoặc reset, hệ thống có thể **tái lập 100% cấu trúc và dữ liệu chỉ trong vòng dưới 1 phút** mà không cần thao tác thủ công.

---

## 2. Sơ đồ Triển khai (Deployment Diagram)

Hệ thống tuân thủ mô hình triển khai tách biệt giữa Presentation Layer, Application Layer và Persistence Layer:

```
[Trình duyệt Khách hàng / Quản trị viên]
       │
       │ (HTTPS / TLS 1.3)
       ├─────────────────────────────────────────┐
       ▼                                         ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│   Frontend: brewlite-a2-web     │   │     Backend: brewlite-a2-api    │
│  (Next.js PWA Container :3000)  │   │     (NestJS Container :3001)    │
│   *.onrender.com (Public HTTPS) │   │   *.onrender.com (Public HTTPS) │
└────────────────┬────────────────┘   └────────────────┬────────────────┘
                 │ (SSR / Next Server Proxy)           │
                 └─────────────────────────────────────┤ (Internal Private Network)
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │   Database: brewlite-a2-db      │
                                      │  (PostgreSQL 16 Managed :5432)  │
                                      │   [KHÔNG CÓ PUBLIC IP/NETWORK]  │
                                      └─────────────────────────────────┘
```

- Nguồn PlantUML: [docs/diagrams/deployment.puml](diagrams/deployment.puml)
- Ảnh biểu diễn: [docs/diagrams/deployment.svg](diagrams/deployment.svg) và [deployment.png](diagrams/deployment.png)

---

## 3. Cấu hình Quyền truy cập Container Registry (ghcr.io)

Mặc định khi GitHub Actions đóng gói và push container image lên GitHub Container Registry (`ghcr.io`), gói có thể ở chế độ `Private`. Để Render Web Service có thể pull image về khởi chạy mà không gặp lỗi xác thực `unauthorized: authentication required`, thực hiện một trong hai cách:

### Cách 1: Thiết lập Package sang chế độ Public (Khuyên dùng)
1. Truy cập trang GitHub của tổ chức: `https://github.com/orgs/nhom6cnpm/packages` (hoặc profile người sở hữu repo).
2. Chọn từng package: `brewlite-api` và `brewlite-web`.
3. Nhấp vào **Package settings** ở thanh bên phải.
4. Cuộn xuống phần **Danger Zone** $\rightarrow$ nhấp **Change visibility** $\rightarrow$ chọn **Public** $\rightarrow$ nhập tên package xác nhận.

### Cách 2: Cấu hình Registry Credentials trong Render
Nếu muốn giữ image private:
1. Tạo một GitHub Personal Access Token (classic) có quyền `read:packages`.
2. Trên Render Dashboard, vào **Account Settings** $\rightarrow$ **Registry Credentials** $\rightarrow$ **Add Credential**.
3. Điền:
   - **Registry:** `ghcr.io`
   - **Username:** Tên tài khoản GitHub của bạn.
   - **Token / Password:** Personal Access Token vừa tạo.
4. Gán credential này vào Web Service `brewlite-a2-api` và `brewlite-a2-web`.

---

## 4. Quản lý Biến Môi trường & Bí mật (Secrets)

> [!IMPORTANT]
> **Nguyên tắc an toàn bí mật:**
> - Tuyệt đối **không commit** bất kỳ file chứa secret (`.env`, `.env.local`, `.env.production`) vào repository git. Đã có bộ lọc chặn toàn diện trong `.gitignore`.
> - Bí mật môi trường chỉ được lưu trữ tập trung tại hai nơi an toàn:
>   1. **Render Environment Variables:** Cho runtime của các container production.
>   2. **GitHub Actions Secrets:** Cho pipeline CI/CD đóng gói và triển khai.
> - Trên GitHub Actions, các secret được tự động che giấu (masked) dạng `***` trên log console để đảm bảo không bị lộ thông tin nhạy cảm.

### 4.1. Build Arguments (Bắt buộc lúc đóng gói Docker ở CI)

Các biến client-side `NEXT_PUBLIC_*` trong Next.js được trình biên dịch nạp tĩnh vào mã nguồn JavaScript bundle ngay tại thời điểm **build-time**. Nếu chỉ đặt trên Render lúc runtime, trình duyệt của người dùng sẽ không nhận được giá trị này. Do đó, quy trình CD tại GitHub Actions truyền các biến này qua cờ `--build-arg`:

| Build Argument | Mô tả | Giá trị Production |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL backend gọi từ trình duyệt của người dùng | `https://brewlite-a2-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | URL frontend production của ứng dụng Web | `https://brewlite-a2-web.onrender.com` |
| `NEXT_PUBLIC_ORDER_PAYMENT_TIMEOUT_MINUTES` | Thời hạn đếm ngược chờ thanh toán đơn hàng (phút) | `15` |

### 4.2. Runtime Environment Variables trên Render

#### Dịch vụ Backend API (`brewlite-a2-api`)

| Biến môi trường | Bắt buộc | Mô tả & Giá trị mẫu |
|---|---|---|
| `DATABASE_URL` | ✅ | **Render Internal PostgreSQL URL** (ví dụ `postgres://brewlite:...@dpg-xxx-a:5432/brewlite_a2`). Kết nối trực tiếp qua mạng nội bộ bảo mật của Render. |
| `JWT_SECRET` | ✅ | Khóa bí mật dùng để ký và giải mã JWT token (chuỗi ngẫu nhiên có độ dài $\ge$ 32 ký tự bảo mật cao). |
| `JWT_EXPIRES_IN` | ✅ | Thời hạn hiệu lực của token (mặc định: `1d`). |
| `FRONTEND_URL` | ✅ | URL Frontend Production (`https://brewlite-a2-web.onrender.com`) để cấu hình CORS chặt chẽ, chặn các nguồn truy cập trái phép. |
| `NODE_ENV` | ✅ | `production` (tối ưu hiệu năng NestJS, tắt source-map nhạy cảm). |
| `PORT` | ✅ | `3001` (Render tự động định tuyến traffic HTTPS bên ngoài vào cổng nội bộ này). |
| `ADMIN_EMAIL` | ✅ | Email tài khoản quản trị viên mặc định (`admin@brewlite.vn`). |
| `ADMIN_PASSWORD` | ✅ | Mật khẩu tài khoản quản trị viên (được tự động băm an toàn bằng bcrypt khi nạp seed). |
| `ORDER_PAYMENT_TIMEOUT_MINUTES` | ⬜ | `15` (Thời gian hết hạn phiên thanh toán). |
| `GIT_SHA` | ⬜ | Commit SHA của container đang chạy (được CI tự động nhúng qua `--build-arg` để endpoint `/health` trả về, phục vụ verify bản deploy). |

#### Dịch vụ Frontend Web (`brewlite-a2-web`)

| Biến môi trường | Bắt buộc | Mô tả & Giá trị mẫu |
|---|---|---|
| `PORT` | ✅ | `3000` (Cổng lắng nghe của Node.js server Next.js). |
| `API_INTERNAL_URL` | ✅ | URL backend gọi từ Next.js Server Side / SSR (`https://brewlite-a2-api.onrender.com`). |
| `NODE_ENV` | ✅ | `production`. |

> [!NOTE]
> Do gói Render Free Web Service không nhận lưu lượng truy cập qua Private Network nội bộ ("Free web services cannot receive private network traffic"), biến `API_INTERNAL_URL` được cấu hình sử dụng chính URL HTTPS công khai `https://brewlite-a2-api.onrender.com`.

### 4.3. GitHub Actions Secrets (Cấu hình trên GitHub Repository)

Được cấu hình tại: *GitHub Repo $\rightarrow$ Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions*:

| Tên Secret | Mục đích sử dụng |
|---|---|
| `RENDER_API_DEPLOY_HOOK` | URL Webhook của Render để kích hoạt triển khai dịch vụ API (`https://api.render.com/deploy/srv-xxxxxx?key=yyyyyy`). |
| `RENDER_WEB_DEPLOY_HOOK` | URL Webhook của Render để kích hoạt triển khai dịch vụ Web (`https://api.render.com/deploy/srv-zzzzzz?key=wwwwww`). |

---

## 5. Quy trình Triển khai (Deployment Workflow)

### 5.1. Triển khai Tự động qua CD Pipeline (Khuyên dùng)

Pipeline Continuous Delivery ([.github/workflows/cd.yml](../.github/workflows/cd.yml)) hoạt động hoàn toàn tự động theo mô hình GitOps mỗi khi mã nguồn được merge vào nhánh `main` hoặc khi gắn tag phiên bản `v*`:

```mermaid
flowchart TD
    A["Push / Merge vào main hoặc tạo tag v*"] --> B["Quality Gate (Lint, Test, Build API & Web)"]
    B --> C["Build Docker Images (Node 24 Alpine Multi-stage)"]
    C --> D["Push Images lên GitHub Container Registry (ghcr.io)"]
    D --> E["Gọi Render Deploy Hooks kèm &imgURL=<tag>"]
    E --> F["Render kéo Image & Khởi động Container mới"]
    F --> G["API tự động chạy TypeORM Migration & Seed (1 Replica)"]
    G --> H["Smoke Test: kiểm tra /health, /products, Web UI"]
    H -->|Thành công| I["Hoàn tất Triển khai (Pipeline Xanh)"]
    H -->|Thất bại| J["Báo đỏ Pipeline & In Hướng dẫn Rollback"]
```

1. **Quality Gate:** Kiểm tra toàn bộ mã nguồn trước khi đóng gói:
   - `apps/api`: Oxlint $\rightarrow$ Jest Unit Test $\rightarrow$ NestJS Build.
   - `apps/web`: ESLint $\rightarrow$ Vitest Unit Test $\rightarrow$ Next.js Build.
2. **Multi-stage Image Build:**
   - Sử dụng base image `node:24-alpine` tối ưu dung lượng (khoảng 150MB).
   - Gắn tag theo commit SHA ngắn (`sha-<short_sha>`), SHA dài (`sha-<long_sha>`), `latest`, và semver (`vX.Y.Z`).
3. **Triển khai qua Deploy Hook có xác thực phiên bản:**
   - Workflow gọi Render Deploy Hook kèm tham số hình ảnh chính xác của commit vừa tạo:
     ```bash
     curl -fsS -X POST "${RENDER_API_DEPLOY_HOOK}&imgURL=ghcr.io/nhom6cnpm/brewlite-api:sha-${SHORT_SHA}"
     ```
   - Cơ chế này đảm bảo Render triển khai đúng container của commit mới nhất, loại bỏ hoàn toàn khả năng chạy lệch phiên bản cũ.
4. **Migration tự động an toàn (Zero-friction Schema Updates):**
   - API chạy với cấu hình 1 bản thể (single replica). Khi container API khởi động, TypeORM sẽ tự động duyệt và thực thi toàn bộ các file migration trong một Database Transaction duy nhất trước khi mở cổng HTTP đón nhận traffic.
   - Dữ liệu mẫu (Seed) được tích hợp trực tiếp trong các migration khởi tạo (`InitialProducts`, `AddInventory`, `SeedSampleVouchers`, `AdminSeedService`). Toàn bộ bảng và dữ liệu mẫu được nạp tự động, **không cần chạy lệnh `npm run seed` riêng biệt**.
5. **Kiểm thử khói tự động sau triển khai (Smoke Test):**
   - Script [scripts/smoke-test.mjs](../scripts/smoke-test.mjs) tự động thực thi sau khi gọi webhook:
     - Thử lại liên tục (retry backoff) gọi `GET /health` cho tới khi trường `commit` trả về trùng khớp với `EXPECTED_COMMIT` (chống false-green khi container cũ vẫn còn đang phục vụ).
     - Kiểm tra `GET /products` đảm bảo danh sách món theo chuẩn A2 với ID dạng chuỗi (`p1`..`p6` hoặc slug).
     - Kiểm tra trang chủ Web trả về mã trạng thái HTTP 200 và tài liệu HTML hợp lệ.
   - Nếu Smoke Test thất bại sau thời gian chờ tối đa, pipeline sẽ thoát với mã lỗi `exit 1` và in hướng dẫn khắc phục.

### 5.2. Triển khai Thủ công (Manual Trigger)

Khi cần kích hoạt triển khai khẩn cấp hoặc triển khai lại mà không cần commit code:
- **Cách 1 (GitHub Actions UI):** Vào tab **Actions** $\rightarrow$ chọn workflow **Continuous Delivery** $\rightarrow$ nhấn **Run workflow** $\rightarrow$ chọn nhánh `main`.
- **Cách 2 (Render Dashboard):** Đăng nhập [dashboard.render.com](https://dashboard.render.com) $\rightarrow$ chọn service `brewlite-a2-api` hoặc `brewlite-a2-web` $\rightarrow$ nhấn **Manual Deploy** $\rightarrow$ **Deploy latest commit** (hoặc *Clear build cache & deploy*).

---

## 6. Quy trình Phục hồi & Quay lui (Rollback Plan)

Khi một phiên bản mới gặp sự cố nghiêm trọng trên production (lỗi logic nghiệp vụ, rò rỉ dữ liệu, hoặc crash không phục hồi), áp dụng một trong hai chiến lược rollback sau:

### Chiến lược 1: Quay lui tức thì qua Render Dashboard (Khuyên dùng — Thời gian $\le$ 30 giây)

1. Truy cập [Render Dashboard](https://dashboard.render.com).
2. Nhấp vào Web Service gặp sự cố (`brewlite-a2-api` hoặc `brewlite-a2-web`).
3. Chuyển sang thẻ **Events** ở thanh menu bên trái.
4. Tìm bản triển khai ổn định gần nhất trước đó (có nhãn màu xanh lá **Deploy live** trong quá khứ).
5. Nhấp vào biểu tượng ba chấm $(\dots)$ ở góc phải của bản ghi đó $\rightarrow$ chọn **Rollback to this deploy**.
6. Render sẽ lập tức chuyển hướng lưu lượng truy cập sang container của bản ghi đã chọn mà không cần build lại.

### Chiến lược 2: Kích hoạt Deploy Hook tới Image Tag trước đó (CLI / Pipeline)

Do toàn bộ image trong lịch sử đều được lưu trữ vĩnh viễn trên GitHub Container Registry theo commit SHA (`sha-<commit>`), bạn có thể kích hoạt Render kéo lại image cũ bất kỳ lúc nào bằng lệnh `curl`:

```bash
# Rollback Backend API về commit abc1234
curl -fsS -X POST "${RENDER_API_DEPLOY_HOOK}&imgURL=ghcr.io/nhom6cnpm/brewlite-api:sha-abc1234"

# Rollback Frontend Web về commit abc1234
curl -fsS -X POST "${RENDER_WEB_DEPLOY_HOOK}&imgURL=ghcr.io/nhom6cnpm/brewlite-web:sha-abc1234"
```

### An toàn Cơ sở dữ liệu khi Rollback (Database Safety)
- Các migration của BrewLite được thiết kế theo nguyên tắc *Backward-compatible*: chỉ thêm bảng mới hoặc thêm cột cho phép `NULL` / có giá trị `DEFAULT`.
- Nếu xảy ra lỗi cú pháp hoặc vi phạm ràng buộc trong lúc migration đang chạy, cơ chế Transaction của TypeORM sẽ tự động rollback toàn bộ các câu lệnh SQL về trạng thái nguyên vẹn ban đầu, ngăn ngừa tình trạng hỏng dữ liệu dở dang.

---

## 7. Kiểm tra & Nghiệm thu Hệ thống Production

### 7.1. Kiểm tra Trực tiếp qua Trình duyệt & API Endpoint

| Dịch vụ | Đường dẫn kiểm tra | Kết quả mong đợi |
|---|---|---|
| **API Healthcheck** | `https://brewlite-a2-api.onrender.com/health` | HTTP 200, JSON: `{"status":"ok","database":"up","commit":"..."}` |
| **API Danh mục món** | `https://brewlite-a2-api.onrender.com/products` | HTTP 200, danh sách mảng JSON 8 sản phẩm chuẩn A2 |
| **Swagger UI** | `https://brewlite-a2-api.onrender.com/api/docs` | Giao diện tương tác Swagger UI hiển thị đầy đủ tài liệu API |
| **OpenAPI Spec** | `https://brewlite-a2-api.onrender.com/api/docs-json` | Tệp JSON đặc tả OpenAPI 3.0 hoàn chỉnh |
| **Giao diện Web** | `https://brewlite-a2-web.onrender.com` | Trang chủ BrewLite hiển thị menu thức uống, PWA header, giỏ hàng |

### 7.2. Hướng dẫn Thử nghiệm API trên Swagger Production

1. Truy cập trang Swagger UI tại: [https://brewlite-a2-api.onrender.com/api/docs](https://brewlite-a2-api.onrender.com/api/docs)
2. **Đăng nhập lấy Token:**
   - Mở nhóm API **Auth** $\rightarrow$ chọn `POST /auth/login`.
   - Bấm **Try it out**, điền thông tin đăng nhập:
     ```json
     {
       "email": "customer@brewlite.vn",
       "password": "Password123!"
     }
     ```
     *(Hoặc tài khoản admin: `admin@brewlite.vn` / mật khẩu quản trị).*
   - Bấm **Execute**, copy chuỗi `access_token` trong phản hồi.
3. **Ủy quyền (Authorize):**
   - Cuộn lên đầu trang Swagger, bấm nút **Authorize** (biểu tượng ổ khóa màu xanh).
   - Nhập chuỗi token vừa copy vào ô **Value** $\rightarrow$ bấm **Authorize** $\rightarrow$ **Close**.
4. **Thực thi các API yêu cầu xác thực:**
   - Bây giờ bạn có thể thử nghiệm trực tiếp các API bảo mật như `GET /auth/me`, `POST /orders`, `GET /vouchers`, `GET /admin/orders`... ngay trên trình duyệt mà không bị lỗi `401 Unauthorized`.

---

## 8. Bàn giao & Vận hành

- **Mã nguồn Repository:** `https://github.com/nhom6cnpm/brewlite-a2`
- **Tài liệu Kiến trúc & ADR:** Thư mục [docs/architecture/](architecture/) và [docs/traceability-matrix.md](traceability-matrix.md).
- **Kiểm thử Tự động:**
  - Unit tests: `npm test` trong từng thư mục `apps/api` và `apps/web`.
  - Integration tests: `npm run test:integration` trong `apps/api` (kết nối PostgreSQL thật).
  - Smoke tests: `node --test tests/smoke-test.test.mjs`.
