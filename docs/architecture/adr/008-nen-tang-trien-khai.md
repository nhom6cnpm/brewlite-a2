# ADR 008 – Nền tảng triển khai: Render

**Trạng thái:** Accepted  
**Ngày:** 2026-11-05  
**Người quyết định:** Lương (DucLuong2201)  
**Liên quan:** ADR 001 (monorepo), Task 3.2, Task 5.3–5.4

## Bối cảnh

BrewLite cần một nền tảng cloud có thể chạy đồng thời Next.js (web), NestJS (API) và PostgreSQL (database), hỗ trợ HTTPS tự động, pipeline CI/CD qua GitHub Actions, database private (không public trực tiếp), không yêu cầu chi phí cao cho môi trường học thuật.

## Quyết định

Chọn **Render** làm nền tảng production kết hợp **GitHub Packages (ghcr.io)** làm Container Registry:
- **Frontend (brewlite-web):** Render Web Service chạy Docker image từ `ghcr.io/nhom6cnpm/brewlite-web`, tắt auto-deploy trên Render.
- **Backend (brewlite-api):** Render Web Service chạy Docker image từ `ghcr.io/nhom6cnpm/brewlite-api`, tắt auto-deploy trên Render.
- **Cơ chế triển khai:** 
  1. Tắt tính năng auto-deploy của Render khi push code lên Git để tránh deploy mã nguồn chưa kiểm thử.
  2. GitHub Actions CI thực thi quality gate (Install $\to$ Lint $\to$ Unit Test $\to$ Build Docker image).
  3. CI push Docker image được gắn tag (commit SHA hoặc semantic version) lên Container Registry GitHub Packages (`ghcr.io`).
  4. CI kích hoạt Render Deploy Hook bằng `curl` sử dụng secret URL được cấu hình trong GitHub Actions secrets để Render pull image mới nhất và restart container.
- **Database (brewlite-db):** Render Managed PostgreSQL, kết nối qua `Internal Database URL` (chỉ accessible từ cùng Render project), không public trực tiếp ra ngoài internet.
- **HTTPS & Định tuyến:** Render cấp TLS tự động (Let's Encrypt); CDN tiếp nhận HTTPS :443 định tuyến giao diện tới `brewlite-web` (:3000) và REST API / health check tới `brewlite-api` (:3001).
- **Secret management:** Lưu toàn bộ biến môi trường (`JWT_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`...) trong Render Environment Variables / Secret Files, **không commit vào repo**.

## Hệ quả

**Tích cực:**
- Quản lý version image tập trung, minh bạch qua `ghcr.io`, đảm bảo chỉ có image pass CI mới được deploy lên production.
- Không cần quản lý server/VM; quy trình CD qua Deploy Hook đơn giản, tin cậy và có thể kích hoạt lại khi cần rollback.
- PostgreSQL managed: backup tự động, dữ liệu được lưu trên persistent storage và cô lập trong mạng nội bộ.
- HTTPS miễn phí cho toàn bộ endpoint (cả UI và API), không cần tự cấu hình Nginx/Caddy.

**Tiêu cực / Hạn chế:**
- Render Free tier: Web Service có thể "ngủ" (spin-down) sau 15 phút không có request → cold start ~30s. Database Free tier hết hạn sau 90 ngày.
- Cần cấu hình quyền truy cập (read package token) nếu package trên GHCR ở chế độ private.
- Không hỗ trợ WebSocket lâu dài ở gói miễn phí (không ảnh hưởng vì A1 dùng polling).

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Railway | Tương tự Render nhưng ít tài liệu tiếng Việt hơn, pricing thay đổi nhiều |
| Fly.io | Cần cấu hình `fly.toml` phức tạp hơn, không quen thuộc với nhóm |
| VPS (DigitalOcean/Linode) | Phải tự quản lý OS, Nginx, SSL → quá tốn thời gian cho scope môn học |
| Vercel + Supabase | Vercel tốt cho Next.js nhưng NestJS không phải Serverless-native; thêm 1 nền tảng riêng cho DB |
