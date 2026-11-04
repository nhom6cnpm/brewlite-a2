# Ma trận truy vết

Cập nhật dần theo từng task: yêu cầu → use-case / user story → thiết kế / sơ đồ → code / API → test.

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | UC-01: Xem danh mục đồ uống (Menu) | docs/diagrams/usecase-overview.png | | |
| FR-02 | UC-02: Xem chi tiết & tùy chọn (Size/Topping) | docs/diagrams/usecase-overview.png | | |
| FR-03 | UC-03: Quản lý giỏ hàng (Cart); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-04 | UC-04: Đăng ký & Đăng nhập (JWT); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-05 | UC-05: Đặt đơn hàng (Giữ nguyên liệu 15p); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-06 | UC-09: Quản lý & giữ tồn kho theo nguyên liệu, UC-14: Theo dõi tồn kho nguyên liệu & Cảnh báo; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-07 | UC-06: Chuyển khoản qua Ngân hàng giả lập (QR), UC-10: Ghi nhận sao kê & Tự động hoàn tiền; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-08 | UC-10: Ghi nhận sao kê, UC-11: Đối chiếu sao kê & Xác nhận thanh toán; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-09 | UC-08: Hủy đơn hàng / Gửi yêu cầu hủy, UC-12: Duyệt yêu cầu hủy đơn & Hoàn tiền; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png | | |
| FR-10 | UC-05, UC-08, UC-11, UC-12: Máy trạng thái đơn & Tự hủy quá hạn; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-11 | UC-13: Cập nhật tiến trình pha chế (Bảng Barista) | docs/diagrams/usecase-overview.png | | |
| FR-12 | UC-07: Theo dõi trạng thái đơn & Lịch sử cá nhân, UC-15: Tra cứu lịch sử mọi đơn & Sao kê | docs/diagrams/usecase-overview.png | | |
| FR-13 | UC-05, UC-11: Khuyến mãi (Voucher) & Điểm thưởng; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-overview.png, docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| FR-14 | UC-16: Quản lý menu, giá & nhập kho nguyên liệu (Won't) | docs/diagrams/usecase-overview.png | | |
| FR-15 | UC-17: Đổi điểm thưởng lấy voucher / đồ uống (Won't) | docs/diagrams/usecase-overview.png | | |
| NFR-01 | UC-05, UC-09: Hiệu năng hệ thống & Xử lý đồng thời có kiểm chứng; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| NFR-02 | UC-04, UC-09, UC-10, UC-11: Bảo mật dữ liệu & Phân quyền (Security, Locking); UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png; [Sequence-01](diagrams/sequence-checkout.svg) | | |
| NFR-03 | UC-01..UC-08: Tính khả dụng & Mobile-first PWA tối thiểu; UC-CK: Đặt và thanh toán đơn hàng (Task 1.3) | docs/diagrams/usecase-checkout.png | | |
| NFR-04 | Toàn hệ thống: Khả năng triển khai Docker & CI/CD | | | |

### Sequence-01 — Task 2.2

Sơ đồ tuần tự mô hình hóa 4 giai đoạn đặt và thanh toán đơn hàng giữa 6 thành phần (Khách hàng, Next.js UI, NestJS API, PostgreSQL DB, Mock Bank, Nhân viên ADMIN) với đầy đủ các nhánh: DTO/JWT validation, kiểm tra Idempotency-Key chống tạo trùng, tính lại giá, giữ kho nguyên liệu bằng optimistic locking, QR thanh toán, đối chiếu xác nhận (pessimistic locking), từ chối và tự động hoàn tiền (REFUND), thử lại trên cùng đơn, và tự hủy quá hạn 15 phút[cite: 8].

- [Nguồn PlantUML](diagrams/sequence-checkout.puml)
- [Ảnh SVG](diagrams/sequence-checkout.svg) · [Ảnh PNG](diagrams/sequence-checkout.png)
- [Thuyết minh LaTeX](diagrams/sequence.tex)

Liên kết thiết kế thể hiện phạm vi được mô hình hóa; không xác nhận code/API hoặc kiểm thử đã được triển khai.
