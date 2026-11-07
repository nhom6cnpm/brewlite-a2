# ADR-002: Backend NestJS chia module theo domain

- **Trạng thái:** Đã chấp nhận

## Bối cảnh

Backend phải xử lý nhiều nghiệp vụ liên quan nhưng khác nhau: xác thực, sản phẩm, tồn kho theo nguyên liệu và công thức, đơn hàng, thanh toán, ngân hàng giả lập, khuyến mãi. Nhóm chia việc theo task, nhiều người cùng sửa backend. Hệ thống phục vụ một cửa hàng duy nhất và triển khai bằng Docker, nên không có nhu cầu scale từng phần riêng.

## Quyết định

Dùng **một ứng dụng NestJS** (modular monolith), chia thành các module theo domain:

`auth`, `products`, `inventory`, `orders`, `payments`, `mock-bank`, `vouchers`.

Mỗi module tự chứa controller, service, entity và DTO của domain mình. Module khác chỉ dùng qua service mà module đó xuất ra, không truy cập thẳng bảng của nhau. Tên module là tên dùng trong class diagram và sequence diagram.

## Hệ quả

**Được:**

- Ranh giới nghiệp vụ rõ, mỗi thành viên phụ trách một module, ít xung đột mã.
- Triển khai đơn giản: một tiến trình, một image Docker.
- Giao dịch giữa các module (ví dụ tạo đơn và giữ chỗ kho) làm được trong cùng một giao dịch cơ sở dữ liệu.
- Nếu sau này cần, có thể tách module thành dịch vụ riêng.

**Mất:**

- Mọi module chạy chung tiến trình: lỗi nặng ở một module có thể ảnh hưởng toàn bộ.
- Không scale riêng từng module được.
- Cần kỷ luật để các module không phụ thuộc vòng tròn.

## Phương án đã cân nhắc

- **Chia theo lớp kỹ thuật (`controllers/`, `services/`, `entities/`):** quen thuộc nhưng một tính năng bị rải khắp nhiều thư mục, khó chia việc và khó đọc khi hệ thống lớn dần.
- **Microservices:** scale và triển khai độc lập, nhưng quá nặng cho một cửa hàng và nhóm sinh viên (nhiều dịch vụ, giao dịch phân tán, CI/CD phức tạp).
- **Một module lớn duy nhất:** nhanh lúc đầu nhưng nhanh chóng khó bảo trì và dễ xung đột khi làm song song.
