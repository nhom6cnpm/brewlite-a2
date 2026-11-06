# ADR-004: Ngân hàng giả lập và nhân viên xác nhận thanh toán

- **Trạng thái:** Đề xuất (chờ review)

## Bối cảnh

Đề không cho tích hợp thanh toán thật, và giảng viên yêu cầu khách **không được tự xác nhận** đã thanh toán. Cũng không có callback từ một cổng thanh toán bên ngoài. Hệ thống vẫn phải thể hiện được luồng quét QR, chuyển tiền, đối chiếu và hoàn tiền.

## Quyết định

Tạo module **`mock-bank`** ("Ngân hàng giả lập") trong backend:

1. Khách quét QR do `mock-bank` sinh theo đơn; QR mở trang chuyển tiền (không cần đăng nhập trên điện thoại), số tiền cố định, nội dung = mã đơn; bấm "Chuyển tiền" để ghi nhận.
2. Khoản chuyển được ghi vào **sao kê** của quán; phiên thanh toán chuyển sang `TRANSFER_RECEIVED`, đơn vẫn `PENDING`.
3. **Nhân viên (`ADMIN`)** đối chiếu sao kê và xác nhận (phiên thành `SUCCESS`, đơn thành `PAID`) hoặc từ chối (phiên thành `FAILED`, đơn thành `PAYMENT_FAILED`, hệ thống tự hoàn tiền và ghi vào sao kê).
4. Thanh toán thẻ là quẹt thẻ tại quầy ngoài hệ thống, không có form nhập thẻ; khi nhân viên xác nhận thì khoản tiền được ghi vào sao kê.
5. Không có callback; trạng thái chỉ đổi do hành động của nhân viên hoặc do đơn hết hạn (đơn đã có tiền về thì không tự hủy).

`payments` làm việc với `mock-bank` qua một giao diện (interface) rõ ràng để sau này có thể thay bằng ngân hàng hoặc cổng thật.

## Hệ quả

**Được:**

- Đúng yêu cầu của giảng viên, khách không tự đánh dấu đã thanh toán.
- Không phụ thuộc dịch vụ bên ngoài, chạy và kiểm thử được hoàn toàn cục bộ.
- Có sao kê để nhân viên đối chiếu và để kiểm tra hoàn tiền.

**Mất:**

- Nhân viên phải đối chiếu thủ công, thanh toán không tự động hoàn tất.
- Hành vi khác cổng thật (không có callback, không có chữ ký giao dịch) nên chuyển sang cổng thật sẽ phải làm thêm.
- Cần xử lý sai lệch: khách chuyển sai số tiền hoặc sai nội dung, chuyển trùng.

## Phương án đã cân nhắc

- **Khách tự bấm "đã thanh toán":** đơn giản nhưng trái yêu cầu của giảng viên.
- **Giả lập callback (webhook) tự động xác nhận:** gần cổng thật hơn nhưng bỏ vai trò xác nhận của nhân viên.
- **Dùng môi trường sandbox của một cổng thanh toán thật:** thực tế hơn nhưng phụ thuộc dịch vụ ngoài, cần đăng ký và khóa bí mật, nằm ngoài phạm vi của đề tài.
