# Deployment

## Nền tảng

**Production:** [Render](https://render.com) kết hợp Container Registry [GitHub Packages](https://ghcr.io).

| Thành phần | Render Service | URL | Ghi chú |
|---|---|---|---|
| Frontend (`brewlite-web`) | Web Service | `https://brewlite-web.onrender.com` | Next.js PWA, HTTPS tự động |
| Backend (`brewlite-api`) | Web Service | `https://brewlite-api.onrender.com` | NestJS API, HTTPS tự động |
| Database (`brewlite-db`) | Managed PostgreSQL | Private Network (`:5432`) | Persistent volume, không public |

> ⚠️ **Lưu ý vòng đời Database miễn phí:** Theo chính sách Render Free tier, database PostgreSQL miễn phí sẽ hết hạn sau **30 ngày** (+14 ngày gia hạn trước khi bị xóa). Nhóm tạo instance gần ngày nghiệm thu Task 5, kết hợp migration/seed tự động và sao lưu `pg_dump` để có thể tái tạo database bất kỳ lúc nào chỉ trong 2 phút.

## Sơ đồ

Xem [docs/diagrams/deployment.svg](diagrams/deployment.svg) hoặc [.png](diagrams/deployment.png).

Nguồn PlantUML: [docs/diagrams/deployment.puml](diagrams/deployment.puml).

## Biến môi trường

### 1. Build Arguments (Bắt buộc lúc đóng gói Docker ở CI)

> ⚠️ **Lưu ý Task 5:** Các biến `NEXT_PUBLIC_*` được Next.js nhúng tĩnh vào mã nguồn tại thời điểm **build time**. Khi build Docker image ở CI (GitHub Actions), phải truyền dưới dạng `--build-arg`. Đặt biến này trên Render lúc runtime sẽ không có tác dụng đối với bundle tĩnh của Next.js.

| Build Arg | Mô tả | Giá trị Production |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL backend gọi từ trình duyệt | `https://brewlite-api.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | URL frontend production | `https://brewlite-web.onrender.com` |
| `NEXT_PUBLIC_ORDER_PAYMENT_TIMEOUT_MINUTES` | Thời hạn hiển thị countdown đơn | `15` |

### 2. Runtime Environment Variables (Render Secrets)

#### Backend (`brewlite-api`)

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `DATABASE_URL` | Render Internal PostgreSQL URL (`postgres://...:5432/...`) | ✅ |
| `JWT_SECRET` | Secret để ký và xác thực JWT token | ✅ |
| `JWT_EXPIRES_IN` | Thời hạn token (ví dụ `1d`) | ✅ |
| `FRONTEND_URL` | URL frontend production để cấu hình CORS | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `PORT` | Port API (mặc định `3001`) | ✅ |
| `ADMIN_EMAIL` | Email tài khoản quản trị viên seed | ✅ |
| `ADMIN_PASSWORD` | Mật khẩu tài khoản quản trị viên seed | ✅ |
| `ORDER_PAYMENT_TIMEOUT_MINUTES` | Thời hạn chờ thanh toán đơn hàng (phút) | ⬜ |

#### Frontend (`brewlite-web`)

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `PORT` | Port web container (mặc định `3000`) | ✅ |
| `API_INTERNAL_URL` | URL gọi backend từ server-side (Next.js Server Proxy/SSR) | ✅ |

> ℹ️ **Lưu ý mạng nội bộ:** Do gói Render Free Web Service không hỗ trợ nhận traffic mạng nội bộ ("Free web services can't receive private network traffic"), `API_INTERNAL_URL` trên production được đặt thành URL công khai HTTPS: `https://brewlite-api.onrender.com`.

> ⚠️ **Không commit file `.env`**. Tất cả runtime secrets được lưu trực tiếp trên Render Environment Variables.

## Deploy / Rollback

_(Sẽ hoàn thiện chi tiết ở Task 5.3–5.4)_

### Deploy

1. CI (GitHub Actions) chạy quality gate: Install → Lint → Unit Test → Build.
2. Build Docker image kèm các `--build-arg` cần thiết và push lên GitHub Packages (`ghcr.io/nhom6cnpm/...`).
3. CI kích hoạt Render Deploy Hook qua `curl` để Render tự động pull image mới và cập nhật service (hoặc kích hoạt thủ công qua Render Dashboard → Manual Deploy).

### Rollback

Render Dashboard → Chọn Web Service tương ứng → Tab Events → Chọn phiên bản triển khai ổn định trước đó → Bấm **Rollback**.

## Health Check

| Service | Endpoint | Kỳ vọng |
|---|---|---|
| brewlite-api | `GET /health` | HTTP 200, `{"status":"ok"}` |
| brewlite-web | `GET /menu` | HTTP 200 |

> `GET /health` sẽ được hiện thực ở Task 5.2.
