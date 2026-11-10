# Ma trận truy vết

Cập nhật dần theo từng task: yêu cầu → use-case / user story → thiết kế / sơ đồ → code / API → test.

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | UC-01: Xem danh mục đồ uống (Menu) | docs/diagrams/usecase-overview.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | API: [GET /products](../apps/api/src/products/products.controller.ts) ([service](../apps/api/src/products/products.service.ts)); Web: [Menu](../apps/web/src/app/menu/page.tsx), [useProducts](../apps/web/src/hooks/useProducts.ts), [GET /products](../apps/web/src/lib/api.ts) | API-T01 — [controller](../apps/api/src/products/products.controller.spec.ts), [service](../apps/api/src/products/products.service.spec.ts); WEB-T01 — [Menu component](../apps/web/src/app/menu/page.test.tsx): loading, rỗng, lỗi/Thử lại, tên/giá và liên kết chi tiết |
| FR-02 | UC-02: Xem chi tiết & tùy chọn (Size/Topping) | docs/diagrams/usecase-overview.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | API: [GET /products/:id](../apps/api/src/products/products.controller.ts) (404 nếu không có); Web: [chi tiết món](../apps/web/src/app/products/[id]/page.tsx), [ProductOptions](../apps/web/src/components/ProductOptions.tsx), [phụ phí dùng chung PR #45](../apps/web/src/lib/productOptions.ts), [store dùng chung PR #45](../apps/web/src/store/useCart.ts); [useAvailability](../apps/web/src/hooks/useAvailability.ts), [API client](../apps/web/src/lib/availability.ts) gọi POST /products/availability (API thật chờ Issue #28) | API-T02 — [controller](../apps/api/src/products/products.controller.spec.ts), [service](../apps/api/src/products/products.service.spec.ts); WEB-T02 — [chi tiết component](../apps/web/src/app/products/[id]/page.test.tsx): tải/404/lỗi; WEB-T20..T31 — cùng file: giá theo tùy chọn, hết/vượt kho, thêm store thật, đổi lựa chọn, kiểm tra lại kho, API lỗi/thử lại, số lượng sai, bấm lặp, toàn giỏ, giới hạn 99 và giỏ đổi; WEB-T40..T45 — [availability client](../apps/web/src/lib/availability.test.ts): payload/signal, validate, lỗi server, sai/mâu thuẫn dữ liệu, endpoint chưa có |
| FR-03 | UC-03: Quản lý giỏ hàng (Cart); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-04 | UC-04: Đăng ký & Đăng nhập (JWT); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01]; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-05 | UC-05: Đặt đơn hàng (Giữ nguyên liệu 15p); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01]; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-06 | UC-09: Quản lý & giữ tồn kho theo nguyên liệu, UC-14: Theo dõi tồn kho nguyên liệu & Cảnh báo; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01]; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-07 | UC-06: Chuyển khoản qua Ngân hàng giả lập (QR), UC-10: Ghi nhận sao kê & Tự động hoàn tiền; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01]; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-08 | UC-10: Ghi nhận sao kê, UC-11: Đối chiếu sao kê & Xác nhận thanh toán; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01]; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-09 | UC-08: Hủy đơn hàng / Gửi yêu cầu hủy, UC-12: Duyệt yêu cầu hủy đơn & Hoàn tiền; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Class-01] | | |
| FR-10 | UC-05, UC-08, UC-11, UC-12: Máy trạng thái đơn & Tự hủy quá hạn; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01]; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-11 | UC-13: Cập nhật tiến trình pha chế (Bảng Barista) | docs/diagrams/usecase-overview.png; [Class-01] | | |
| FR-12 | UC-07: Theo dõi trạng thái đơn & Lịch sử cá nhân, UC-15: Tra cứu lịch sử mọi đơn & Sao kê | docs/diagrams/usecase-overview.png; [Class-01] | | |
| FR-13 | UC-05, UC-11: Khuyến mãi (Voucher) & Điểm thưởng; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01]; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-14 | UC-16: Quản lý menu, giá & nhập kho nguyên liệu (Won't) | docs/diagrams/usecase-overview.png | | |
| FR-15 | UC-17: Đổi điểm thưởng lấy voucher / đồ uống (Won't) | docs/diagrams/usecase-overview.png | | |
| NFR-01 | UC-05, UC-09: Hiệu năng hệ thống & Xử lý đồng thời có kiểm chứng; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Sequence-01](diagrams/sequence-checkout.svg); [ADR-005](architecture/adr/005-idempotency-key-va-optimistic-locking.md) | | |
| NFR-02 | UC-04, UC-09, UC-10, UC-11: Bảo mật dữ liệu & Phân quyền (Security, Locking); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Sequence-01](diagrams/sequence-checkout.svg); [ADR-005](architecture/adr/005-idempotency-key-va-optimistic-locking.md); [ADR-006](architecture/adr/006-jwt-va-phan-quyen-customer-admin.md) | | |
| NFR-03 | UC-01..UC-08: Tính khả dụng & Mobile-first PWA tối thiểu; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Architecture-01](diagrams/architecture-c4.svg) | | |
| NFR-04 | Toàn hệ thống: Khả năng triển khai Docker & CI/CD | [Architecture-01](diagrams/architecture-c4.svg); [ADR-001](architecture/adr/001-monorepo.md); [ADR-003](architecture/adr/003-postgresql-typeorm-migration.md); [Deployment-01](diagrams/deployment.svg); [ADR-008](architecture/adr/008-nen-tang-trien-khai.md) | CI: [ci.yml](../.github/workflows/ci.yml); Docker: [docker-compose.yml](../docker-compose.yml), [api/Dockerfile](../apps/api/Dockerfile), [web/Dockerfile](../apps/web/Dockerfile); API: [GET /health](../apps/api/src/health/health.controller.ts) ([service](../apps/api/src/health/health.service.ts)) | CI-T01 — GitHub Actions (check `api`, `web`); API-T03 — [health controller](../apps/api/src/health/health.controller.spec.ts), [health service](../apps/api/src/health/health.service.spec.ts): trả 200 `{ status: "ok" }` khi DB sẵn sàng, 503 khi mất kết nối DB |

### Activity-01 — Task 2.1

Một sơ đồ chứa luồng từ menu đến xác nhận đơn, đủ ba swimlane và các nhánh:
chưa đăng nhập, thiếu nguyên liệu, nhân viên từ chối/hoàn tiền/thử lại,
và tự hủy sau 15 phút chưa nhận tiền.

- [Nguồn PlantUML](diagrams/activity-checkout.puml)
- [Ảnh SVG](diagrams/activity-checkout.svg) · [Ảnh PNG](diagrams/activity-checkout.png)
- [Thuyết minh LaTeX](diagrams/activity.tex)

Liên kết thiết kế thể hiện phạm vi được mô hình hóa; không xác nhận code/API
hoặc kiểm thử đã được triển khai.

### Sequence-01 — Task 2.2

Sơ đồ tuần tự cho use-case UC-CK "Đặt và thanh toán đơn hàng": đặt đơn (`POST /orders`),
tạo phiên thanh toán (`POST /payments`), chuyển tiền qua ngân hàng giả lập, nhân viên
xác nhận/từ chối, thử lại và tự hủy khi quá hạn. Có Idempotency-Key cho cả đặt đơn và thanh toán.

- [Nguồn PlantUML](diagrams/sequence-checkout.puml)
- [Ảnh SVG](diagrams/sequence-checkout.svg) · [Ảnh PNG](diagrams/sequence-checkout.png)
- [Thuyết minh LaTeX](diagrams/sequence.tex)

## Class-01 (Task 2.3)

Thiết kế cho Issue #9, review tại PR #12; không thay thế bằng chứng code/test A2.

- Nguồn: [class-domain.puml](diagrams/class-domain.puml), gồm hai view.
- Hình lớp: [SVG](diagrams/class-domain.svg), [PNG](diagrams/class-domain.png).
- Enum: [Class-01b](diagrams/class-domain-enums.svg), [PNG](diagrams/class-domain-enums.png).
- Thuyết minh: [class.tex](diagrams/class.tex).
- LoyaltyTransaction là lớp suy ra từ Order, chưa có bảng riêng trong A1.
- Đã đối chiếu Task 1.1 trên main `c78780e` và sequence Task 2.2 tại `4c630e8`; các tên `expiresAt`, `total`, `bank_transactions` và trạng thái lượt mã `USED` đã thống nhất với code A1.
- Cập nhật theo review PR #12: Payment có `idempotencyKey: String` duy nhất; Promotion có `isPublic: Boolean` để phân biệt mã công khai và mã chỉ nhập trực tiếp.

## Architecture-01 (Task 3.1)

Kiến trúc C4 (mức Container) và các quyết định kiến trúc ADR-001 đến ADR-007; không thay thế bằng chứng code/test A2.

- Nguồn PlantUML: [architecture-c4.puml](diagrams/architecture-c4.puml)
- Ảnh: [SVG](diagrams/architecture-c4.svg) · [PNG](diagrams/architecture-c4.png)
- Thuyết minh LaTeX: [architecture.tex](architecture/architecture.tex)
- ADR: [ADR-001](architecture/adr/001-monorepo.md) · [ADR-002](architecture/adr/002-nestjs-modules-theo-domain.md) · [ADR-003](architecture/adr/003-postgresql-typeorm-migration.md) · [ADR-004](architecture/adr/004-ngan-hang-gia-lap-nhan-vien-xac-nhan.md) · [ADR-005](architecture/adr/005-idempotency-key-va-optimistic-locking.md) · [ADR-006](architecture/adr/006-jwt-va-phan-quyen-customer-admin.md) · [ADR-007](architecture/adr/007-polling-thay-websocket.md)
- ADR-008 (nền tảng triển khai) do Task 3.2 bổ sung.

[Class-01]: diagrams/class-domain.svg

### Deployment-01 — Task 3.2

Sơ đồ triển khai UML môi trường production trên nền tảng Render, thể hiện 3 ranh giới (Local, CI, Production), container registry (GHCR), kết nối HTTPS/internal, biến môi trường và health check cho NFR-04.

- [Nguồn PlantUML](diagrams/deployment.puml)
- [Ảnh SVG](diagrams/deployment.svg) · [Ảnh PNG](diagrams/deployment.png)
- [Thuyết minh LaTeX](architecture/deployment.tex)
- [Quyết định kiến trúc ADR-008](architecture/adr/008-nen-tang-trien-khai.md)
- [Tài liệu hướng dẫn triển khai](deployment.md)

### CI-01 — Task 4.4

Pipeline Continuous Integration (CI) tự động kích hoạt trên GitHub Actions khi mở Pull Request vào `main` và khi push lên `main`.
Bắt buộc vượt qua toàn bộ quality gate (lint, test, build) trước khi merge.

- File cấu hình: [ci.yml](../.github/workflows/ci.yml)
- Job `api` (Phúc phụ trách): Node 24, thư mục `apps/api`, chạy `npm ci` → `npm run lint` (Oxlint) → `npm test` (Jest) → `npm run build` (NestJS).
- Job `web` (Lương phụ trách): Node 24, thư mục `apps/web`, chạy `npm ci` → `npm run lint` (ESLint) → `npm test` (Vitest) → `npm run build` (Next.js).
- Bắt buộc branch protection: cả 2 check `api` và `web` phải xanh mới được merge.
- Minh chứng CI: [docs/ci/README.md](ci/README.md) (PR thành công [#24](https://github.com/nhom6cnpm/brewlite-a2/pull/24), minh chứng phát hiện lỗi trên PR [#25](https://github.com/nhom6cnpm/brewlite-a2/pull/25)).

### Docker & Healthcheck — Task 5.2

Cấu hình đóng gói container dùng **Node 24** (`node:24-alpine`) và điều phối chạy local bằng một lệnh `docker compose up` cho đủ 3 dịch vụ (`postgres`, `api`, `web`), tự động chạy migration/seed khi khởi động API.

- Compose & Dockerfiles: [docker-compose.yml](../docker-compose.yml), [apps/api/Dockerfile](../apps/api/Dockerfile), [apps/web/Dockerfile](../apps/web/Dockerfile)
- Healthcheck endpoint: [GET /health](../apps/api/src/health/health.controller.ts), [HealthService](../apps/api/src/health/health.service.ts) (trả `200 { "status": "ok" }` khi kết nối DB thành công, `503` khi DB lỗi)
- Unit test (`API-T03`): [health.controller.spec.ts](../apps/api/src/health/health.controller.spec.ts), [health.service.spec.ts](../apps/api/src/health/health.service.spec.ts)
