# ADR 008 – Nền tảng triển khai: Render

**Trạng thái:** Accepted  
**Ngày:** 2026-11-05  
**Người quyết định:** Lương (DucLuong2201)  
**Liên quan:** ADR 001 (monorepo), Task 3.2, Task 5.3–5.4

## Bối cảnh

BrewLite cần một nền tảng cloud có thể chạy đồng thời Next.js (web), NestJS (API) và PostgreSQL (database), hỗ trợ HTTPS tự động, pipeline CI/CD qua GitHub Actions, database private (không public trực tiếp), không yêu cầu chi phí cao cho môi trường học thuật.

## Quyết định

Chọn **Render** làm nền tảng production:
- **Frontend (brewlite-web):** Render Web Service, build từ `apps/web/Dockerfile`, auto-deploy khi push tag.
- **Backend (brewlite-api):** Render Web Service, build từ `apps/api/Dockerfile`, auto-deploy khi push tag.
- **Database (brewlite-db):** Render Managed PostgreSQL, kết nối qua `Internal Database URL` (chỉ accessible từ cùng Render project), không public.
- **HTTPS:** Render cấp TLS tự động (Let's Encrypt), custom domain nếu cần.
- **Secret management:** Lưu toàn bộ biến môi trường (`JWT_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`...) trong Render Environment Variables / Secret Files, **không commit vào repo**.

## Hệ quả

**Tích cực:**
- Không cần quản lý server/VM; tích hợp GitHub sẵn, pipeline đơn giản.
- PostgreSQL managed: backup tự động, không public.
- HTTPS miễn phí, không cần cấu hình Nginx/Caddy.

**Tiêu cực / Hạn chế:**
- Render Free tier: Web Service có thể "ngủ" (spin-down) sau 15 phút không có request → cold start ~30s. Database Free tier hết hạn sau 90 ngày.
- Không có container registry riêng (Render tự build từ Dockerfile); nếu muốn cache image phải dùng Docker Hub hoặc GHCR kết hợp.
- Không hỗ trợ WebSocket lâu dài ở gói miễn phí (không ảnh hưởng vì A1 dùng polling).

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Railway | Tương tự Render nhưng ít tài liệu tiếng Việt hơn, pricing thay đổi nhiều |
| Fly.io | Cần cấu hình `fly.toml` phức tạp hơn, không quen thuộc với nhóm |
| VPS (DigitalOcean/Linode) | Phải tự quản lý OS, Nginx, SSL → quá tốn thời gian cho scope môn học |
| Vercel + Supabase | Vercel tốt cho Next.js nhưng NestJS không phải Serverless-native; thêm 1 nền tảng riêng cho DB |
