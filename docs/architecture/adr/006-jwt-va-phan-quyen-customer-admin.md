# ADR-006: JWT và phân quyền CUSTOMER / ADMIN

- **Trạng thái:** Đề xuất (chờ review)

## Bối cảnh

Khách hàng phải đăng ký / đăng nhập (email + mật khẩu) mới đặt được đơn. Trang quản trị (sao kê, xác nhận thanh toán, duyệt hủy, pha chế, xem nguyên liệu) chỉ dành cho nhân viên. Backend NestJS và frontend Next.js là hai ứng dụng tách biệt, giao tiếp qua API.

## Quyết định

- Đăng nhập bằng email và mật khẩu; mật khẩu được **băm một chiều bằng `bcrypt`** (salt rounds từ 10 trở lên) trước khi lưu, không lưu mật khẩu thô.
- Sau khi đăng nhập, server cấp **JWT** với hạn sử dụng cấu hình từ biến môi trường; frontend gửi kèm trong header `Authorization` ở mỗi yêu cầu.
- Có hai vai trò: **`CUSTOMER`** và **`ADMIN`**. Guard của NestJS kiểm tra token và vai trò; các endpoint của trang quản trị chỉ cho `ADMIN` (người dùng thường bị từ chối với HTTP 403). Khách không tự đăng ký được tài khoản `ADMIN`; tài khoản nhân viên được khởi tạo sẵn từ biến môi trường.
- Khóa ký JWT lấy từ biến môi trường, không nằm trong repo.

## Hệ quả

**Được:**

- Server không phải lưu phiên, dễ chạy nhiều bản API sau này.
- Phân quyền tập trung ở guard, dễ kiểm tra và dễ viết kiểm thử.
- Phù hợp kiến trúc web và API tách rời, dùng được cho cả PWA.

**Mất:**

- Khó thu hồi token trước khi hết hạn.
- Cách lưu token ở trình duyệt cần cân nhắc vì liên quan rủi ro XSS.
- Phải quản lý bí mật ký token và thời hạn token cẩn thận.

## Phương án đã cân nhắc

- **Session và cookie phía server:** thu hồi dễ hơn nhưng cần lưu phiên phía server, bất tiện khi frontend và API chạy tách biệt.
- **Đăng nhập qua bên thứ ba (OAuth):** không cần quản lý mật khẩu nhưng thêm phụ thuộc và cấu hình, ngoài phạm vi MVP.
