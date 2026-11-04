# Ma trận truy vết

Cập nhật dần theo từng task: yêu cầu → use-case / user story → thiết kế / sơ đồ → code / API → test.

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | UC-01: Xem danh mục đồ uống (Menu) | docs/diagrams/usecase-overview.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | | |
| FR-02 | UC-02: Xem chi tiết & tùy chọn (Size/Topping) | docs/diagrams/usecase-overview.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | | |
| FR-03 | UC-03: Quản lý giỏ hàng (Cart); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg) | | |
| FR-04 | UC-04: Đăng ký & Đăng nhập (JWT); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | | |
| FR-05 | UC-05: Đặt đơn hàng (Giữ nguyên liệu 15p); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | | |
| FR-06 | UC-09: Quản lý & giữ tồn kho theo nguyên liệu, UC-14: Theo dõi tồn kho nguyên liệu & Cảnh báo; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | | |
| FR-07 | UC-06: Chuyển khoản qua Ngân hàng giả lập (QR), UC-10: Ghi nhận sao kê & Tự động hoàn tiền; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | | |
| FR-08 | UC-10: Ghi nhận sao kê, UC-11: Đối chiếu sao kê & Xác nhận thanh toán; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | | |
| FR-09 | UC-08: Hủy đơn hàng / Gửi yêu cầu hủy, UC-12: Duyệt yêu cầu hủy đơn & Hoàn tiền; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Class-01] | | |
| FR-10 | UC-05, UC-08, UC-11, UC-12: Máy trạng thái đơn & Tự hủy quá hạn; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | | |
| FR-11 | UC-13: Cập nhật tiến trình pha chế (Bảng Barista) | docs/diagrams/usecase-overview.png; [Class-01] | | |
| FR-12 | UC-07: Theo dõi trạng thái đơn & Lịch sử cá nhân, UC-15: Tra cứu lịch sử mọi đơn & Sao kê | docs/diagrams/usecase-overview.png; [Class-01] | | |
| FR-13 | UC-05, UC-11: Khuyến mãi (Voucher) & Điểm thưởng; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg); [Class-01] | | |
| FR-14 | UC-16: Quản lý menu, giá & nhập kho nguyên liệu (Won't) | docs/diagrams/usecase-overview.png | | |
| FR-15 | UC-17: Đổi điểm thưởng lấy voucher / đồ uống (Won't) | docs/diagrams/usecase-overview.png | | |
| NFR-01 | UC-05, UC-09: Hiệu năng hệ thống & Xử lý đồng thời có kiểm chứng; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg) | | |
| NFR-02 | UC-04, UC-09, UC-10, UC-11: Bảo mật dữ liệu & Phân quyền (Security, Locking); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Activity-01](diagrams/activity-checkout.svg) | | |
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

## Class-01 (Task 2.3)

Bản nháp thiết kế cho Issue #9; chưa nghiệm thu hoặc thay thế bằng chứng code/test A2.

- Nguồn: [class-domain.puml](diagrams/class-domain.puml), gồm hai view.
- Hình lớp: [SVG](diagrams/class-domain.svg), [PNG](diagrams/class-domain.png).
- Enum: [Class-01b](diagrams/class-domain-enums.svg), [PNG](diagrams/class-domain-enums.png).
- Thuyết minh: [class.tex](diagrams/class.tex).
- LoyaltyTransaction là lớp suy ra từ Order, chưa có bảng riêng trong A1.
- Đã đối chiếu Task 1.1 và đồng bộ main c78780e. Đã đọc bản nháp sequence Task 2.2 tại 0b9a7e4; cần thống nhất tên trường/bảng trước nghiệm thu: `paymentExpiresAt` → `expiresAt`, `totalPrice` → `total`, `bank_statements` → `bank_transactions`, `committed = true` → trạng thái lượt mã `USED` theo code A1 hiện có.

[Class-01]: diagrams/class-domain.svg
