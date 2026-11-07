# ADR-005: Idempotency-Key và cơ chế khóa (optimistic locking cho tồn kho, pessimistic locking cho xác nhận thanh toán)

- **Trạng thái:** Đã chấp nhận

## Bối cảnh

Ba tình huống có thể gây sai nghiệp vụ:

- Khách bấm đúp hoặc mạng chậm làm yêu cầu tạo đơn hoặc thanh toán bị gửi nhiều lần, dẫn tới đơn trùng, thanh toán trùng.
- Nhiều khách đặt đồng thời món chỉ còn đủ nguyên liệu cho một ly (NFR-01: 20 yêu cầu cùng lúc thì chỉ một đơn thành công), dẫn tới bán vượt tồn kho nếu trừ kho không an toàn.
- Hai nhân viên cùng xác nhận một thanh toán hoặc cùng hoàn tiền một đơn (FR-08), dẫn tới xử lý lặp hoặc hoàn tiền hai lần.

Một đơn có thể được thanh toán lại nhiều lần khi lỗi, nên không thể chống trùng bằng chính mã đơn.

## Quyết định

1. **Idempotency-Key** bắt buộc cho `POST /orders` và `POST /payments`. Khóa được lưu **vĩnh viễn theo từng tài khoản** (không giới hạn 15 phút). Gửi lại cùng khóa với cùng dữ liệu thì trả về đúng đơn hoặc phiên thanh toán cũ, không tạo mới. Với `POST /orders`, gửi lại cùng khóa nhưng khác dữ liệu giỏ hàng thì bị từ chối (HTTP 409).
2. **Optimistic locking** (cột phiên bản) khi giữ/trừ nguyên liệu trong giao dịch tạo đơn: nếu hai đơn cùng tranh nguyên liệu cuối thì chỉ một đơn thành công, đơn còn lại bị từ chối vì không đủ nguyên liệu.
3. **Pessimistic locking** (khóa dòng cơ sở dữ liệu, ví dụ `SELECT ... FOR UPDATE`) trên đơn và phiên thanh toán khi nhân viên xác nhận, từ chối hoặc hoàn tiền, kèm kiểm tra trạng thái và số tiền của đơn. Người đến sau thấy trạng thái đã đổi nên không xử lý lặp.

## Hệ quả

**Được:**

- Không có đơn trùng, thanh toán trùng do gửi lặp.
- Không bán vượt tồn kho khi nhiều khách đặt cùng lúc.
- Không xác nhận hoặc hoàn tiền hai lần khi hai nhân viên thao tác đồng thời.

**Mất:**

- Frontend phải sinh và giữ Idempotency-Key đúng cách (mỗi thao tác một khóa, thử lại thì dùng lại khóa).
- Khóa lưu vĩnh viễn nên bảng lưu khóa tăng dần theo thời gian.
- Với tồn kho, đơn thua cuộc nhận lỗi và khách phải đặt lại.
- Khóa dòng làm yêu cầu đến sau phải chờ trong thời gian ngắn của giao dịch xác nhận; chấp nhận được vì số nhân viên ít.

## Phương án đã cân nhắc

- **Chống trùng theo mã đơn:** sai nghiệp vụ vì một đơn có thể thanh toán lại nhiều lần khi lỗi.
- **Chỉ dùng optimistic locking cho cả xác nhận và hoàn tiền:** nhẹ nhưng với thao tác liên quan tiền thì ưu tiên chắc chắn là không xử lý lặp, nên dùng khóa dòng.
- **Chỉ dùng pessimistic locking cho tồn kho:** phải khóa nhiều dòng nguyên liệu mỗi lần đặt đơn, dễ chậm và có nguy cơ khóa chéo (deadlock) khi nhiều khách đặt cùng lúc.
- **Khóa phân tán (ví dụ Redis):** thêm hạ tầng và điểm hỏng mà quy mô hiện tại chưa cần.
- **Giới hạn thời gian sống của Idempotency-Key (ví dụ 15 phút):** gọn bảng hơn nhưng khóa hết hạn rồi gửi lại có thể tạo đơn trùng, nên không chọn.
