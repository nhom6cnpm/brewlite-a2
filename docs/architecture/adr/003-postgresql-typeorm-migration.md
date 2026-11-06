# ADR-003: PostgreSQL với TypeORM và migration tự chạy khi khởi động

- **Trạng thái:** Đề xuất (chờ review)

## Bối cảnh

Đề bài bắt buộc dùng PostgreSQL. Dữ liệu có quan hệ chặt (đơn – dòng đơn – thanh toán – sao kê – kho nguyên liệu) và cần giao dịch để đảm bảo nhất quán, ví dụ khi giữ chỗ kho hoặc hoàn tiền. Nhóm cần cùng một schema ở máy cá nhân, CI và môi trường triển khai.

## Quyết định

- Dùng **PostgreSQL** làm cơ sở dữ liệu duy nhất.
- Truy cập dữ liệu bằng **TypeORM** (entity trong từng module).
- Thay đổi schema chỉ thông qua **migration**; migration **tự chạy khi API khởi động**.
- Cấu hình kết nối lấy từ biến môi trường (mẫu trong `.env.example`).

## Hệ quả

**Được:**

- Schema có phiên bản, mọi môi trường giống nhau, dựng mới chỉ cần khởi động ứng dụng.
- Có giao dịch ACID cho các thao tác nhiều bước (đặt đơn, hoàn tiền).
- Thành viên mới chạy được hệ thống bằng Docker mà không phải chạy tay lệnh migration.

**Mất:**

- Migration tự chạy khi khởi động có rủi ro nếu nhiều bản API khởi động cùng lúc hoặc migration lỗi giữa chừng khiến ứng dụng không lên được. Chấp nhận được vì hiện chỉ chạy một bản API.
- Phải viết và review migration cẩn thận; không được sửa migration đã áp dụng.
- TypeORM có hạn chế với truy vấn phức tạp, khi cần phải viết truy vấn thô.

## Phương án đã cân nhắc

- **`synchronize: true` của TypeORM:** tiện khi phát triển nhưng có thể làm mất dữ liệu trên môi trường thật, không có lịch sử thay đổi.
- **Chạy migration bằng bước riêng trong CI/CD:** an toàn hơn khi có nhiều bản API, nhưng thêm bước vận hành mà quy mô hiện tại chưa cần.
- **Prisma hoặc truy vấn thô:** không chọn để giữ thống nhất với hệ sinh thái NestJS + TypeORM mà nhóm đang dùng.
- **Cơ sở dữ liệu khác:** không phù hợp vì đề bắt buộc PostgreSQL.
