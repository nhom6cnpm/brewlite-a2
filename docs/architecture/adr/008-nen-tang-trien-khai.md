# ADR-008: Nền tảng triển khai: Render

**Trạng thái:** Đã chấp nhận  
**Ngày:** 2026-11-05  
**Người quyết định:** Lương (DucLuong2201)  
**Liên quan:** ADR-001 (monorepo), Task 3.2, Task 5.3–5.4

## Bối cảnh

BrewLite cần một nền tảng cloud có thể chạy đồng thời Next.js (web), NestJS (API) và PostgreSQL (database), hỗ trợ HTTPS tự động, pipeline CI/CD qua GitHub Actions, database private (không public trực tiếp), không yêu cầu chi phí cao cho môi trường học thuật.

## Quyết định

Chọn **Render** làm nền tảng production kết hợp **GitHub Packages (ghcr.io)** làm Container Registry:
- **Frontend (brewlite-web):** Render Web Service chạy Docker image từ `ghcr.io/nhom6cnpm/brewlite-web`, tắt auto-deploy trên Render.
- **Backend (brewlite-api):** Render Web Service chạy Docker image từ `ghcr.io/nhom6cnpm/brewlite-api`, tắt auto-deploy trên Render.
- **Cơ chế triển khai:** 
  1. Tắt tính năng auto-deploy của Render khi push code lên Git để tránh deploy mã nguồn chưa qua kiểm thử.
  2. GitHub Actions CI thực thi quality gate (Install → Lint → Unit Test → Build Docker image).
  3. Các biến môi trường `NEXT_PUBLIC_*` của Next.js được inlined vào bundle tĩnh lúc build, do đó CI truyền qua `--build-arg` khi chạy `docker build` (không cấu hình runtime trên Render).
  4. CI push Docker image được gắn tag (commit SHA hoặc semantic version) lên Container Registry GitHub Packages (`ghcr.io`).
  5. CI kích hoạt Render Deploy Hook bằng `curl` sử dụng secret URL được cấu hình trong GitHub Actions secrets để Render pull image mới nhất và restart container.
- **Database (brewlite-db):** Render Managed PostgreSQL, kết nối qua `Internal Database URL` (chỉ accessible từ cùng Render project), không public trực tiếp ra ngoài internet.
- **HTTPS & Định tuyến:** Mỗi web service trên Render sở hữu một tên miền độc lập (`https://brewlite-web.onrender.com` và `https://brewlite-api.onrender.com`) với chứng chỉ TLS tự động từ Let's Encrypt.
- **Giao tiếp Web → API:** Do gói Free Web Service của Render không nhận kết nối mạng nội bộ ("Free web services can't receive private network traffic"), giao tiếp giữa `brewlite-web` và `brewlite-api` (cả từ client trình duyệt lẫn server-side proxy / SSR qua `API_INTERNAL_URL`) đều đi qua URL công khai HTTPS: `https://brewlite-api.onrender.com`. Riêng API gọi Database vẫn dùng Internal URL nội bộ bình thường.
- **Secret management:** Lưu toàn bộ biến môi trường (`JWT_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`...) trong Render Environment Variables / Secret Files, **không commit vào repo**.

## Hệ quả

**Tích cực:**
- Quản lý version image tập trung, minh bạch qua `ghcr.io`, đảm bảo chỉ có image pass CI mới được deploy lên production.
- Không cần quản lý server/VM; quy trình CD qua Deploy Hook đơn giản, tin cậy và có thể kích hoạt lại khi cần rollback.
- PostgreSQL managed: backup tự động, dữ liệu được lưu trên persistent storage và cô lập trong mạng nội bộ.
- HTTPS miễn phí cho toàn bộ endpoint (cả UI và API), không cần tự cấu hình Nginx/Caddy.

**Tiêu cực / Hạn chế & Biện pháp giảm thiểu:**
- **Web Service Free tier có thể "ngủ" (spin-down):** Sau 15 phút không có request, container sẽ tạm dừng; request tiếp theo cần thời gian cold start ~30–50s. Giải pháp: Client PWA hiển thị trạng thái loading rõ ràng và thực hiện retry khi gặp timeout khởi động.
- **Database Free tier hết hạn sau 30 ngày:** Theo tài liệu Render (render.com/docs/free), database miễn phí sẽ hết hạn sau 30 ngày, kèm 14 ngày gia hạn (grace period) trước khi dữ liệu bị xóa vĩnh viễn. Đề bài yêu cầu URL production phải hoạt động tại thời điểm chấm bài (Task 5). **Biện pháp xử lý của nhóm:**
  1. Chỉ khởi tạo instance database Render sát thời điểm nghiệm thu Task 5 để đảm bảo database luôn còn hạn sử dụng khi chấm.
  2. Toàn bộ cấu trúc bảng và dữ liệu mẫu được quản lý bằng TypeORM migration & seed script, kết hợp lệnh `pg_dump` sao lưu dữ liệu; nhóm có thể tái lập database đầy đủ trong vòng 2 phút bất kỳ lúc nào.
  3. Trong trường hợp cần duy trì môi trường nghiệm thu lâu hơn 30 ngày, nhóm sẵn sàng nâng gói Starter ($7/tháng) cho database trong thời gian chấm bài.
- **Không có mạng nội bộ giữa các Web Service:** Cần cấu hình CORS chính xác trên backend NestJS để tiếp nhận request từ tên miền frontend HTTPS.
- Không hỗ trợ WebSocket lâu dài ở gói miễn phí (không ảnh hưởng vì BrewLite dùng cơ chế polling).

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Railway | Tương tự Render nhưng ít tài liệu tiếng Việt hơn, pricing thay đổi nhiều |
| Fly.io | Cần cấu hình `fly.toml` phức tạp hơn, không quen thuộc với nhóm |
| VPS (DigitalOcean/Linode) | Phải tự quản lý OS, Nginx, SSL → quá tốn thời gian cho scope môn học |
| Vercel + Supabase | Vercel tốt cho Next.js nhưng NestJS không phải Serverless-native; thêm 1 nền tảng riêng cho DB |
