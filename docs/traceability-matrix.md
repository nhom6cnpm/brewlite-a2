# Ma trận truy vết

Cập nhật dần theo từng task: yêu cầu → use-case / user story → thiết kế / sơ đồ → code / API → test.

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | UC-01: Xem danh mục đồ uống (Menu) | docs/diagrams/usecase-overview.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | Web: [Menu](../apps/web/src/app/menu/page.tsx), [useProducts](../apps/web/src/hooks/useProducts.ts), [GET /products](../apps/web/src/lib/api.ts) | [Menu component](../apps/web/src/app/menu/page.test.tsx): loading, rỗng, lỗi/Thử lại, tên/giá và liên kết chi tiết |
| FR-02 | UC-02: Xem chi tiết & tùy chọn (Size/Topping) | docs/diagrams/usecase-overview.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | Web Sprint 1: [chi tiết món](../apps/web/src/app/products/[id]/page.tsx), [GET /products/:id](../apps/web/src/lib/products.ts); ảnh/tên/giá, size/topping để Task 5 | [Chi tiết component](../apps/web/src/app/products/[id]/page.test.tsx): loading, dữ liệu không có stock, 404, lỗi/Thử lại, sai sản phẩm |
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
| NFR-01 | UC-05, UC-09: Hiệu năng hệ thống & Xử lý đồng thời có kiểm chứng; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Sequence-01](diagrams/sequence-checkout.svg) | | |
| NFR-02 | UC-04, UC-09, UC-10, UC-11: Bảo mật dữ liệu & Phân quyền (Security, Locking); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Sequence-01](diagrams/sequence-checkout.svg) | | |
| NFR-03 | UC-01..UC-08: Tính khả dụng & Mobile-first PWA tối thiểu; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg) | | |
| NFR-04 | Toàn hệ thống: Khả năng triển khai Docker & CI/CD | | | |

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

[Class-01]: diagrams/class-domain.svg
