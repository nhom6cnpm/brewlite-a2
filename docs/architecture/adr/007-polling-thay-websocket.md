# ADR-007: Polling thay cho WebSocket để cập nhật trạng thái

- **Trạng thái:** Đã chấp nhận

## Bối cảnh

Khách cần thấy trạng thái đơn thay đổi (`PENDING`, `PAID`, `PREPARING`, `READY`, `COMPLETED`...), và nhân viên cần thấy khoản chuyển mới trong sao kê và đơn mới. Không có callback từ cổng thanh toán, trạng thái chỉ đổi do hành động của nhân viên. Số người dùng đồng thời nhỏ (một cửa hàng), và hệ thống phải dễ triển khai sau HTTPS.

## Quyết định

Frontend **tự làm mới định kỳ (polling)** các API trạng thái thay vì dùng WebSocket. Tab Thanh toán của trang quản trị làm mới mỗi 4 giây, kèm thông báo và âm báo khi có tiền về; màn hình theo dõi đơn của khách làm mới định kỳ vài giây và báo khi đồ uống sẵn sàng. Chỉ polling ở các màn hình cần theo dõi và dừng khi rời màn hình. Cơ chế realtime (WebSocket/SSE) thuộc phạm vi mở rộng.

## Hệ quả

**Được:**

- Đơn giản: chỉ dùng HTTP thông thường, không cần thêm hạ tầng hay cổng kết nối kéo dài.
- Dễ triển khai và kiểm thử, hoạt động tốt qua HTTPS và proxy.
- Tận dụng sẵn cơ chế gọi lại API định kỳ ở frontend, không cần cổng kết nối riêng.

**Mất:**

- Cập nhật có độ trễ bằng một chu kỳ polling, không tức thời.
- Tạo tải thừa lên API khi nhiều người cùng mở màn hình theo dõi.
- Nếu số người dùng tăng mạnh thì phải chuyển sang cơ chế đẩy.

## Phương án đã cân nhắc

- **WebSocket / Socket.IO:** tức thời nhưng cần quản lý kết nối, mở rộng và xác thực kênh, quá nặng cho quy mô hiện tại.
- **Server-Sent Events:** nhẹ hơn WebSocket nhưng vẫn là kết nối kéo dài cần xử lý ở tầng triển khai.
- **Thông báo đẩy (Web Push) của PWA:** hữu ích khi khách rời ứng dụng nhưng thuộc phạm vi mở rộng (PWA đầy đủ).
