# Issue #31 — Voucher, phần độc lập đợt 1

Người làm: Ân. Review theo issue: Hiếu. Nhánh: `feature/task-5-1-vouchers`.
Nguồn: chuyển file từ A1 `Bai_Tap_Lon_CNPM` commit `92a43f4` rồi sửa cho A2;
không nhập lịch sử Git A1. Nhánh bắt đầu từ A2 `8833df4`.

## Trạng thái và phạm vi

**Trạng thái hiện tại: CHỜ PHỤ THUỘC THEO THỨ TỰ NHÓM TRƯỞNG YÊU CẦU.**
Ngày 11/11/2026, người phụ trách chuyển lại xác nhận của nhóm trưởng rằng các
phần liên quan phải đợi, chưa được làm trước. Dừng phát triển và ghép thêm phần
phụ thuộc cho đến khi nhóm xác nhận các đầu nối sẵn sàng theo thứ tự đã giao.
Giữ Draft PR #47 để review phần đã thực hiện, chưa đề nghị merge. Phần báo giá/
giá server đã được đối chiếu với yêu cầu POST quote trong Issue #31; người phụ
trách đồng ý gửi bổ sung để review. Vẫn chờ các đầu nối của nhóm trước khi phát
triển hoặc ghép tiếp. Không tự xóa code đang có; rà soát lại với code nhóm trước
khi tiếp tục. Kết quả kiểm tra bên dưới không xác nhận toàn luồng đã được nghiệm thu.

Ngày 11/11/2026, người phụ trách xác nhận chưa chốt cấu trúc User/Order,
JWT và thứ tự migration giữa các module; thống nhất làm phần độc lập trước.
Sau đó cung cấp hướng dẫn nhóm trưởng: giữ định dạng giỏ/phụ phí A1, các việc
đợt 1 được làm song song. Đã đối chiếu trực tiếp `useCart.ts` và `productOptions.ts`
trong PR #45 (commit `78953e4`) và tiếp tục hoàn thiện báo giá tiền cho khách chưa đăng nhập.
**Issue #31 chưa đủ điều kiện đóng/nghiệm thu toàn luồng.**

Đã triển khai:

- Migration tạo `vouchers`, seed 4 mã với hạn 30 ngày từ lần migration đầu;
  chạy lại ứng dụng không tự gia hạn hoặc ghi đè voucher đã có.
- `GET /vouchers`: chỉ trả mã công khai, đang hoạt động, chưa hết hạn;
  không chứa thông tin lượt dùng của tài khoản. Mã chưa tới ngày bắt đầu có thể
  xuất hiện trong danh sách; bộ báo giá trả lý do chưa được sử dụng.
- `POST /vouchers/quote` cho khách chưa đăng nhập: nhận lựa chọn món, đọc giá
  sản phẩm từ DB và cộng phụ phí A1, trả tổng trước/sau giảm cùng lý do mã không hợp lệ.
  Chỉ báo giá, không tạo đơn hoặc giữ nguyên liệu/lượt dùng.
- Swagger ở `/api/docs`, mô tả GET/POST, request/response DTO và các lỗi.
- Hàm dùng chung `apps/api/src/pricing/price-cart-items.ts` và `product-options.ts`
  chuyển từ A1, không phụ thuộc module Order. Dữ liệu sản phẩm được đọc một lần
  cho mỗi báo giá; các dòng trùng sản phẩm dùng cùng giá DB. Size S/M/L cộng
  0/5.000/10.000đ; cream/pearls cộng 5.000đ mỗi loại, không cho topping trùng.
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
- Báo giá theo tài khoản: chờ JWT và quota migrations. Trong bản hiện tại,
  có header `Authorization` (kể cả token sai hoặc header rỗng) thì trả HTTP 503,
  code `VOUCHER_ACCOUNT_QUOTE_NOT_READY`, không giải mã token hoặc giả làm khách chưa đăng nhập.
  Báo giá không có header này trả `voucherUsage: null` và `usage: null` cho từng mã;
  chưa xác nhận số lượt còn lại hoặc khả năng giữ mã khi tạo đơn.
- Chưa đặt component vào trang giỏ của Mai (trang này chưa vào main).
- Chưa nối giữ/chốt/trả lượt với create order/PAID/cancel của đợt 2.
- Đã kiểm tra migration/báo giá trên PostgreSQL riêng và component gọi API thật;
  chưa kiểm tra quota song song, JWT và toàn luồng đặt/thanh toán. Unit test
  API-T56 vẫn dùng repository giả lập; bài PostgreSQL thật có mã INT-T50 riêng.

## Mã mẫu

| Mã | Kiểu | Mức giảm | Đơn tối thiểu | Trần | Cách chọn |
|---|---|---|---|---|---|
| THU5K | FIXED | 5.000đ | 30.000đ | — | Công khai |
| BREW10 | PERCENT | 10% | 50.000đ | 10.000đ | Công khai |
| NHOM15K | FIXED | 15.000đ | 100.000đ | — | Công khai |
| NHAP7K | FIXED | 7.000đ | 35.000đ | — | Nhập tay |

Mỗi tài khoản tối đa 3 lượt/mã, mỗi đơn một mã và một lượt.
Ba mã công khai xuất hiện ở GET; NHAP7K chỉ được tra khi khách nhập mã ở API
báo giá. Mã nhập tay không phải mã riêng được cấp
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

Khi tích hợp: thay chốt từ chối `Authorization` tạm thời bằng optional JWT guard
thật; xác thực và kiểm tra tài khoản tồn tại trước khi gọi quote với `verifiedUserId`.
Token sai phải trả 401, không rơi về khách chưa đăng nhập. Không gửi danh tính
chỉ mới decode token vào service. Bổ sung `@ApiBearerAuth` khi hỗ trợ báo giá theo tài khoản.

### Tài — tính giá, tạo đơn (#28, #33)

- Dùng chung `pricing/price-cart-items.ts` và `pricing/product-options.ts` khi
  chuyển phần tạo đơn từ A1: đọc giá từ DB, kiểm tra món/size/topping và số lượng,
  tính cùng một kết quả cho quote và create order. Cần Tài đối chiếu khi ghép #33;
  không tạo thêm một bản phụ phí khác trong OrdersModule.
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

Route quote đã áp dụng pipe với `transform: true`, `whitelist: true`,
`forbidNonWhitelisted: true` để chuẩn hóa mã và từ chối giá/identity khách tự gửi;
giữ nguyên ValidationPipe toàn ứng dụng. Client voucher chỉ gửi bốn trường lựa chọn,
không gửi name/imageUrl/unitPrice từ store. Không cần bỏ các trường đó trong store của Mai.

## Kiểm tra và truy vết

| Mã test | Phạm vi |
|---|---|
| API-T50 | Hiệu lực, đơn tối thiểu, giảm FIXED/PERCENT, trần, làm tròn |
| API-T51 | DTO dòng giỏ/mã, số lượng, topping trùng, từ chối giá và identity khách |
| API-T52 | Đếm lượt, quá 3, giữ/chốt/trả, replay, thời hạn sau khi chờ khóa, transaction bắt buộc |
| API-T53 | Quote nội bộ, nhập mã ẩn, lý do khóa lượt, ẩn mã đã dùng hết, giờ DB |
| API-T54 | GET/POST controller và Swagger request/response |
| API-T55 | Giá DB + phụ phí A1, nhiều dòng/size/topping, lựa chọn sai, giới hạn tiền/số lượng |
| API-T56 | HTTP quote + DTO thực, tổng tiền đúng, mã ẩn, guest không đụng quota, từ chối giá/identity/token giả |
| INT-T50 | PostgreSQL thật riêng: migration/4 seed, hạn 30 ngày, khởi động lại, GET/quote, mã ẩn/hết hạn, giá DB thay đổi, không ghi workflow |
| WEB-T60 | Client chỉ gửi lựa chọn, Bearer theo tài khoản, lỗi/response sai, hủy request |
| WEB-T61 | Ticket x3/ẩn x1, chọn/nhập mã, xác nhận lại, bỏ mã, khóa sau tạo đơn |
| WEB-T62 | Loading/lỗi/thử lại/rỗng, mã hết hạn khi xác nhận, bỏ phản hồi tài khoản cũ |

Unit test có mock repository/manager: **không chứng minh tranh chấp trên PostgreSQL thật**.
Phải kiểm tra bổ sung quota song song và rollback cùng đơn sau khi ghép DB/đợt 2.
Mã test được ghi ở FR-13 của ma trận; phần tích điểm thuộc issue tạo đơn, chưa triển khai ở đây.

### Chạy INT-T50 với PostgreSQL thật

Docker Engine cần đang chạy và đã có image `postgres:16-alpine`. Từ `apps/api`:

```powershell
npm run vouchers:smoke
```

Lệnh build API rồi chạy `test/vouchers.smoke.cjs`: tự tạo container PostgreSQL tạm
tên ngẫu nhiên, cổng ngẫu nhiên trên loopback, dữ liệu trên tmpfs; khởi động API
với DATABASE_URL test riêng, chạy các kiểm tra và dừng/xóa container đó khi xong.
Không sửa `.env`, không chạy `compose down`, không dùng/xóa volume hoặc database A1.
Image chưa có thì chuẩn bị bằng `docker pull postgres:16-alpine` trước.
Đây là kiểm tra voucher; chưa thay thế kiểm tra tạo đơn/thanh toán/E2E của nhóm.
Lệnh smoke là công cụ kiểm chứng bổ sung cho phần voucher; Issue #31 yêu cầu
API báo giá và unit test, không bắt buộc tên lệnh smoke hoặc một tính năng nghiệp vụ mới.

Ví dụ body gửi `POST /vouchers/quote` (không có Authorization trong bản hiện tại):

```json
{
  "items": [{ "productId": "p1", "size": "M", "toppingIds": ["cream"], "qty": 2 }],
  "voucherCode": "BREW10"
}
```

Với giá DB mẫu p1 = 30.000đ, API trả subtotal 80.000đ, discount 8.000đ,
total 72.000đ; các trường usage là null. Tạo đơn sau này phải tính lại và giữ lượt,
không tin số tiền được gửi lại từ trình duyệt.

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
  **80/80 test qua, 11 suite**, build qua.
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

Kiểm tra bổ sung sau khi mở Docker và triển khai POST quote:

- INT-T50 trên PostgreSQL 16-alpine tạm riêng: qua. Có kiểm tra seed giữ nguyên hạn
  sau restart, phản hồi mã hết hạn, cập nhật giá DB làm thay đổi báo giá, request giả
  giá/danh tính bị từ chối, request có Authorization trả 503 rõ lý do.
- Component với API và PostgreSQL thật trên Edge desktop/mobile: nhập NHAP7K,
  tổng 80.000đ giảm 7.000đ còn 73.000đ; không có lỗi JavaScript/tràn ngang.
  Không hiện x3 khi chưa có quota tài khoản. Giỏ của bài kiểm tra được cố định riêng,
  chưa phải trang giỏ của Mai hoặc E2E tạo/thanh toán đơn.
- Đối chiếu **36 tổ hợp giá** giữa hàm server mới và helper thật của Mai tại PR #45: khớp.
- Ảnh/kết quả bổ sung ngoài repo: `D:\Do_an_CNPM\.voucher-31-review\live`.
  Dịch vụ API và container tạm của bài kiểm tra đã được dọn sau khi chạy.

Bản nền tảng ở Draft PR #47, commit `3a2cfa2`, đã có CI api/web xanh.
Phần POST quote/giá server/INT-T50 được gửi bổ sung trong cùng Draft PR;
trạng thái CI của commit mới xem trực tiếp ở PR. Các kết quả ở trên là kiểm tra local.
Chỉ chuyển Ready for review khi đủ phần tích hợp và kiểm tra DB/toàn luồng.
PR ghi nguồn A1, `Closes #31`; chỉ merge khi CI api/web xanh, ít nhất một approve,
bằng merge commit theo quy tắc nhóm. Dòng liên kết đóng issue trong Draft PR
không xác nhận Issue #31 đã hoàn thành; không merge bản còn thiếu tích hợp.
