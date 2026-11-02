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

và kiểm soát tồn kho **theo nguyên liệu và công thức** (mỗi món tiêu hao một lượng nguyên liệu xác định; khi nguyên liệu không đủ thì món không thể đặt). Việc xác nhận thanh toán thuộc về nhân viên cửa hàng, khách không được tự đánh dấu đơn đã thanh toán.

### 1.3. Tầm nhìn sản phẩm

> **Dành cho** khách hàng của quán cà phê muốn gọi món nhanh và chủ động, **BrewLite** là ứng dụng web đặt đồ uống cho phép chọn món, tùy chỉnh, thanh toán bằng mã QR và theo dõi tiến độ đơn ngay trên điện thoại. **Khác với** cách gọi món tại quầy, BrewLite loại bỏ việc xếp hàng, giảm sai sót tùy chọn, giúp nhân viên đối chiếu tiền với đơn qua sao kê và tự động khớp tồn kho nguyên liệu với món được bán.

Mục tiêu của phiên bản hiện tại (MVP) là chứng minh luồng đặt - thanh toán - theo dõi chạy xuyên suốt, với ngân hàng giả lập, nhân viên xác nhận thanh toán và trang quản trị cho nhân viên, trong khuôn khổ Bài tập lớn môn Công nghệ phần mềm.

## 2. Stakeholder

| Stakeholder | Vai trò | Mục tiêu | Kỳ vọng |
|---------------|---------|----------|---------|
| **Khách hàng** | Người dùng cuối: đăng nhập, duyệt menu, chọn tùy chọn, đặt đơn, thanh toán, theo dõi và hủy đơn | Đặt đồ uống nhanh, không xếp hàng, nhận đúng món mình chọn | Menu rõ ràng, giá minh bạch; tùy chọn size/topping dễ dùng; giỏ hàng không mất khi tải lại trang; thanh toán bằng cách quét QR rồi chuyển tiền (số tiền cố định, nội dung = mã đơn) hoặc quẹt thẻ tại quầy; thấy trạng thái đơn cập nhật; hủy đơn theo quy tắc rõ ràng; xem lịch sử đơn, dùng voucher và tích điểm |
| **Nhân viên quầy/Barista** | Dùng trang quản trị (`ADMIN`): kiểm tra sao kê, xác nhận hoặc từ chối thanh toán, duyệt yêu cầu hủy, pha chế đơn | Biết chắc đơn nào đã thanh toán, nhận đủ thông tin đơn (món, tùy chọn, số lượng), pha đúng và kịp, không bỏ sót đơn| Sao kê rõ ràng, đối chiếu được theo mã đơn; bảng pha chế theo trạng thái `PAID` → `PREPARING` → `READY` → `COMPLETED`; xác nhận/từ chối thanh toán ít thao tác, từ chối thì hệ thống tự hoàn tiền |
| **Quản lý cửa hàng** | Giám sát vận hành qua trang quản trị (`ADMIN`); chịu trách nhiệm menu, nguyên liệu, công thức | Không bán món đã hết nguyên liệu; nắm được thanh toán, đơn và lịch sử đơn | Tồn kho tự động trừ theo công thức khi bán; xem được nguyên liệu, sao kê, đơn và lịch sử đơn (sửa/nhập kho, quản lý menu, giá, công thức thuộc phạm vi mở rộng) |
| **Giảng viên / khách hàng nghiệm thu** | Người đánh giá sản phẩm và người dùng thử hệ thống | Xác nhận sản phẩm đáp ứng yêu cầu, luồng nghiệp vụ chạy trọn vẹn | Demo ổn định từ đầu đến cuối; thanh toán do nhân viên xác nhận, khách không tự đánh dấu đã thanh toán; tài liệu yêu cầu rõ ràng, truy vết được; phản hồi dùng thử được ghi nhận |
| **Nhóm phát triển** | Phân tích, thiết kế, hiện thực, kiểm thử và bàn giao | Hoàn thành đúng hạn, phạm vi vừa sức, mã nguồn qua review | Yêu cầu và phạm vi rõ, ổn định; thống nhất hợp đồng API và dữ liệu dùng chung giữa các task; quy trình Pull Request có người review |
| **Đơn vị thanh toán** | Mô phỏng ngân hàng: sinh QR theo đơn, nhận khoản chuyển của khách, ghi vào sao kê của quán và thực hiện hoàn tiền | Ghi nhận đúng khoản chuyển (số tiền cố định, nội dung = mã đơn); hoàn tiền chính xác, không trùng | Khoản chuyển hiện trong sao kê, phiên thanh toán chuyển `TRANSFER_RECEIVED` trong khi đơn vẫn `PENDING`; hoàn tiền được ghi vào sao kê; giao diện đủ gần thực tế để sau này thay bằng ngân hàng thật |
## 3. Phạm vi

### 3.1. Trong phạm vi MVP (in-scope)

| Mã | Chức năng | Mô tả ngắn |
|----|-----------|------------|
| IS-01 | Menu | Xem danh sách đồ uống (hình, tên, giá) và trang chi tiết sản phẩm |
| IS-02 | Tùy chọn | Chọn size, topping (và các tùy chọn khác nếu có) cho từng món; giá tự cập nhật theo tùy chọn |
| IS-03 | Giỏ hàng | Thêm/sửa/xóa dòng hàng, đổi số lượng, xem tổng tiền; giỏ được lưu lại khi tải lại trang |
| IS-04 | Đặt đơn | Tạo đơn từ giỏ hàng (trạng thái ban đầu `PENDING`), kiểm tra tính hợp lệ (món/tùy chọn/tồn kho) trước khi xác nhận |
| IS-05 | Thanh toán | Thanh toán bằng QR chuyển tiền: khách quét QR và chuyển tiền (số tiền cố định, nội dung = mã đơn; tiền vào sao kê của quán, phiên thanh toán chuyển `TRANSFER_RECEIVED`, đơn vẫn `PENDING`. Nhân viên xác nhận thì đơn thành `PAID`; từ chối thì thành `PAYMENT_FAILED` và tự hoàn tiền.Thanh toán bằng thẻ là quẹt thẻ tại quầy (không có form nhập thẻ). Khách không tự xác nhận thanh toán; cho phép thử lại khi thanh toán lỗi |
| IS-06 | Theo dõi đơn | Khách xem trạng thái đơn theo tiến trình `PENDING` → `PAID` → `PREPARING` → `READY` → `COMPLETED`, và các trạng thái `PAYMENT_FAILED`, đã hủy |
| IS-07 | Tồn kho theo nguyên liệu & công thức | Mỗi món có công thức tiêu hao nguyên liệu; nguyên liệu được trừ (giữ chỗ) ngay khi tạo đơn; hoàn lại kho khi đơn bị hủy hoặc hết hạn thanh toán (đơn chưa thanh toán tự hủy sau thời gian cấu hình được, mặc định 15 phút; không tự hủy đơn đã có tiền về); không bán vượt khi đặt đồng thời; món không đủ nguyên liệu không thể đặt |
| IS-08 | Ngân hàng giả lập | Mô-đun mô phỏng ngân hàng: sinh mã QR theo đơn (số tiền cố định, nội dung = mã đơn), nhận khoản chuyển giả lập, ghi vào sao kê của quán, thực hiện hoàn tiền giả lập và việc xác nhận thanh toán |
| IS-09 | Đăng ký / đăng nhập | Đăng ký và đăng nhập bằng email và mật khẩu, xác thực bằng JWT; đặt đơn và xem đơn yêu cầu đã đăng nhập |
| IS-10 | Lịch sử đơn | Khách đã đăng nhập xem lại danh sách và chi tiết các đơn đã đặt |
| IS-11 | Khuyến mãi và điểm thưởng | Voucher: mỗi đơn dùng tối đa 1 mã, mỗi tài khoản dùng mỗi mã tối đa 3 lần, có mã công khai và mã ẩn. Điểm thưởng: 10.000đ thực trả = 1 điểm, cộng khi đơn `PAID`, thu hồi khi đơn bị hủy; chỉ tích và hiển thị (đổi điểm thuộc phạm vi mở rộng). Mô hình lớp có Khuyến mãi và Giao dịch trung thành |
| IS-12 | Triển khai sản xuất | Triển khai trên môi trường sản xuất với HTTPS, CI/CD và health check; đóng gói bằng Docker |
| IS-13 | Phân quyền | Hai vai trò `CUSTOMER` và `ADMIN`; các chức năng của trang quản trị chỉ dành cho `ADMIN` |
| IS-14 | Hủy đơn | Đơn chưa có tiền: khách hủy ngay. Đơn đã có tiền về hoặc đã `PAID`: khách gửi yêu cầu hủy, nhân viên duyệt, hệ thống tự hoàn tiền. Từ `PREPARING` trở đi không hủy được |
| IS-15 | Trang quản trị (`ADMIN`) | Bốn tab: Thanh toán (kèm sao kê); Đơn hàng (duyệt yêu cầu hủy và bảng pha chế `PAID` → `PREPARING` → `READY` → `COMPLETED`); Lịch sử đơn; Nguyên liệu (chỉ xem) |
| IS-16 | Chống gửi trùng | Idempotency-Key cho cả `POST /orders` lẫn `POST /payments`: gửi lại cùng khóa không tạo đơn hoặc thanh toán trùng |

### 3.2. Phạm vi mở rộng 

| Mã | Hạng mục | Ghi chú |
|----|----------|---------|
| EX-01 | Sửa / nhập kho nguyên liệu | Trang quản trị cho phép chỉnh số lượng tồn và nhập kho (hiện tab Nguyên liệu chỉ xem) |
| EX-02 | Quản lý menu, giá, công thức | Thêm/sửa món, giá và công thức ngay trên trang quản trị |
| EX-03 | PWA đầy đủ | Cài đặt lên màn hình chính, hoạt động ổn định khi mạng yếu, (tùy chọn) thông báo |
| EX-04 | Đổi điểm thưởng | Dùng điểm tích lũy để đổi ưu đãi (hiện chỉ tích và hiển thị) |

Các hạng mục mở rộng chỉ được làm khi toàn bộ MVP đã hoàn thành và được review.

### 3.3. Không thực hiện (Out-of-scope)

| Mã | Hạng mục | Lý do |
|----|----------|-------|
| OS-01 | Thanh toán thật (kết nối ngân hàng/ví điện tử) | Cần hợp đồng, bảo mật, tuân thủ quy định; ngoài khả năng của đề tài |
| OS-02 | Thanh toán tiền mặt | Cần quy trình thu ngân và đối soát tại quầy |
| OS-03 | Giao hàng | Cần quản lý địa chỉ, phí ship, shipper |
| OS-04 | Nhiều chi nhánh | Cần phân tách tồn kho, menu và báo cáo theo chi nhánh |
| OS-05 | Ứng dụng native (iOS/Android) | Dùng web responsive/PWA thay thế |
| OS-06 | Hoàn tiền thật (về tài khoản ngân hàng/ví thật của khách) | Phụ thuộc thanh toán thật; hoàn tiền giả lập (ghi vào sao kê) đã nằm trong phạm vi (IS-08, IS-14) |
| OS-07 | Tài khoản / số dư ngân hàng của khách trong ngân hàng giả lập | Ngân hàng giả lập chỉ ghi sao kê của quán, không quản lý tài khoản hay số dư của khách |

## 4. Giả định 

| Mã | Giả định | Nếu sai thì |
|----|----------|-------------|
| A-01 | Hệ thống phục vụ **một cửa hàng duy nhất**; chỉ có một menu và một kho nguyên liệu | Phải thiết kế lại mô hình dữ liệu cho nhiều chi nhánh |
| A-02 | Khách hàng dùng trình duyệt hiện đại trên điện thoại hoặc máy tính, có kết nối Internet | Phải bổ sung hỗ trợ ngoại tuyến hoặc trình duyệt cũ |
| A-03 | Menu, nguyên liệu và công thức được **nhập sẵn (seed)** vào hệ thống; trang quản trị chỉ cho xem nguyên liệu, chưa có sửa/nhập kho hay quản lý menu, giá, công thức | Phải đưa các chức năng quản lý này vào MVP |
| A-04 | Mỗi món có **một công thức cố định**; size/topping chỉ thay đổi lượng nguyên liệu và giá theo quy tắc đã định | Công thức cần mô hình hóa phức tạp hơn |
| A-05 | Ngân hàng giả lập luôn ghi nhận khoản chuyển vào sao kê của quán; khách chuyển đúng số tiền và đúng nội dung (mã đơn) mà mã QR đã điền sẵn | Phải đối soát thủ công khoản chuyển sai số tiền hoặc sai nội dung |
| A-06 | Khách **phải đăng ký/đăng nhập (email + mật khẩu, JWT)** để đặt đơn; mỗi đơn gắn với một tài khoản và một mã đơn để theo dõi | Luồng đặt đơn và API `POST /orders` phải thay đổi theo cơ chế định danh khác  |
| A-07 | Tiền tệ duy nhất là VND, ngôn ngữ giao diện là tiếng Việt | Phải bổ sung đa tiền tệ/đa ngôn ngữ |
| A-08 | Trong giờ bán luôn có nhân viên trực trang quản trị để xác nhận thanh toán, duyệt yêu cầu hủy và pha chế | Đơn nằm lâu ở `PENDING`/`PAID`; đơn chưa có tiền vẫn tự hủy theo hạn thanh toán |

## 5. Ràng buộc 

| Mã | Ràng buộc | Loại |
|----|-----------|------|
| C-01 | Phải hoàn thành trong thời gian của học kỳ và theo các mốc nộp của môn Công nghệ phần mềm | Thời gian |
| C-02 | Nhóm phát triển là sinh viên, nhân lực hạn chế, làm song song với các môn học khác | Nhân lực |
| C-03 | Công nghệ: frontend Next.js (mobile-first/PWA), backend NestJS, cơ sở dữ liệu PostgreSQL; đóng gói bằng Docker, có CI/CD và HTTPS. Frontend dùng thêm TailwindCSS, React Query, Zustand | Kỹ thuật |
| C-04 | Không sử dụng dịch vụ thanh toán thật và không xử lý dữ liệu thẻ/tài khoản ngân hàng thật; chỉ dùng ngân hàng giả lập, không có form nhập thẻ | Pháp lý / Bảo mật |
| C-05 | Mọi thay đổi mã nguồn và tài liệu phải đi qua issue → nhánh riêng → Pull Request, có ít nhất một người review trước khi vào nhánh `main` | Quy trình |
| C-06 | Tài liệu Task 1–3 viết bằng LaTeX, chỉ dùng các gói thông dụng (`booktabs`, `tabularx`, `longtable`); các tài liệu đề bắt buộc dạng Markdown (như `context-and-scope.md`) vẫn phải có với nội dung giống bản `.tex` | Tài liệu |
| C-07 | Các task phụ thuộc nhau phải dùng chung định dạng dữ liệu (ví dụ cấu trúc dòng giỏ hàng, hàm tính giá theo tùy chọn) | Tích hợp |
| C-08 | Phạm vi chức năng phải khớp với các task nhóm đang thực hiện ở Bài tập 1 | Phạm vi |
| C-09 | Mật khẩu người dùng phải được băm (hash) trước khi lưu, không lưu dạng rõ | Bảo mật |
| C-10 | Thông tin bí mật (khóa JWT, mật khẩu cơ sở dữ liệu, khóa dịch vụ) không được đưa vào repo; cấu hình qua biến môi trường | Bảo mật |
| C-11 | Cơ sở dữ liệu trên môi trường sản xuất không mở công khai ra Internet; chỉ backend truy cập được | Bảo mật |
| C-12 | Thời gian phản hồi của API dưới 500 ms | Hiệu năng |
| C-13 | Thanh toán phải do nhân viên xác nhận; khách không được tự đánh dấu đã thanh toán (yêu cầu của giảng viên) | Nghiệp vụ |

## 6. Rủi ro ban đầu

Khả năng và Ảnh hưởng được đánh giá theo ba mức: Thấp / Trung bình / Cao.

| Mã | Rủi ro | Khả năng | Ảnh hưởng | Cách giảm thiểu |
|----|--------|---|---|----------------------|
| R-01 | Phạm vi phình to (thêm tính năng ngoài MVP) làm trễ hạn | Trung bình | Cao | Chốt phạm vi trong tài liệu này; hạng mục mở rộng chỉ làm sau khi MVP xong; mọi thay đổi phạm vi phải được nhóm trưởng đồng ý |
| R-02 | Các task chồng chéo, xung đột mã khi cùng sửa một tệp (ví dụ thành phần dùng chung như Header) | Cao | Trung bình | Báo nhau trước khi sửa tệp dùng chung; mỗi task một nhánh; commit nhỏ; rebase/merge `main` thường xuyên |
| R-03 | Không thống nhất định dạng dữ liệu giữa các task (dòng giỏ hàng, tùy chọn, giá) | Trung bình | Cao | Thống nhất và ghi lại hợp đồng dữ liệu sớm; dùng chung hàm tính giá; review chéo khi tích hợp |
| R-04 | Sai lệch tồn kho: hai đơn cùng giữ chỗ nốt nguyên liệu cuối, đơn hủy/hết hạn không được hoàn lại kho hoặc công thức nhập sai | Trung bình | Trung bình | Kiểm tra và trừ kho trong cùng một giao dịch ở backend; tác vụ tự hủy đơn hết hạn (mặc định 15 phút, cấu hình được) phải hoàn kho và không tự hủy đơn đã có tiền về; seed công thức có kiểm tra lại; viết kiểm thử cho kịch bản hết nguyên liệu và hết hạn thanh toán |
| R-05 | Ngân hàng giả lập không phản ánh đúng hành vi thật (ví dụ khách chuyển sai số tiền/nội dung, chuyển trùng, tiền về trễ); một đơn có thể được thanh toán lại nhiều lần khi lỗi | Trung bình | Trung bình | Mã QR điền sẵn số tiền và nội dung; nhân viên đối chiếu qua sao kê; xử lý idempotent theo Idempotency-Key của từng lần thanh toán (không theo mã đơn) |
| R-06 | Thành viên thiếu thời gian hoặc nghẽn ở khâu review | Trung bình | Cao | Chia task nhỏ; đặt hạn review ngắn; có người dự phòng cho mỗi khâu; báo sớm khi bị vướng |
| R-07 | Yêu cầu hiểu khác nhau giữa các thành viên và người đánh giá | Trung bình | Trung bình | Viết yêu cầu rõ, có mã truy vết; review tài liệu qua Pull Request; xác nhận lại với giảng viên khi chưa rõ |
| R-08 | Thiếu thời gian làm các hạng mục mở rộng (sửa/nhập kho, quản lý menu, giá, công thức, đổi điểm, PWA) | Cao | Thấp | Đã xếp vào phạm vi mở rộng; MVP (gồm trang quản trị) vẫn trọn vẹn nếu không làm |
| R-09 | Khách đặt hàng hai lần (bấm đúp, mạng chậm) tạo đơn trùng | Trung bình | Trung bình | Bắt buộc Idempotency-Key cho `POST /orders`; frontend vô hiệu nút khi đang gửi; kiểm thử gửi lặp |
| R-10 | Hai nhân viên cùng xác nhận một thanh toán hoặc cùng hoàn tiền, dẫn tới hoàn tiền hai lần | Trung bình | Cao | Khóa dòng (row lock) trên đơn và phiên thanh toán trong giao dịch; kiểm tra trạng thái trước khi đổi; Idempotency-Key cho `POST /payments`; kiểm thử đồng thời |
| R-11 | Khách chuyển tiền sát hạn thanh toán nên đơn bị tự hủy trong khi tiền đã về | Trung bình | Cao | Không tự hủy đơn đã có tiền về; đơn đó chờ nhân viên xác nhận hoặc từ chối (và hoàn tiền); hạn thanh toán cấu hình được (mặc định 15 phút) |

