# ADR-001: Dùng một repo (monorepo) cho web, API và tài liệu

- **Trạng thái:** Đã chấp nhận

## Bối cảnh

BrewLite gồm frontend Next.js, backend NestJS và bộ tài liệu (yêu cầu, sơ đồ, kiến trúc). Nhóm là sinh viên, làm song song nhiều task và mọi thay đổi đều đi qua Pull Request có người review. Tài liệu cần truy vết được tới mã nguồn (ma trận truy vết, tên module/lớp trong sơ đồ phải trùng với code).

## Quyết định

Dùng **một repo duy nhất** với cấu trúc:

- `apps/web` – frontend Next.js
- `apps/api` – backend NestJS
- `docs` – tài liệu LaTeX/Markdown, sơ đồ PlantUML

## Hệ quả

**Được:**

- Một thay đổi cắt ngang (ví dụ thêm trường vào đơn hàng) gồm API, giao diện và tài liệu nằm trong cùng một Pull Request.
- Một quy trình review, một lịch sử, một cấu hình CI/CD.
- Tài liệu và code luôn cùng phiên bản, dễ truy vết.

**Mất:**

- CI chạy trên toàn repo nên chậm dần nếu không lọc theo thư mục thay đổi.
- Không phân quyền riêng được cho từng phần (web, api, docs).
- Cần quy ước rõ về thư mục và phụ thuộc giữa các phần để tránh lẫn lộn.

## Phương án đã cân nhắc

- **Nhiều repo (web, api, docs riêng):** tách bạch hơn nhưng một thay đổi liên quan phải mở nhiều Pull Request, dễ lệch phiên bản giữa tài liệu và code. Không phù hợp với nhóm nhỏ.
- **Monorepo kèm công cụ quản lý (Nx, Turborepo...):** hỗ trợ cache và chạy CI theo phần thay đổi, nhưng thêm độ phức tạp cấu hình mà quy mô hiện tại chưa cần. Có thể cân nhắc lại nếu thời gian CI tăng.
