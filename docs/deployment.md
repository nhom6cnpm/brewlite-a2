# Deployment

## Nền tảng

**Production:** [Render](https://render.com)

| Thành phần | Render Service | URL |
|---|---|---|
| Frontend (brewlite-web) | Web Service | _(sẽ cập nhật ở Task 5)_ |
| Backend (brewlite-api) | Web Service | _(sẽ cập nhật ở Task 5)_ |
| Database (brewlite-db) | Managed PostgreSQL | Private (Internal URL) |

## Sơ đồ

Xem [docs/diagrams/deployment.svg](diagrams/deployment.svg) hoặc [.png](diagrams/deployment.png).

Nguồn PlantUML: [docs/diagrams/deployment.puml](diagrams/deployment.puml).

## Biến môi trường

### Backend (`brewlite-api`)

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `DATABASE_URL` | Render Internal PostgreSQL URL | ✅ |
| `JWT_SECRET` | Secret để ký JWT | ✅ |
| `JWT_EXPIRES_IN` | Thời hạn JWT (ví dụ `1d`) | ✅ |
| `FRONTEND_URL` | URL frontend production (CORS) | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `PORT` | Port API (mặc định `3001`) | ✅ |
| `ADMIN_EMAIL` | Email tài khoản admin seed | ✅ |
| `ADMIN_PASSWORD` | Password tài khoản admin seed | ✅ |
| `ORDER_PAYMENT_TIMEOUT_MINUTES` | Timeout thanh toán (mặc định `15`) | ⬜ |

### Frontend (`brewlite-web`)

| Biến | Mô tả | Bắt buộc |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL backend production | ✅ |
| `NEXT_PUBLIC_APP_URL` | URL frontend production | ✅ |
| `PORT` | Port web (mặc định `3000`) | ✅ |
| `API_INTERNAL_URL` | URL backend nội bộ (server-side proxy) | ✅ |
| `NEXT_PUBLIC_ORDER_PAYMENT_TIMEOUT_MINUTES` | Timeout hiển thị trên UI | ⬜ |

> ⚠️ **Không commit file `.env`**. Tất cả secret lưu trong Render Environment Variables.

## Deploy / Rollback

_(Sẽ điền chi tiết ở Task 5.3–5.4)_

### Deploy

1. CI (GitHub Actions) chạy quality gate: Install → Lint → Unit Test → Build.
2. Build và push Docker image lên GitHub Packages (`ghcr.io`).
3. Kích hoạt Render Deploy Hook qua `curl` để Render pull image và cập nhật service (hoặc thủ công qua Render Dashboard → Manual Deploy).

### Rollback

Render Dashboard → Service → Events → chọn deploy trước → Rollback.

## Health Check

| Service | Endpoint | Kỳ vọng |
|---|---|---|
| brewlite-api | `GET /health` | HTTP 200, `{"status":"ok"}` |
| brewlite-web | `GET /menu` | HTTP 200 |

> `GET /health` sẽ được implement ở Task 5.2.

