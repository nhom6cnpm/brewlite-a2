# Task 1.1 – Bối cảnh, stakeholder và phạm vi

## 1. Vấn đề nghiệp vụ

### 1.1. Bối cảnh

Tại các quán cà phê, việc gọi đồ uống hiện chủ yếu diễn ra trực tiếp tại quầy: khách xếp hàng, đọc menu giấy hoặc bảng menu, nói món và tùy chọn (size, topping) cho nhân viên rồi thanh toán tại chỗ. Cách làm này nảy sinh các vấn đề sau:

| Mã | Vấn đề | Hệ quả |
|----|--------|--------|
| P-01 | Khách phải xếp hàng, nhất là giờ cao điểm | Mất thời gian, bỏ về, giảm doanh thu |
| P-02 | Gọi món bằng lời, ghi tay; tùy chọn dễ bị nhớ sai hoặc truyền đạt thiếu | Pha sai món, khiếu nại, lãng phí nguyên liệu |
| P-03 | Khách không biết đơn của mình đang ở bước nào | Đứng chờ, hỏi nhân viên nhiều lần |
| P-04 | Thanh toán thủ công, tách rời khâu gọi món | Chậm, dễ nhầm lẫn khi đối chiếu đơn - tiền |
| P-05 | Tồn kho không gắn với món bán ra; món vẫn được nhận dù đã hết nguyên liệu | Nhận đơn không thực hiện được, khách thất vọng |

### 1.2. Vấn đề BrewLite cần giải quyết

BrewLite cần giúp khách hàng **tự đặt đồ uống và thanh toán trên điện thoại** mà không phải xếp hàng, đồng thời giúp cửa hàng **nhận đúng đơn, đúng tùy chọn** và **chỉ bán những món còn đủ nguyên liệu**. Cụ thể, hệ thống phải giải quyết trọn vẹn một luồng khép kín:

> menu → tùy chọn → giỏ hàng → đặt đơn → thanh toán → theo dõi đơn

và kiểm soát tồn kho **theo nguyên liệu và công thức** (mỗi món tiêu hao một lượng nguyên liệu xác định; khi nguyên liệu không đủ thì món không thể đặt).

### 1.3. Tầm nhìn sản phẩm

> **Dành cho** khách hàng của quán cà phê muốn gọi món nhanh và chủ động, **BrewLite** là ứng dụng web đặt đồ uống cho phép chọn món, tùy chỉnh, thanh toán bằng mã QR và theo dõi tiến độ đơn ngay trên điện thoại. **Khác với** cách gọi món tại quầy, BrewLite loại bỏ việc xếp hàng, giảm sai sót tùy chọn và tự động khớp tồn kho nguyên liệu với món được bán.

Mục tiêu của phiên bản hiện tại (MVP) là chứng minh luồng đặt - thanh toán - theo dõi chạy xuyên suốt, với cổng thanh toán giả lập, trong khuôn khổ Bài tập lớn môn Công nghệ phần mềm.

## 2. Stakeholder

| Stakeholder | Vai trò | Mục tiêu | Kỳ vọng |
|---------------|---------|----------|---------|
| **Khách hàng** | Người dùng cuối: duyệt menu, chọn tùy chọn, đặt đơn, thanh toán, theo dõi đơn | Đặt đồ uống nhanh, không xếp hàng, nhận đúng món mình chọn | Menu rõ ràng, giá minh bạch; tùy chọn size/topping dễ dùng; giỏ hàng không mất khi tải lại trang; thanh toán QR đơn giản; thấy trạng thái đơn cập nhật |
| **Nhân viên quầy/Barista** | Nhận đơn đã thanh toán và chuẩn bị đồ uống | Nhận đủ thông tin đơn (món, tùy chọn, số lượng), pha đúng và kịp | Danh sách đơn rõ ràng, thứ tự hợp lý; cập nhật trạng thái đơn nhanh, ít thao tác (màn hình barista thuộc phạm vi mở rộng) |
| **Quản lý cửa hàng** | Giám sát vận hành; chịu trách nhiệm menu, nguyên liệu, công thức | Không bán món đã hết nguyên liệu; nắm được các đơn và doanh thu | Tồn kho tự động trừ theo công thức khi bán; có nơi quản lý menu/nguyên liệu (trang quản trị thuộc phạm vi mở rộng) |
| **Giảng viên / khách hàng nghiệm thu** | Người đánh giá sản phẩm và người dùng thử hệ thống | Xác nhận sản phẩm đáp ứng yêu cầu, luồng nghiệp vụ chạy trọn vẹn | Demo ổn định từ đầu đến cuối; tài liệu yêu cầu rõ ràng, truy vết được; phản hồi dùng thử được ghi nhận |
| **Nhóm phát triển** | Phân tích, thiết kế, hiện thực, kiểm thử và bàn giao | Hoàn thành đúng hạn, phạm vi vừa sức, mã nguồn qua review | Yêu cầu và phạm vi rõ, ổn định; thống nhất hợp đồng API và dữ liệu dùng chung giữa các task; quy trình Pull Request có người review |
| **Đơn vị thanh toán** | Xử lý giao dịch và trả kết quả thanh toán cho hệ thống | Giao dịch hợp lệ, đối chiếu được với đơn hàng | Nhận yêu cầu đúng định dạng (mã đơn, số tiền); trả kết quả thành công/thất bại/hết hạn rõ ràng. Ở MVP là cổng giả lập có QR, giao diện đủ gần thực tế để sau này thay bằng cổng thật |

## 3. Phạm vi

### 3.1. Trong phạm vi MVP (in-scope)

| Mã | Chức năng | Mô tả ngắn |
|----|-----------|------------|
| IS-01 | Menu | Xem danh sách đồ uống (hình, tên, giá) và trang chi tiết sản phẩm |
| IS-02 | Tùy chọn | Chọn size, topping (và các tùy chọn khác nếu có) cho từng món; giá tự cập nhật theo tùy chọn |
| IS-03 | Giỏ hàng | Thêm/sửa/xóa dòng hàng, đổi số lượng, xem tổng tiền; giỏ được lưu lại khi tải lại trang |
| IS-04 | Đặt đơn | Tạo đơn từ giỏ hàng, kiểm tra tính hợp lệ (món/tùy chọn/tồn kho) trước khi xác nhận |
| IS-05 | Thanh toán | Thanh toán qua cổng thanh toán giả lập bằng Ví (QR) / Thẻ (thẻ giả lập); xử lý các kết quả thành công, thất bại, hết hạn; cho phép thử lại khi thanh toán lỗi |
| IS-06 | Theo dõi đơn | Khách xem trạng thái đơn theo tiến trình (ví dụ: đã tiếp nhận → đang pha chế → sẵn sàng → hoàn tất) |
| IS-07 | Tồn kho theo nguyên liệu & công thức | Mỗi món có công thức tiêu hao nguyên liệu; nguyên liệu được trừ (giữ chỗ) ngay khi tạo đơn; hoàn lại kho khi đơn bị hủy hoặc hết hạn thanh toán (đơn chưa thanh toán tự hủy sau thời gian cấu hình, mặc định 5 phút); không bán vượt khi đặt đồng thời; món không đủ nguyên liệu không thể đặt |
| IS-08 | Cổng thanh toán giả lập | Mô-đun mô phỏng cổng thanh toán: sinh mã QR theo đơn, mô phỏng thanh toán bằng thẻ giả lập và việc xác nhận thanh toán |
| IS-09 | Đăng ký / đăng nhập | Đăng ký và đăng nhập bằng email và mật khẩu, xác thực bằng JWT; đặt đơn và xem đơn yêu cầu đã đăng nhập |
| IS-10 | Lịch sử đơn | Khách đã đăng nhập xem lại danh sách và chi tiết các đơn đã đặt |
| IS-11 | Khuyến mãi và điểm thưởng | Áp dụng khuyến mãi khi đặt đơn; tích và dùng điểm thưởng; mô hình lớp có Khuyến mãi và Giao dịch trung thành |
| IS-12 | Triển khai sản xuất | Triển khai trên môi trường sản xuất với HTTPS, CI/CD và health check; đóng gói bằng Docker |
### 3.2. Phạm vi mở rộng 

| Mã | Hạng mục | Ghi chú |
|----|----------|---------|
| EX-01 | Màn hình barista | Hiển thị hàng đợi đơn và cho phép đổi trạng thái đơn |
| EX-02 | Trang quản trị | Quản lý menu, nguyên liệu, công thức, xem danh sách đơn |
| EX-03 | PWA đầy đủ | Cài đặt lên màn hình chính, hoạt động ổn định khi mạng yếu, (tùy chọn) thông báo |

Các hạng mục mở rộng chỉ được làm khi toàn bộ MVP đã hoàn thành và được review.

### 3.3. Không thực hiện (Out-of-scope)

| Mã | Hạng mục | Lý do |
|----|----------|-------|
| OS-01 | Thanh toán thật (kết nối ngân hàng/ví điện tử) | Cần hợp đồng, bảo mật, tuân thủ quy định; ngoài khả năng của đề tài |
| OS-02 | Thanh toán tiền mặt | Cần quy trình thu ngân và đối soát tại quầy |
| OS-03 | Giao hàng | Cần quản lý địa chỉ, phí ship, shipper |
| OS-04 | Nhiều chi nhánh | Cần phân tách tồn kho, menu và báo cáo theo chi nhánh |
| OS-05 | Ứng dụng native (iOS/Android) | Dùng web responsive/PWA thay thế |
| OS-06 | Hoàn tiền | Phụ thuộc thanh toán thật và quy trình xử lý khiếu nại |

## 4. Giả định 

| Mã | Giả định | Nếu sai thì |
|----|----------|-------------|
| A-01 | Hệ thống phục vụ **một cửa hàng duy nhất**; chỉ có một menu và một kho nguyên liệu | Phải thiết kế lại mô hình dữ liệu cho nhiều chi nhánh |
| A-02 | Khách hàng dùng trình duyệt hiện đại trên điện thoại hoặc máy tính, có kết nối Internet | Phải bổ sung hỗ trợ ngoại tuyến hoặc trình duyệt cũ |
| A-03 | Menu, nguyên liệu và công thức được **nhập sẵn (seed)** vào hệ thống; MVP chưa có giao diện quản trị để chỉnh sửa | Phải đưa trang quản trị vào MVP |
| A-04 | Mỗi món có **một công thức cố định**; size/topping chỉ thay đổi lượng nguyên liệu và giá theo quy tắc đã định | Công thức cần mô hình hóa phức tạp hơn |
| A-05 | Cổng thanh toán giả lập luôn phản hồi được và mô phỏng đủ các kết quả thành công, thất bại, hết hạn | Luồng thanh toán phải xử lý thêm lỗi kết nối/không phản hồi |
| A-06 | Khách **phải đăng ký/đăng nhập (email + mật khẩu, JWT)** để đặt đơn; mỗi đơn gắn với một tài khoản và một mã đơn để theo dõi | Luồng đặt đơn và API `POST /orders` phải thay đổi theo cơ chế định danh khác  |
| A-07 | Tiền tệ duy nhất là VND, ngôn ngữ giao diện là tiếng Việt | Phải bổ sung đa tiền tệ/đa ngôn ngữ |
| A-08 | Nhân viên pha chế nhận và xử lý đơn ngay khi đơn được thanh toán; trong MVP việc đổi trạng thái có thể thực hiện qua API hoặc công cụ tạm | Cần đưa màn hình barista vào MVP |

## 5. Ràng buộc 

| Mã | Ràng buộc | Loại |
|----|-----------|------|
| C-01 | Phải hoàn thành trong thời gian của học kỳ và theo các mốc nộp của môn Công nghệ phần mềm | Thời gian |
| C-02 | Nhóm phát triển là sinh viên, nhân lực hạn chế, làm song song với các môn học khác | Nhân lực |
| C-03 | Công nghệ: frontend Next.js (mobile-first/PWA), backend NestJS, cơ sở dữ liệu PostgreSQL; đóng gói bằng Docker, có CI/CD và HTTPS. Frontend dùng thêm TailwindCSS, React Query, Zustand | Kỹ thuật |
| C-04 | Không sử dụng dịch vụ thanh toán thật và không xử lý dữ liệu thẻ/tài khoản ngân hàng thật; chỉ dùng cổng giả lập | Pháp lý / Bảo mật |
| C-05 | Mọi thay đổi mã nguồn và tài liệu phải đi qua issue → nhánh riêng → Pull Request, có ít nhất một người review trước khi vào nhánh `main` | Quy trình |
| C-06 | Tài liệu Task 1–3 viết bằng LaTeX, chỉ dùng các gói thông dụng (`booktabs`, `tabularx`, `longtable`); các tài liệu đề bắt buộc dạng Markdown (như `context-and-scope.md`) vẫn phải có với nội dung giống bản `.tex` | Tài liệu |
| C-07 | Các task phụ thuộc nhau phải dùng chung định dạng dữ liệu (ví dụ cấu trúc dòng giỏ hàng, hàm tính giá theo tùy chọn) | Tích hợp |
| C-08 | Phạm vi chức năng phải khớp với các task nhóm đang thực hiện ở Bài tập 1 | Phạm vi |
| C-09 | Mật khẩu người dùng phải được băm (hash) trước khi lưu, không lưu dạng rõ | Bảo mật |
| C-10 | Thông tin bí mật (khóa JWT, mật khẩu cơ sở dữ liệu, khóa dịch vụ) không được đưa vào repo; cấu hình qua biến môi trường | Bảo mật |
| C-11 | Cơ sở dữ liệu trên môi trường sản xuất không mở công khai ra Internet; chỉ backend truy cập được | Bảo mật |
| C-12 | Thời gian phản hồi của API dưới 500 ms | Hiệu năng |

## 6. Rủi ro ban đầu

Khả năng và Ảnh hưởng được đánh giá theo ba mức: Thấp / Trung bình / Cao.

| Mã | Rủi ro | Khả năng | Ảnh hưởng | Cách giảm thiểu |
|----|--------|---|---|----------------------|
| R-01 | Phạm vi phình to (thêm tính năng ngoài MVP) làm trễ hạn | Trung bình | Cao | Chốt phạm vi trong tài liệu này; hạng mục mở rộng chỉ làm sau khi MVP xong; mọi thay đổi phạm vi phải được nhóm trưởng đồng ý |
| R-02 | Các task chồng chéo, xung đột mã khi cùng sửa một tệp (ví dụ thành phần dùng chung như Header) | Cao | Trung bình | Báo nhau trước khi sửa tệp dùng chung; mỗi task một nhánh; commit nhỏ; rebase/merge `main` thường xuyên |
| R-03 | Không thống nhất định dạng dữ liệu giữa các task (dòng giỏ hàng, tùy chọn, giá) | Trung bình | Cao | Thống nhất và ghi lại hợp đồng dữ liệu sớm; dùng chung hàm tính giá; review chéo khi tích hợp |
| R-04 | Sai lệch tồn kho: hai đơn cùng giữ chỗ nốt nguyên liệu cuối, đơn hủy/hết hạn không được hoàn lại kho hoặc công thức nhập sai | Trung bình | Trung bình | Kiểm tra và trừ kho trong cùng một giao dịch ở backend; tác vụ tự hủy đơn hết hạn (mặc định 5 phút) phải hoàn kho; seed công thức có kiểm tra lại; viết kiểm thử cho kịch bản hết nguyên liệu và hết hạn thanh toán |
| R-05 | Cổng thanh toán giả lập không phản ánh đúng hành vi cổng thật (ví dụ trễ, thanh toán trùng, hết hạn) | Trung bình | Trung bình | Thiết kế giao diện cổng giả lập gần với cổng thật; mô phỏng đủ các trạng thái thành công/thất bại/hết hạn; xử lý idempotent theo Idemotency-Key của từng lần thanh toán (không theo mã đơn) |
| R-06 | Thành viên thiếu thời gian hoặc nghẽn ở khâu review | Trung bình | Cao | Chia task nhỏ; đặt hạn review ngắn; có người dự phòng cho mỗi khâu; báo sớm khi bị vướng |
| R-07 | Yêu cầu hiểu khác nhau giữa các thành viên và người đánh giá | Trung bình | Trung bình | Viết yêu cầu rõ, có mã truy vết; review tài liệu qua Pull Request; xác nhận lại với giảng viên khi chưa rõ |
| R-08 | Thiếu thời gian để làm các hạng mục mở rộng (barista, quản trị, PWA) | Cao | Thấp | Đã xếp vào phạm vi mở rộng; MVP vẫn trọn vẹn nếu không làm |
