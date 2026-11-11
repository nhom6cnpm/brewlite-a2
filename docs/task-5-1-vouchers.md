# Issue #31 — Voucher, phần độc lập đợt 1

Người làm: Ân. Review theo issue: Hiếu. Nhánh: `feature/task-5-1-vouchers`.
Nguồn: chuyển file từ A1 `Bai_Tap_Lon_CNPM` commit `92a43f4` rồi sửa cho A2;
không nhập lịch sử Git A1. Nhánh bắt đầu từ A2 `8833df4`.

## Trạng thái và phạm vi

Ngày 11/11/2026, người phụ trách xác nhận chưa chốt cấu trúc User/Order,
JWT và thứ tự migration giữa các module; thống nhất làm phần độc lập trước.
**Issue #31 chưa đủ điều kiện đóng/nghiệm thu toàn luồng.**

Đã triển khai:

- Migration tạo `vouchers`, seed 4 mã với hạn 30 ngày từ lần migration đầu;
  chạy lại ứng dụng không tự gia hạn hoặc ghi đè voucher đã có.
- `GET /vouchers`: chỉ trả mã công khai, đang hoạt động, chưa hết hạn;
  không chứa thông tin lượt dùng của tài khoản. Mã chưa tới ngày bắt đầu có thể
  xuất hiện trong danh sách; bộ báo giá trả lý do chưa được sử dụng.
- Swagger ở `/api/docs`, mô tả GET và response DTO.
- Logic tính giảm FIXED/PERCENT, có trần, làm tròn xuống VND, không giảm vượt tiền hàng.
- Entity và service lượt dùng chuyển từ A1; dùng interface `VoucherOrder` nhỏ,
  không import hoặc tạo thay entity Order của Tài.
- DTO báo giá theo các trường dòng giỏ trong PR #45: `productId`, `size`,
  `toppingIds`, `qty`; chuẩn hóa mã. Không nhận `userId`, `unitPrice` hay `subtotal` từ khách.
- Component `VoucherPicker`, `VoucherIcon`, `VoucherBadge`, hook/client báo giá,
  test logic và component; không sửa store, trang giỏ, Header, trang chi tiết món.

Chưa nối/chưa bật:

- Migration `voucher_user_quotas` và `voucher_usages`: cần User/Order thật và
  thống nhất thứ tự migration để giữ khóa ngoại. Hiện mới có entity và service;
  hai bảng này **chưa được tạo**. Không bỏ khóa ngoại hoặc tạo bảng User/Order tạm.
- `POST /vouchers/quote`: chưa đăng ký route. Phải lấy giá từ bộ tính giá server
  của Tài, xác thực token theo module của Phúc và đọc lượt dùng trong DB thật.
  Không mở API nhận tổng tiền khách tự gửi để thay phần tính giá.
- Chưa đặt component vào trang giỏ của Mai (trang này chưa vào main).
- Chưa nối giữ/chốt/trả lượt với create order/PAID/cancel của đợt 2.
- Chưa chạy kiểm tra DB/Docker và toàn luồng; Docker Engine không hoạt động
  trong lần kiểm tra này. Unit/component test dùng dữ liệu giả lập riêng trong test.

## Mã mẫu

| Mã | Kiểu | Mức giảm | Đơn tối thiểu | Trần | Cách chọn |
|---|---|---|---|---|---|
| THU5K | FIXED | 5.000đ | 30.000đ | — | Công khai |
| BREW10 | PERCENT | 10% | 50.000đ | 10.000đ | Công khai |
| NHOM15K | FIXED | 15.000đ | 100.000đ | — | Công khai |
| NHAP7K | FIXED | 7.000đ | 35.000đ | — | Nhập tay |

Mỗi tài khoản tối đa 3 lượt/mã, mỗi đơn một mã và một lượt.
Ba mã công khai xuất hiện ở GET; NHAP7K chỉ được tra khi khách nhập mã ở API
báo giá sau khi route đó được ghép. Mã nhập tay không phải mã riêng được cấp
cho một tài khoản: tài khoản biết mã vẫn phải qua điều kiện và quota.
Seed là dữ liệu demo theo issue, không phải giao diện quản trị voucher.
Migration seed `down` giữ dữ liệu để không xóa mã đã chỉnh hoặc đã dùng;
rollback toàn bộ bảng chỉ dành cho DB thử nghiệm và bị khóa ngoại chặn khi có dữ liệu liên quan.

## Quy tắc và điểm phối hợp

### Phúc — đăng nhập (#27)

Chốt cách guard cung cấp danh tính đã xác thực, token không hợp lệ trả 401,
kiểm tra tài khoản còn tồn tại, `users.id` và thời điểm migration user chạy.
Không lấy danh tính từ body/header tự khai báo. Báo giá khách chưa đăng nhập
có thể cho xem mức giảm như A1, nhưng chưa có số lượt cá nhân; việc tạo đơn
luôn phải xác thực và kiểm tra quota lại.

### Tài — tính giá, tạo đơn (#28, #33)

- Chốt bộ tính giá server dùng chung: đọc giá từ DB, kiểm tra món/size/topping,
  tính cùng một kết quả cho quote và create order.
- `VouchersService.quote(manager, subtotal, code, dbNow, verifiedUserId?)` là
  hàm nội bộ, `subtotal` chỉ do bộ tính giá server cung cấp. Không giữ lượt.
- `apply(manager, subtotal, code, dbNow, true)` dùng khi tạo đơn và khóa voucher.
- `VoucherUsagesService.reserve(order, manager)` giữ lượt khi tạo đơn;
  `markUsed(order, manager, dbNow)` chốt PAID;
  `release(order, manager, dbNow)` trả lượt khi hủy hợp lệ, kể cả đơn từng PAID.
- Ba thao tác thay đổi lượt bắt buộc dùng **EntityManager của transaction đơn hàng**.
  Caller khóa đơn và kiểm tra chuyển trạng thái trước; service voucher không tự mở
  transaction, không tự chuyển trạng thái hoặc xử lý hoàn tiền.
- Giữ thứ tự khóa như A1: đơn → nguyên liệu (nếu cần) → voucher/quota → user.
  Khóa quota theo user/code trước khi đếm và ghi, kiểm tra lại giờ DB sau khi chờ khóa.
- Cùng order replay không giữ/chốt/trả thêm lượt; không tái dùng lượt đã RELEASED.
- Giữ khóa ngoại theo A1 sau khi thống nhất: quota → users/vouchers;
  usage → orders và cặp user/code của quota. Không chạy service mutation trước migration này.
- Chốt schema snapshot giảm giá trên Order cùng Tài; lượt này không ALTER bảng Order.

### Mai — giỏ hàng (#30)

Sau khi PR #45/trang giỏ vào main, truyền `items`, `selectedCode`, `onSelect`,
`token` đã được module auth quản lý vào `VoucherPicker`; component dùng subset
CartItem nên không cần thêm một store khác. Component phải nằm trong QueryProvider.

Truyền `appliedDiscount` từ quote thành công cho **đúng giỏ và tài khoản hiện tại**;
không tính giảm từ mã ở localStorage. `useVoucherQuote` có query key gồm token,
dòng giỏ và mã; caller chỉ enable sau khi store persist đã hydrate.
Khóa đổi/bỏ mã bằng `locked` khi đã tạo đơn. `request` là điểm tiêm transport
cho component test/preview; ứng dụng dùng client API thật, không có fallback mẫu.

Khi triển khai route quote, áp dụng pipe với `transform: true`, `whitelist: true`,
`forbidNonWhitelisted: true` tại route để DTO chuẩn hóa mã và từ chối giá/identity
khách tự gửi; không cần đổi ValidationPipe toàn ứng dụng của người khác.
Route cần Swagger operation/response và BearerAuth theo cơ chế auth đã chốt.

## Kiểm tra và truy vết

| Mã test | Phạm vi |
|---|---|
| API-T50 | Hiệu lực, đơn tối thiểu, giảm FIXED/PERCENT, trần, làm tròn |
| API-T51 | DTO dòng giỏ/mã, số lượng, topping trùng, từ chối giá và identity khách |
| API-T52 | Đếm lượt, quá 3, giữ/chốt/trả, replay, thời hạn sau khi chờ khóa, transaction bắt buộc |
| API-T53 | Quote nội bộ, nhập mã ẩn, lý do khóa lượt, ẩn mã đã dùng hết, giờ DB |
| API-T54 | GET controller và Swagger; route quote chưa được bật |
| WEB-T60 | Client chỉ gửi lựa chọn, Bearer theo tài khoản, lỗi/response sai, hủy request |
| WEB-T61 | Ticket x3/ẩn x1, chọn/nhập mã, xác nhận lại, bỏ mã, khóa sau tạo đơn |
| WEB-T62 | Loading/lỗi/thử lại/rỗng, mã hết hạn khi xác nhận, bỏ phản hồi tài khoản cũ |

Unit test có mock repository/manager: **không chứng minh tranh chấp trên PostgreSQL thật**.
Phải kiểm tra bổ sung quota song song và rollback cùng đơn sau khi ghép DB/đợt 2.
Mã test được ghi ở FR-13 của ma trận; phần tích điểm thuộc issue tạo đơn, chưa triển khai ở đây.

Node 24. Chạy từ thư mục repository:

```powershell
Push-Location apps/api
npm ci
npm run lint
npm test -- --runInBand
npm run build
Pop-Location

Push-Location apps/web
npm ci
npm run lint
npm test
npm run build
Pop-Location
```

Kết quả local ngày 11/11/2026, Node 24.22.0:

- API: lint exit 0 (4 cảnh báo `unbound-method` sẵn có trong test products, giữ nguyên ngoài phạm vi);
  **52/52 test qua, 9 suite**, build qua.
- Web: lint qua; **32/32 test qua, 4 file**, TypeScript/production build qua.
- Lockfile API: `npm ci --dry-run --ignore-scripts --no-audit --no-fund` qua;
  chỉ bổ sung Swagger và dependency cần thiết, giữ dependency có sẵn của nhóm.
- Kiểm tra component bằng trình duyệt Edge thật trên desktop 1280×900 và mobile
  375×812: ticket x3/ẩn x1, chọn mã, nhập NHAP7K, badge khi áp dụng, Escape đóng,
  không tràn ngang và không có lỗi JavaScript. Dùng transport giả lập rõ ràng
  ngoài repo, **không phải E2E thật của #40** hoặc bằng chứng API/DB đã tích hợp.
- Preview/ảnh kiểm tra local nằm ngoài repo ở `D:\Do_an_CNPM\.voucher-31-review`;
  mở lại bằng `node server.mjs` trong thư mục đó, xem `http://127.0.0.1:5189`.
- Không chạy migration hoặc seed vào database cũ của A1.

Bản này gửi dưới dạng Draft PR để review phần độc lập và thống nhất điểm kết nối.
Kết quả CI trên GitHub xem tại PR sau khi push; các kết quả ở trên là kiểm tra local.
Chỉ chuyển Ready for review khi đủ phần tích hợp và kiểm tra DB/toàn luồng.
PR ghi nguồn A1, `Closes #31`; chỉ merge khi CI api/web xanh, ít nhất một approve,
bằng merge commit theo quy tắc nhóm. Dòng liên kết đóng issue trong Draft PR
không xác nhận Issue #31 đã hoàn thành; không merge bản còn thiếu tích hợp.
