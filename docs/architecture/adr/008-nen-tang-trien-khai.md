# ADR-008: Nền tảng triển khai: Render và Container Registry

- **Trạng thái:** Đề xuất (chờ review)
- **Ngày:** 2026-11-05
- **Người quyết định:** Lương (DucLuong2201)
- **Liên quan:** ADR-001 (monorepo), Task 3.2, Task 5.3–5.4

## Bối cảnh

BrewLite cần một nền tảng cloud có thể chạy đồng thời Next.js (web), NestJS (API) và PostgreSQL (database), hỗ trợ HTTPS tự động, pipeline CI/CD qua GitHub Actions, database private (không public trực tiếp ra ngoài internet), không yêu cầu chi phí cho môi trường học thuật.

## Quyết định

Chọn **Render** làm nền tảng production kết hợp **GitHub Packages (ghcr.io)** làm Container Registry:

- **Frontend (brewlite-web):** Render Web Service chạy Docker image từ `ghcr.io/nhom6cnpm/brewlite-web`, tắt auto-deploy trên Render.
- **Backend (brewlite-api):** Render Web Service chạy Docker image từ `ghcr.io/nhom6cnpm/brewlite-api`, tắt auto-deploy trên Render.
- **Cơ chế triển khai:** 
  1. Tắt tính năng auto-deploy của Render khi push code lên Git để tránh deploy mã nguồn chưa kiểm thử.
  2. GitHub Actions CI thực thi quality gate (Install → Lint → Unit Test → Build Docker image).
  3. Image `brewlite-web` phải được truyền `NEXT_PUBLIC_API_URL` qua `--build-arg` tại thời điểm build ở CI (do Next.js nhúng biến client vào bundle tĩnh lúc build).
  4. CI push Docker image được gắn tag (commit SHA hoặc semantic version) lên Container Registry GitHub Packages (`ghcr.io`).
  5. CI kích hoạt Render Deploy Hook bằng `curl` sử dụng secret URL được cấu hình trong GitHub Actions secrets để Render pull image mới nhất từ `ghcr.io` và restart container.
- **Database (brewlite-db):** Render Managed PostgreSQL, kết nối qua `Internal Database URL` (chỉ accessible từ cùng Render project), không public trực tiếp ra ngoài internet.
- **HTTPS & Định tuyến:** Mỗi service nhận domain `*.onrender.com` riêng và cấp TLS tự động (Let's Encrypt). Trình duyệt gọi trực tiếp `brewlite-web` lấy giao diện và `brewlite-api` qua HTTPS (kèm CORS). Do gói Web Service miễn phí trên Render không nhận kết nối mạng nội bộ (private network), tác vụ server-side Next.js (`API_INTERNAL_URL`) cũng gọi backend qua URL công khai HTTPS `https://brewlite-api.onrender.com`.
- **Secret management:** Lưu toàn bộ biến môi trường (`JWT_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`...) trong Render Environment Variables / Secret Files, **không commit vào repo**.

## Hệ quả

**Được:**

- Quản lý version image tập trung, minh bạch qua `ghcr.io`, đảm bảo chỉ có image pass CI mới được deploy lên production.
- Không cần quản lý server/VM; quy trình CD qua Deploy Hook đơn giản, tin cậy và có thể kích hoạt lại khi cần rollback.
- PostgreSQL managed: backup tự động, dữ liệu được lưu trên persistent storage và cô lập trong mạng nội bộ.
- HTTPS miễn phí cho toàn bộ endpoint (cả UI và API), không cần tự cấu hình Nginx/Caddy.

**Mất:**

- **Render Free Tier Database hết hạn sau 30 ngày** (sau đó có 14 ngày gia hạn trước khi bị xóa vĩnh viễn). Đây là rủi ro lớn nhất cho Task 5 (mất điểm nếu URL production không chạy tại thời điểm chấm).
  - *Cách xử lý:* Chỉ khởi tạo database Render khi bước vào Sprint 2 / Task 5; đồng thời chuẩn bị sẵn migration tự động chứa sẵn dữ liệu mẫu (`npm run migration:run` hoặc tự động áp dụng khi API khởi động) để có thể tái lập dữ liệu mẫu trong vòng 1 phút bất cứ lúc nào.
- Render Free Web Service có thể "ngủ" (spin-down) sau 15 phút không có request → cold start ~30s.
- Gói Free Web Service không nhận được traffic nội bộ, buộc Next.js server-side phải gọi API qua HTTPS công khai (độ trễ nhỉnh hơn mạng nội bộ một chút nhưng hoàn toàn chấp nhận được).
- Không hỗ trợ WebSocket lâu dài ở gói miễn phí (không ảnh hưởng vì BrewLite dùng polling theo ADR-007).

## Phương án đã cân nhắc

- **Railway:** Tương tự Render nhưng ít tài liệu tiếng Việt hơn, chính sách credit thay đổi nhiều.
- **Fly.io:** Cần cấu hình `fly.toml` phức tạp hơn, không quen thuộc với nhóm.
- **VPS (DigitalOcean/Linode):** Phải tự quản lý OS, Nginx, SSL → quá tốn thời gian cho scope môn học.
- **Vercel + Supabase:** Vercel tốt cho Next.js nhưng NestJS không phải Serverless-native; thêm 1 nền tảng riêng cho DB gây phân tán tài khoản quản lý.
