# ☕ BrewLite – Assignment 2

[![CI](https://github.com/nhom6cnpm/brewlite-a2/actions/workflows/ci.yml/badge.svg)](https://github.com/nhom6cnpm/brewlite-a2/actions/workflows/ci.yml)
[![CD](https://github.com/nhom6cnpm/brewlite-a2/actions/workflows/cd.yml/badge.svg)](https://github.com/nhom6cnpm/brewlite-a2/actions/workflows/cd.yml)

Ứng dụng đặt cà phê không dùng tiền mặt — Bài tập lớn môn Công nghệ Phần mềm, Trường Đại học Sài Gòn (HK I, 2026–2027).
Assignment 2: **Requirements to Deployment** — từ khai thác yêu cầu, mô hình hóa, thiết kế kiến trúc đến hai Sprint, CI/CD và triển khai production.

## Công nghệ
| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js (mobile-first/PWA), TypeScript, TailwindCSS |
| Backend | NestJS, TypeScript, REST |
| CSDL | PostgreSQL |
| DevOps | Docker, Docker Compose, GitHub Actions |

## Cấu trúc thư mục
```
brewlite-a2/
├── apps/
│   ├── web/                  # Next.js mobile-first/PWA
│   └── api/                  # NestJS
├── docs/
│   ├── requirements/         # Task 1 – bối cảnh, SRS, đặc tả use-case
│   ├── diagrams/             # Task 2 – activity, sequence, class (file nguồn + ảnh)
│   ├── architecture/         # Task 3 – kiến trúc, ADR, deployment
│   ├── traceability-matrix.md
│   └── deployment.md
├── tests/                    # Integration / E2E
├── .github/workflows/        # CI/CD
├── docker-compose.yml
├── .env.example
└── README.md
```

## Tiến độ
| Task | Nội dung | Trạng thái |
|---|---|---|
| 1 | Khai thác và đặc tả yêu cầu | ✅ Xong |
| 2 | Mô hình hóa hệ thống | ✅ Xong |
| 3 | Thiết kế kiến trúc | ✅ Xong (#14, #15) |
| 4 | Triển khai Sprint 1 | ✅ Xong ([milestone Sprint 1](https://github.com/nhom6cnpm/brewlite-a2/milestone/1)) |
| 5 | Triển khai Sprint 2, CI/CD và Delivery | ⏳ Đang làm |

> Các task phải hoàn thành **theo đúng thứ tự**; task sau chỉ được nghiệm thu khi tạo phẩm của task trước đã có trên repository.

## Tài liệu
| Task | Nội dung | File |
|---|---|---|
| 1.1 | Bối cảnh, stakeholder và phạm vi | [context-and-scope.md](docs/requirements/context-and-scope.md) · [.tex](docs/requirements/context-and-scope.tex) |
| 1.2 | SRS (FR/NFR, MoSCoW) và use-case tổng quát | [srs.tex](docs/requirements/srs.tex) · [sơ đồ use-case](docs/diagrams/usecase-overview.svg) ([.puml](docs/diagrams/usecase-overview.puml)) |
| 1.3 | Đặc tả use-case "Đặt và thanh toán đơn hàng" | [uc-checkout.tex](docs/requirements/uc-checkout.tex) · [sơ đồ](docs/diagrams/usecase-checkout.svg) ([.puml](docs/diagrams/usecase-checkout.puml)) |
| 2.1 | Activity diagram (Activity-01) | [activity.tex](docs/diagrams/activity.tex) · [sơ đồ](docs/diagrams/activity-checkout.svg) ([.puml](docs/diagrams/activity-checkout.puml)) |
| 2.2 | Sequence diagram (Sequence-01) | [sequence.tex](docs/diagrams/sequence.tex) · [sơ đồ](docs/diagrams/sequence-checkout.svg) ([.puml](docs/diagrams/sequence-checkout.puml)) |
| 2.3 | Class diagram (Class-01) | [class.tex](docs/diagrams/class.tex) · [sơ đồ lớp](docs/diagrams/class-domain.svg) · [enum](docs/diagrams/class-domain-enums.svg) ([.puml](docs/diagrams/class-domain.puml)) |
| 3.1 | Kiến trúc hệ thống và ADR (Architecture-01) | [architecture.tex](docs/architecture/architecture.tex) · [sơ đồ](docs/diagrams/architecture-c4.svg) ([.puml](docs/diagrams/architecture-c4.puml)) · [ADR](docs/architecture/adr/) |
| 3.2 | Deployment diagram | [deployment.tex](docs/architecture/deployment.tex) · [sơ đồ](docs/diagrams/deployment.svg) ([.puml](docs/diagrams/deployment.puml)) · [deployment.md](docs/deployment.md) · [ADR-008](docs/architecture/adr/008-nen-tang-trien-khai.md) |
| 5.2 | Integration test API tạo đơn và thanh toán | [order-payment.integration-spec.ts](apps/api/test/order-payment.integration-spec.ts) |
| 5.3 | Pipeline Continuous Delivery (CD) | [.github/workflows/cd.yml](.github/workflows/cd.yml) |
| 5.4 | Triển khai production, bàn giao & API Spec | [deployment.md](docs/deployment.md) · [openapi.json](docs/api/openapi.json) · [Postman](docs/api/brewlite.postman_collection.json) |
| — | Ma trận truy vết | [traceability-matrix.md](docs/traceability-matrix.md) |

Mỗi khi một task được merge, cập nhật dòng tương ứng trong bảng này.

## Quy ước làm việc (Git)
- `main`: bản ổn định, **không push trực tiếp**.
- Mỗi việc 1 nhánh tách từ `main`, tạo từ nút **Create a branch** trong issue:
  `feature/<task>-<mô-tả-ngắn>` hoặc `docs/<task>-<mô-tả-ngắn>` (ví dụ `docs/task-1-srs`).
- Làm xong tạo Pull Request vào `main`, mô tả có `Closes #<số issue>`.
- Mọi PR cần **ít nhất 1 người review** trước khi merge.
- Mọi thay đổi yêu cầu, sơ đồ hoặc kiến trúc đều đi qua Pull Request và ghi rõ lý do.

## Quy ước commit
Theo dạng `<loại>(<phạm vi>): <mô tả>`:
- `feat(products): add GET /products`
- `fix(cart): ...`
- `docs(requirements): add stakeholder table`
- `chore: ...`, `test: ...`, `ci: ...`

## Definition of Done
Một hạng mục được tính là xong khi:
- Đáp ứng đầy đủ tiêu chí chấp nhận của issue.
- Code chạy được, `lint`, `test`, `build` không lỗi; CI pass.
- API có validate đầu vào; UI xử lý trạng thái loading / empty / error.
- Có test cho nghiệp vụ chính của hạng mục.
- Đi qua Pull Request, có ít nhất 1 người review và approve.
- Tài liệu liên quan (README, `docs/`, ma trận truy vết) được cập nhật.

## Quy ước viết tài liệu
Tài liệu Task 1–3 viết bằng **LaTeX**, đặt đúng thư mục của từng task (`docs/requirements/`, `docs/diagrams/`, `docs/architecture/`).
Báo cáo tổng hợp (trang bìa, mục lục) chỉ làm **một lần vào cuối kỳ**, không nằm trong repo.

1. **File chỉ chứa nội dung** theo yêu cầu issue và đề: không có `\documentclass`, `\begin{document}`, trang bìa.
2. **Cùng cấp tiêu đề**: mỗi file bắt đầu bằng `\subsection{Task x.y -- <tên phần>}`, bên trong dùng `\subsubsection`, `\paragraph`.
3. **Chỉ dùng gói LaTeX thông dụng**: bảng `booktabs` / `tabularx` / `longtable`, danh sách `itemize` / `enumerate`, hình `\includegraphics`. Cần gói khác thì báo nhóm trước.
4. **Sơ đồ**: lưu cả **file nguồn** (`.puml`) và **ảnh** (`.svg`) cạnh tài liệu; trong `.tex` chèn ảnh bằng tên file.
5. **Không commit** PDF và file sinh ra khi biên dịch (`.aux`, `.log`, `.toc`…) — đã chặn trong `.gitignore`.
6. File đề **bắt buộc dạng Markdown** vẫn phải có: `docs/requirements/context-and-scope.md`, `docs/traceability-matrix.md`, `docs/deployment.md`, `docs/architecture/adr/*.md`.
7. Mỗi tài liệu đi qua **issue → nhánh → Pull Request → review**; đặt tên nhánh **không dấu**, ví dụ `docs/task-1-2-srs`.

## Biến môi trường
Xem `.env.example`. **Không commit file `.env`.**

## Voucher Sprint 2 — Issue #31 (đang triển khai)

`GET /vouchers` trả mã công khai; `POST /vouchers/quote` báo giá theo giỏ và hỗ trợ
JWT tùy chọn. Khách chưa đăng nhập không có số lượt cá nhân; JWT hợp lệ kiểm tra
tối đa 3 lượt/mã/tài khoản, token sai/hết hạn trả 401, mã hết/đang giữ lượt trả 409.
Báo giá không giữ nguyên liệu hoặc lượt dùng. Hai bảng quota/usage có khóa ngoại
tới users; khóa ngoại orderId tới orders chờ bổ sung ở #33.
Trang `/cart` dùng `CartVoucherSummary` để chọn/nhập mã và hiển thị tiền giảm,
tổng thanh toán từ server; dùng lại store/Auth/PriceSummary trên main. Phần tích hợp
chỉ thay khối tổng tiền theo review #47, giữ thao tác món và kiểm tra nguyên liệu hiện có.
Mã mẫu: `THU5K`, `BREW10`, `NHOM15K`; mã nhập tay: `NHAP7K`.
Kiểm tra PostgreSQL riêng: trong `apps/api`, chạy `npm run vouchers:smoke`
(cần Docker Engine và image `postgres:16-alpine`; kiểm tra JWT/quota đồng thời/rollback,
tự dọn container test và không dùng DB đồ án).
Phạm vi, kết quả và phần chờ tích hợp nằm ở [PR #47](https://github.com/nhom6cnpm/brewlite-a2/pull/47)
và [ma trận truy vết](docs/traceability-matrix.md).

## Thanh toán Sprint 2 — Issue #36

Nguồn chuyển từ A1 `Bai_Tap_Lon_CNPM`, commit `92a43f4`: trang `pay`,
`mock-bank`, proxy ngân hàng và `lib/payments/*`; chỉnh lại theo API A2 (#34,
PR #52). Đợt này dùng **ngân hàng giả lập + nhân viên xác nhận**, theo #36.

- `/pay/order/:orderId`: chọn Ví hoặc Thẻ cho đơn đã tạo, tổng tiền lấy lại từ
  `GET /orders/:id`. Component dùng chung:
  [`PaymentMethodPicker`](apps/web/src/components/payments/PaymentMethodPicker.tsx).
  Mai (#35) có thể nhúng `<PaymentMethodPicker orderId={orderId} />` trong checkout,
  hoặc chuyển đến `paymentSelectionPath(orderId)` từ `lib/payments/links.ts`.
- `POST /payments` gửi `{ orderId, method }` và `Idempotency-Key`, không gửi giá.
  Khóa được lưu trước khi gửi, tách theo tài khoản/đơn/phương thức. Mất phản hồi
  thì dùng lại khóa cũ; phiên FAILED/CANCELLED được dọn khóa tương ứng, lần thử
  tiếp theo dùng khóa mới trên cùng đơn. Nút gửi khóa trong lúc chờ và kiểm tra
  lại trạng thái đơn trước khi tạo phiên.
- `/pay/:paymentId`: Ví có QR thật (`qrcode.react`) mở
  `/mock-bank/:paymentId`; Thẻ chỉ hướng dẫn quẹt tại quầy và chờ nhân viên.
  Không nhập số thẻ giả, không có nút khách tự xác nhận thanh toán.
- `/mock-bank/:paymentId` **không cần đăng nhập**: số tiền cố định từ server,
  nội dung chuyển khoản bằng mã đơn. Nút “Chuyển tiền (mô phỏng)” gọi proxy
  `/api/mock-bank/:paymentId` → `POST /mock-bank/payments/:id/transfer`.
  Proxy không chuyển JWT, cookie hay số tiền do trình duyệt gửi lên API.
- Polling mỗi 3 giây: TRANSFER_RECEIVED hiển thị chờ nhân viên, đơn vẫn PENDING;
  SUCCESS **và** đơn PAID mới chuyển đến `/orders/:id/confirmation` của Ân (#37).
  Nếu đơn đã PREPARING/READY/COMPLETED thì mở chi tiết đơn. FAILED cho thử lại
  cùng đơn nếu còn hạn; CANCELLED đóng thao tác thanh toán. Đồng hồ chỉ hiển thị:
  hết giờ chờ trạng thái server, không tự hủy đơn đã nhận tiền đúng hạn.
- Đổi/thoát tài khoản hủy yêu cầu của phiên cũ; lỗi API hiển thị để thử lại,
  không tạo dữ liệu giả và không xóa giỏ khi thất bại.

**Phối hợp còn lại:** tại main `702132f`, checkout #35 chưa được ghép và trang
xác nhận #37 còn ở PR #53. Phần này không sửa giỏ/checkout/trang đơn của Mai và
Ân, không tạo bản thứ hai của hook xóa giỏ khi PAID. Sau khi ghép #35/#37 cần
kiểm tra lại luồng từ giỏ đến nội dung trang xác nhận và chỉ xóa các món thuộc
đơn đã thanh toán theo phần #35.

**Chạy thử:** theo hướng dẫn Docker bên dưới, tạo đơn bằng checkout #35 khi đã
được ghép. Trong lúc chờ, có thể tạo đơn thật bằng Swagger `POST /orders` (JWT,
Idempotency-Key), rồi mở `/pay/order/<orderId>`. Dùng API admin trong Swagger
để xác nhận/từ chối (giao diện admin thuộc đợt sau). Thanh toán giả lập không
trừ tiền thật. API quyết định giá, quyền sở hữu, hạn đơn và ghi tiền một lần.

**QR bằng điện thoại:** máy và điện thoại cùng Wi-Fi, mở web qua IP LAN thay
`localhost`. `NEXT_PUBLIC_APP_URL` là địa chỉ web mà điện thoại truy cập được
(cần build lại nếu đổi biến public); cấu hình localhost được thay bằng origin
LAN khi khách đang mở web bằng LAN. Proxy server dùng `API_INTERNAL_URL`
(`http://api:3001` trong Compose), nên điện thoại không cần gọi API localhost.
Điện thoại chỉ cần trang ngân hàng công khai; không cần đăng nhập tài khoản khách.

**Kiểm tra:** Node 24, trong `apps/web`: `npm ci` → `npm run lint` → `npm test`
→ `npm run build`. WEB-T80..T85 trong [ma trận truy vết](docs/traceability-matrix.md)
bao gồm validate dữ liệu, khóa chống trùng, chọn phương thức, polling/kết quả,
ngân hàng công khai và proxy. Kiểm tra trình duyệt local với API/PostgreSQL riêng:
Ví → chuyển tiền → nhân viên xác nhận; từ chối/hoàn tiền → thử lại cùng đơn bằng
Thẻ; khách xác nhận bị 403; đơn chưa chuyển tiền hết hạn bị CANCELLED. Đã kiểm
tra chuyển hướng đúng URL xác nhận, chưa kiểm tra nội dung trang #37 ở main.
Phần thanh toán vừa màn hình 390px; Header chung trên main còn tràn ngang khi
đăng nhập trên màn hình này, nằm ngoài phần file của #36.

## Hướng dẫn Chạy cục bộ (Local Development)

Người đánh giá hoặc nhà phát triển bên ngoài có thể khởi chạy toàn bộ hệ thống BrewLite A2 trên máy cá nhân theo 1 trong 2 phương án:

### Phương án 1: Khởi chạy nhanh bằng Docker Compose (Khuyên dùng)
Dùng một lệnh ở thư mục gốc repository để khởi chạy đồng thời cả 3 dịch vụ (**PostgreSQL 16**, **NestJS API**, **Next.js Web**):

1. Tạo file `.env` từ mẫu nếu muốn tuỳ chỉnh biến môi trường:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Build và khởi chạy toàn bộ hệ thống:
   ```bash
   docker compose up --build
   ```
   - `postgres`: chạy PostgreSQL 16 (port `5432`), lưu dữ liệu vào volume `pgdata`.
   - `api`: chờ `postgres` healthy rồi khởi động ở port `3001`, tự động chạy TypeORM migration để tạo bảng và seed dữ liệu mẫu (`p1`..`p6`, công thức, admin) khi khởi động.
   - `web`: chờ `api` healthy (qua `GET /health`) rồi khởi động Next.js ở port `3000`. Các biến `NEXT_PUBLIC_*` được truyền qua `build-arg` lúc đóng gói image.

3. Kiểm tra hoạt động:
   - API healthcheck: mở `http://localhost:3001/health` → trả về HTTP `200` với `{"status":"ok"}`.
   - Tài liệu API (Swagger UI): xem và test API tại `http://localhost:3001/api/docs` (JSON schema tại `http://localhost:3001/api/docs-json`).
   - API danh sách món: mở `http://localhost:3001/products` → trả về 6 sản phẩm mẫu.
   - Giao diện Web Menu: mở `http://localhost:3000/menu` → hiển thị thực đơn đầy đủ hình ảnh và giá.

4. Dừng và tái tạo lại database từ đầu (xóa volume):
   ```bash
   docker compose down -v
   docker compose up --build
   ```
   Khi khởi động lại, toàn bộ bảng và dữ liệu mẫu sẽ được tạo lại tự động từ migration.

---

### Phương án 2: Chạy trực tiếp bằng Node.js & PostgreSQL cục bộ (Native Dev)

Dành cho phát triển hoặc kiểm thử độc lập từng service với hot-reload:

1. **Yêu cầu môi trường**:
   - Node.js 24.x LTS (khớp phiên bản CI & Docker).
   - PostgreSQL 16 (chạy tại `localhost:5432`). Tạo cơ sở dữ liệu `brewlite`:
     ```powershell
     & "psql" -U brewlite -d postgres -c "CREATE DATABASE brewlite;"
     ```

2. **Cấu hình biến môi trường**:
   - Thư mục gốc repo:
     ```powershell
     Copy-Item .env.example .env
     ```
   - Thư mục `apps/web`:
     ```powershell
     cd apps/web
     Copy-Item .env.example .env.local
     cd ../..
     ```

3. **Khởi chạy Backend NestJS API (`apps/api`)**:
   ```powershell
   cd apps/api
   npm ci
   npm run start:dev
   ```
   - API lắng nghe tại `http://localhost:3001`.
   - TypeORM migrations tự động chạy khi khởi động, nạp đầy đủ 6 sản phẩm `p1`..`p6`, công thức định lượng nguyên liệu kho, tài khoản admin `admin@brewlite.vn` và các voucher mặc định.
   - Swagger UI tương tác sẵn sàng tại `http://localhost:3001/api/docs`.

4. **Khởi chạy Frontend Next.js Web (`apps/web`)**:
   Mở terminal riêng:
   ```powershell
   cd apps/web
   npm ci
   npm run dev
   ```
   - Ứng dụng web PWA mở tại `http://localhost:3000` (truy cập `http://localhost:3000/menu`).

---

## Hướng dẫn Đóng gói & Build (Production Build)

Toàn bộ hai phân hệ được đóng gói và biên dịch sẵn sàng cho môi trường production:

### 1. Build Backend API (`apps/api`)
```powershell
cd apps/api
npm ci
npm run build
```
- Nest CLI biên dịch mã nguồn TypeScript thành JavaScript chuẩn trong thư mục `apps/api/dist/`. Điểm khởi chạy: `dist/main.js`.

### 2. Build Frontend Web PWA (`apps/web`)
```powershell
cd apps/web
npm ci
npm run build
```
- Next.js 15 đóng gói giao diện, nhúng tĩnh các biến `NEXT_PUBLIC_*` và xuất bản bản build production tối ưu hóa tại thư mục `.next/`.

---

## Hướng dẫn Kiểm thử Hệ thống (Testing Guide)

Hệ thống hỗ trợ đầy đủ các cấp độ kiểm thử tự động, có thể thực thi độc lập cục bộ:

### 1. Kiểm tra quy chuẩn cú pháp (Linting)
- **Frontend Web**:
  ```powershell
  cd apps/web
  npm run lint
  ```
- **Backend API**:
  ```powershell
  cd apps/api
  npm run lint
  ```

### 2. Chạy Unit Tests
- **Frontend Web (Vitest)**:
  ```powershell
  cd apps/web
  npm test
  ```
  *(Chạy 20 test files với hơn 152 bài kiểm thử cho toàn bộ components, hooks, giỏ hàng, vouchers, thanh toán và trang quản trị).*
- **Backend API (Jest)**:
  ```powershell
  cd apps/api
  npm test
  ```
  *(Chạy 23 test suites với hơn 273 bài kiểm thử cho services, controllers, guards, máy trạng thái).*

### 3. Chạy Integration Tests (PostgreSQL thật)
Kiểm thử tích hợp luồng nghiệp vụ tạo đơn và thanh toán trực tiếp với PostgreSQL thật:
```powershell
cd apps/api
$env:TEST_DATABASE_URL = "postgresql://brewlite:brewlite@localhost:5432/brewlite_test"
npm run test:integration
```
*(Chi tiết 10 kịch bản kiểm thử xem tại mục bên dưới).*

### 4. Chạy Smoke Tests (Kiểm thử khói môi trường CD)
- **Kiểm thử hợp đồng Smoke Test cục bộ**:
  ```powershell
  node --test tests/smoke-test.test.mjs
  ```
- **Kiểm thử trực tiếp trên môi trường live production**:
  ```powershell
  $env:RENDER_API_BASE_URL = "https://brewlite-a2-api-ked5.onrender.com"
  $env:RENDER_WEB_BASE_URL = "https://brewlite-a2-web.onrender.com"
  node scripts/smoke-test.mjs
  ```

---

## Chạy Web Sprint 1 (Task 4.3)

Web trong `apps/web` gồm menu và trang chi tiết món (ảnh, tên, giá).
Giỏ hàng, đăng nhập, size/topping, tồn kho và thanh toán sẽ thêm ở Task 5.

Dùng Node 24 (cùng phiên bản chính với CI). Chạy trong terminal tại repo:

**PowerShell (Windows):**

```powershell
cd apps/web
npm ci
Copy-Item .env.example .env.local
npm run dev
```

**macOS/Linux:**

```bash
cd apps/web
npm ci
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000/menu`. Chỉ tạo `.env.local` nếu chưa có;
đặt `NEXT_PUBLIC_API_URL` tới địa chỉ API mà trình duyệt truy cập được.
Thay biến này thì khởi động lại Web; bản production cần build lại.

API sản phẩm do Tài thực hiện riêng trong PR #21 (Task 4.3):
- `GET /products`: mảng sản phẩm.
- `GET /products/:id`: một sản phẩm, hoặc HTTP 404 nếu không tồn tại.
- Mỗi sản phẩm có `{ id: string, name: string, price: number, imageUrl: string }`;
  giá là số tiền VND, ảnh dùng `/images/*.jpg`, chưa có trường `stock`.

Cần chạy API cùng PostgreSQL để xem dữ liệu thật. Nếu API chưa chạy,
Web hiển thị lỗi và nút **Thử lại**, không thay bằng dữ liệu mẫu.
Chỉ nghiệm thu toàn luồng sau khi API, Web và CI đã kiểm tra cùng nhau.

### Kiểm tra Web

Trong `apps/web`:

```powershell
npm run lint
npm test
npm run build
```

Test dùng Vitest 3, Vite 6, jsdom 26 và Testing Library (jest-dom 6)
để tương thích Node 24. Test component giả lập phản hồi `fetch`,
kiểm tra menu loading/rỗng/lỗi/thử lại, tên/giá và liên kết chi tiết;
trang chi tiết kiểm tra loading, dữ liệu không có tồn kho, 404 và lỗi/thử lại.
Các test này không thay thế kiểm tra tích hợp với API và PostgreSQL.

## Chi tiết món — Sprint 2, đợt 1 (Issue #29)

Trang `/products/[id]` bổ sung size S/M/L, topping Kem béo/Trân châu,
số lượng và giá theo lựa chọn. Phụ phí dùng chung với store giỏ hàng:
M +5.000đ, L +10.000đ, mỗi topping +5.000đ. Backend vẫn phải tính lại giá
chính thức khi tạo đơn ở đợt 2.

- `POST /products/availability` nhận `{ items: [{ productId, size, toppingIds, qty }] }`;
  phản hồi `{ available, items: [{ productId, size, toppingIds, qty, stock }] }`.
  `stock` là số ly tối đa của dòng sau khi dành nguyên liệu cho các dòng còn lại.
- Trang gửi cả các dòng đang có trong giỏ và lựa chọn mới, cập nhật khi đổi tùy chọn,
  tự kiểm tra lại mỗi 15 giây/khi quay lại tab. Trước khi thêm, kiểm tra lại với
  đúng số lượng khách chọn. Hết/vượt nguyên liệu hoặc tổng cùng lựa chọn quá 99 ly
  thì khóa thêm; lỗi API hiện thông báo và cho thử lại.
- Dữ liệu availability được kiểm tra cấu trúc, đúng lựa chọn và tính nhất quán.
  Giao diện không thay dữ liệu thật bằng mẫu khi API lỗi hoặc chưa có endpoint.
- Thêm món dùng `store/useCart.ts` (Zustand persist); chỉ lưu giỏ ở trình duyệt,
  chưa tạo đơn hay giữ nguyên liệu trong database. Trang giỏ và badge do Issue #30
  phụ trách, thanh toán thuộc đợt 2 (#36).

**Nguồn và phụ thuộc:** chuyển cách chọn món/hook/API từ A1
`Bai_Tap_Lon_CNPM` commit `92a43f4`, sửa theo giao diện A2. Trang chi tiết dùng
`store/useCart.ts`, `lib/productOptions.ts` và `hooks/useHydrated.ts` dùng chung
đã có trên `main`; dependency giỏ hàng là `zustand ^5.1.0`.
API kho Issue #28 của Tài vẫn đang được triển khai; chỉ nghiệm thu toàn luồng
sau khi API availability vào `main` và được kiểm tra cùng Web/PostgreSQL thật.

**Kiểm tra:** `npm run lint`, `npm test`, `npm run build` trong `apps/web`, Node 24.
Component test dùng phản hồi fetch giả lập để kiểm tra đúng giá, số ly, lỗi/thử lại,
gửi đúng toàn giỏ, thay đổi kho/giỏ khi đang kiểm tra, bấm lặp và giới hạn 99 ly.
Test API client kiểm tra payload, AbortSignal, lỗi backend và dữ liệu trả về sai.
Các mã `WEB-T20..T31`, `WEB-T40..T45` được ghi trong ma trận truy vết.
Các test này chưa chứng minh API/PostgreSQL thật chạy cùng giao diện.

## Integration test API tạo đơn và thanh toán — Task 5.2 Đợt 2 (Issue #38)

Bộ kiểm thử tích hợp (Integration Test) kiểm thử trực tiếp các API thật với cơ sở dữ liệu **PostgreSQL thật** thông qua TypeORM và Supertest, đặt tại thư mục `apps/api/test/order-payment.integration-spec.ts`.

### Cách chạy kiểm thử cục bộ:
1. Đảm bảo PostgreSQL đang chạy (ví dụ database `brewlite_test`):
   ```powershell
   # Tạo database test nếu chưa có
   & "psql" -U brewlite -d postgres -c "CREATE DATABASE brewlite_test;"
   ```
2. Chạy lệnh integration test trong thư mục `apps/api`:
   ```bash
   cd apps/api
   export TEST_DATABASE_URL="postgresql://brewlite:brewlite@localhost:5432/brewlite_test"
   npm run test:integration
   ```
   *(Tên database trong `TEST_DATABASE_URL` bắt buộc phải có hậu tố `_test` để bảo vệ dữ liệu dev/production).*

### Các kịch bản kiểm thử trọng tâm (10 test cases):
1. **Tạo đơn thành công (`INT-T01`, FR-05)**: Gọi `POST /orders` tạo đơn `PENDING`, lưu snapshot món, tính giá và hạn thanh toán 15 phút (`expiresAt`), trừ kho nguyên liệu theo đúng định lượng (`recipe_items`) và ghi nhận `order_request_keys`.
2. **Idempotency-Key đồng thời (`INT-T01`, FR-05)**: Gửi 10 request `POST /orders` cùng `Idempotency-Key` đồng thời → hệ thống trả về cùng một mã đơn hàng duy nhất, trừ kho nguyên liệu đúng 1 lần. Gửi lại cùng key nhưng đổi giỏ hàng bị từ chối với `409 Conflict`.
3. **Tranh chấp nguyên liệu — Không bán vượt (`INT-T04`, FR-07, NFR-01)**: Đặt kho cà phê chỉ đủ làm đúng 1 ly cuối (`quantity = 18`). 20 khách hàng gửi request đặt đơn đồng thời → cơ chế **Optimistic Locking** (cột `version`) đảm bảo **chính xác 1 khách đặt thành công**, 19 khách còn lại bị từ chối/hết hàng. Tồn kho về đúng 0g, tuyệt đối không bị bán vượt âm kho.
4. **Máy trạng thái đơn hàng (`INT-T04`, FR-10)**: Kiểm soát nghiêm ngặt sơ đồ chuyển trạng thái `ORDER_TRANSITIONS`, chặn mọi hành vi chuyển trạng thái bất hợp lệ (ví dụ `PENDING` → `READY`, `COMPLETED` → `PENDING`).
5. **Tự hủy và hoàn kho khi quá hạn (`INT-T04`, FR-10)**: Quét đơn hàng `PENDING` quá hạn 15 phút → tự động hủy đơn (`CANCELLED`) và hoàn trả toàn bộ nguyên liệu đã giữ về kho.
6. **Thanh toán Ví qua ngân hàng giả lập (`INT-T02`, `INT-T03`, FR-07, FR-08)**: Khách tạo phiên thanh toán Ví `PENDING` → tra cứu thông tin chuyển khoản → bấm chuyển tiền trên ngân hàng giả lập `POST /mock-bank/payments/:id/transfer` ghi nhận dòng `IN` vào sổ sao kê `bank_transactions` (phiên thành `TRANSFER_RECEIVED`, đơn vẫn `PENDING`). Chuyển tiền lặp lại không ghi tiền lần 2. Khách thường gọi xác nhận bị chặn `403 Forbidden`. Nhân viên đối soát và xác nhận `POST /admin/payments/:id/confirm` → đơn chuyển `PAID` và phiên thành `SUCCESS`.
7. **Từ chối thanh toán & Hoàn tiền đúng 1 lần (`INT-T02`, FR-07)**: Khi đơn có tiền trong sao kê nhưng nhân viên từ chối `POST /admin/payments/:id/reject` → sổ sao kê ghi nhận giao dịch `REFUND` hoàn tiền đúng 1 lần, đơn chuyển sang `PAYMENT_FAILED`. Khách có thể tạo phiên thanh toán mới để thử lại.
8. **Thanh toán Thẻ tại quầy (`INT-T03`, FR-08)**: Khách chọn `CARD` → nhân viên xác nhận tại quầy tự động ghi nhận giao dịch `IN` vào sao kê và chuyển đơn sang `PAID`.
9. **Chặn xác nhận đơn quá hạn (`INT-T03`, FR-08)**: Nhân viên xác nhận đơn đã quá hạn 15 phút sẽ bị từ chối (`400 Bad Request`), đơn tự động bị hủy và hoàn trả nguyên liệu.

### Continuous Integration (CI)
Pipeline CI GitHub Actions trong `.github/workflows/ci.yml` bổ sung job `integration` chạy song song với service container `postgres:16-alpine`, đảm bảo toàn bộ bộ test integration được tự động kiểm chứng và xanh 100% trên mỗi Pull Request.

## Continuous Integration (CI)

Dự án áp dụng quy trình kiểm thử và tích hợp liên tục (CI) tự động bằng GitHub Actions thông qua workflow [ci.yml](.github/workflows/ci.yml).

### Pipeline gồm những gì?
Mỗi Pull Request và commit đẩy lên nhánh `main` đều phải vượt qua 4 chặng quality gate tự động:
1. **Install (`npm ci`)**: Cài đặt phụ thuộc dựa trên `package-lock.json`, bật cache npm để tăng tốc độ thực thi.
2. **Lint (`npm run lint`)**:
   - `apps/web`: Kiểm tra lỗi cú pháp và phong cách mã nguồn bằng **ESLint** (Next.js config).
   - `apps/api`: Kiểm tra mã nguồn với **Oxlint** (`--type-aware`, do Phúc cấu hình).
3. **Unit Test (`npm test`)**:
   - `apps/web`: Chạy toàn bộ unit/component test với **Vitest** (không cần database).
   - `apps/api`: Chạy toàn bộ unit test với **Jest** (không cần database; kiểm thử integration với PostgreSQL dành cho Task 5.2).
4. **Build (`npm run build`)**:
   - `apps/web`: Đóng gói ứng dụng Next.js (`next build`) với biến môi trường mẫu `NEXT_PUBLIC_API_URL: http://localhost:3001` (không đưa secret vào workflow).
   - `apps/api`: Biên dịch NestJS (`nest build`).

### Chạy khi nào?
- Khi mở hoặc cập nhật một **Pull Request** vào nhánh `main`.
- Khi có commit được **push** trực tiếp vào nhánh `main` (sau khi merge PR).

### Xem kết quả ở đâu?
- Xem danh sách và lịch sử thực thi tại tab **Actions**: [GitHub Actions Workflows](https://github.com/nhom6cnpm/brewlite-a2/actions/workflows/ci.yml).
- Xem trạng thái trực tiếp của từng bước kiểm tra (status checks) ngay tại giao diện Pull Request trên GitHub.

### Quy tắc bảo vệ nhánh (Branch Protection)
Nhánh `main` được áp dụng branch protection với các chính sách bắt buộc:
- Bắt buộc merge thông qua **Pull Request** (chặn push trực tiếp vào `main`).
- Bắt buộc có ít nhất **1 người review và approve**.
- Bắt buộc các status check CI (`web`, `api`) phải vượt qua (pass) thành công mới được phép merge.

### Minh chứng CI (Task 4.4)
- **CI chạy thành công**: [Pull Request #24](https://github.com/nhom6cnpm/brewlite-a2/pull/24), [Workflow Run #42592007019](https://github.com/nhom6cnpm/brewlite-a2/actions/runs/42592007019) — job `api` và `web` qua đủ 4 bước. Log: [docs/ci/ci-success-log.txt](docs/ci/ci-success-log.txt)
- **CI phát hiện lỗi**: [Pull Request #25](https://github.com/nhom6cnpm/brewlite-a2/pull/25) (cố ý làm hỏng test), [Workflow Run #42592401582](https://github.com/nhom6cnpm/brewlite-a2/actions/runs/42592401582) — job `web` dừng ở bước test. Log: [docs/ci/ci-failure-log.txt](docs/ci/ci-failure-log.txt), ảnh: [docs/ci/ci-failure.png](docs/ci/ci-failure.png)
- Chi tiết: [docs/ci/README.md](docs/ci/README.md)

## Continuous Delivery (CD) & Triển khai Production

Hệ thống áp dụng quy trình phân phối liên tục (Continuous Delivery) tự động hóa thông qua GitHub Actions tại workflow [cd.yml](.github/workflows/cd.yml), đáp ứng đầy đủ các tiêu chuẩn của đề tài (Task 5.3 & Task 5.4):

### 1. Quy trình 7 bước (The 7-Step Pipeline)
1. **Quality Gate:** Tự động chạy lại toàn bộ quy trình kiểm thử chất lượng (`npm ci` → `npm run lint` → `npm test` → `npm run build`) song song cho cả `apps/api` và `apps/web`.
2. **Gắn thẻ Container Image:** Đóng gói Docker image đa tầng dựa trên **Node 24 Alpine** (`node:24-alpine`). Gắn thẻ theo commit SHA (`sha-<short_sha>`, `sha-<long_sha>`), phiên bản ngữ nghĩa (`vX.Y.Z`) và `latest`.
3. **Đẩy lên Registry (GHCR):** Tự động xác thực và đẩy 2 image lên GitHub Container Registry:
   - API: `ghcr.io/nhom6cnpm/brewlite-api`
   - Web: `ghcr.io/nhom6cnpm/brewlite-web` (nhúng tĩnh các biến `NEXT_PUBLIC_*` thông qua `--build-arg`).
4. **Triển khai Production (Render):** Kích hoạt webhook Render Deploy Hooks bằng secrets an toàn (`RENDER_API_DEPLOY_HOOK`, `RENDER_WEB_DEPLOY_HOOK`), không lộ secret trong mã nguồn hay log CI.
5. **Migration an toàn:** API chạy đơn bản thể (1 replica), TypeORM tự động thực thi các migration mới trong Database Transaction khi khởi động trước khi mở cổng HTTP.
6. **Kiểm thử khói (Smoke Test):** Script [scripts/smoke-test.mjs](scripts/smoke-test.mjs) kiểm tra thực tế:
   - `GET /health`: Đảm bảo API online, kết nối PostgreSQL lành mạnh, và khớp đúng commit vừa deploy (`200 OK`).
   - `GET /products`: Đảm bảo dữ liệu mẫu A2 (`p1`..`p6`) đã sẵn sàng và ORM truy vấn bình thường (`200 OK`).
   - `GET /`: Đảm bảo giao diện người dùng Next.js phục vụ bình thường (`200 OK`).
   - Hỗ trợ retry backoff (24 lần × 10 giây) để đáp ứng thời gian Render pull image và khởi động.
7. **Dừng pipeline và Rollback:** Nếu smoke test không đạt sau các lần thử, pipeline lập tức dừng lại (đánh dấu thất bại đỏ) và in hướng dẫn rollback chi tiết.

> [!IMPORTANT]
> **3 việc bắt buộc trước khi merge CD vào `main` để pipeline chạy XANH:**
> 1. **Đổi 2 service Render sang deploy từ Image:** Cấu hình `brewlite-a2-api` và `brewlite-a2-web` sang chế độ *Deploy an existing image* (`ghcr.io/nhom6cnpm/brewlite-api` và `brewlite-web`), vì Deploy Hook chỉ nhận tham số `&imgURL=` khi service chạy từ image.
> 2. **Thêm 2 secret Deploy Hook vào GitHub:** Cấu hình `RENDER_API_DEPLOY_HOOK` và `RENDER_WEB_DEPLOY_HOOK` trong repository secrets (`Settings → Secrets and variables → Actions`).
> 3. **Phân quyền GHCR sau lần push đầu tiên:** Sau khi pipeline push image lần đầu, chuyển 2 package trên GitHub Packages (`ghcr.io`) sang chế độ Public (hoặc cấu hình Registry Credential trên Render) để Render có quyền kéo image.

### 2. Địa chỉ dịch vụ Production (Cụm A2)
| Dịch vụ | Nền tảng | URL Production (A2) | Ghi chú & Bảo mật |
|---|---|---|---|
| **Frontend Web** | Render Web Service | [https://brewlite-a2-web.onrender.com](https://brewlite-a2-web.onrender.com) | Next.js 15 PWA, HTTPS tự động |
| **Backend API** | Render Web Service | [https://brewlite-a2-api-ked5.onrender.com](https://brewlite-a2-api-ked5.onrender.com) | NestJS 11 REST API, HTTPS tự động |
| **Health Check** | API Endpoint | [https://brewlite-a2-api-ked5.onrender.com/health](https://brewlite-a2-api-ked5.onrender.com/health) | Trả về `{"status":"ok","database":"up","commit":"..."}` |
| **Swagger Docs** | API Endpoint | [https://brewlite-a2-api-ked5.onrender.com/api/docs](https://brewlite-a2-api-ked5.onrender.com/api/docs) | Tra cứu và thử nghiệm API với Bearer JWT |
| **Database** | Render Managed PostgreSQL 16 | Cổng nội bộ `:5432` | Kết nối nội bộ qua Private Network giữa API và DB |

### 3. Quy trình Triển khai & Phục hồi / Rollback
- **Tự động qua CD Pipeline**: Khi mã nguồn được merge vào `main` hoặc tạo tag `v*`, workflow `.github/workflows/cd.yml` tự động đóng gói, push image lên GHCR, kích hoạt Render hook và smoke test nghiệm thu.
- **Phương án 1 (Rollback tức thời qua Render Dashboard)**: Truy cập Render Dashboard → Chọn service (`brewlite-a2-api` hoặc `brewlite-a2-web`) → Tab **Events** → Chọn bản deploy thành công trước đó → Bấm **Rollback to this deploy** (thực hiện trong ≤ 30 giây).
- **Phương án 2 (Rollback theo tag qua Deploy Hook / Manual Deploy)**: Gọi Render Deploy Hook kèm tham số `imgURL` trỏ về image commit SHA trước đó:
  ```bash
  curl -fsS -X POST "${RENDER_API_DEPLOY_HOOK}&imgURL=ghcr.io/nhom6cnpm/brewlite-api:sha-<commit_cu>"
  ```
  hoặc cập nhật Image URL trên Render Dashboard về tag commit SHA ổn định rồi bấm *Manual Deploy*.

> Chi tiết cấu hình biến môi trường, tài liệu kiến trúc [ADR-008](docs/architecture/adr/008-nen-tang-trien-khai.md) và hướng dẫn triển khai xem tại [docs/deployment.md](docs/deployment.md).

## Kiểm thử API bằng Swagger UI & Postman (Task 5.4 — Phúc)

Để phục vụ công tác bàn giao, kiểm định độc lập và kiểm tra trực tiếp từ giảng viên, toàn bộ hệ thống API của BrewLite A2 được cung cấp đầy đủ qua **Swagger UI chuẩn OpenAPI 3.0** và **Bộ sưu tập kiểm thử Postman Collection** có sẵn biến môi trường.

### 1. Tài liệu OpenAPI Spec 3.0 JSON
- Định nghĩa OpenAPI 3.0 hoàn chỉnh được trích xuất trực tiếp từ mã nguồn backend tại:
  👉 [`docs/api/openapi.json`](docs/api/openapi.json)
- Endpoint phục vụ trực tiếp từ API server:
  - Local: `http://localhost:3001/api/docs-json`
  - Production: [https://brewlite-a2-api-ked5.onrender.com/api/docs-json](https://brewlite-a2-api-ked5.onrender.com/api/docs-json)

### 2. Kiểm thử tương tác trực tiếp qua Swagger UI
Swagger UI là công cụ trực quan chạy ngay trên trình duyệt, không yêu cầu cài đặt thêm bất kỳ phần mềm nào:
- **Địa chỉ truy cập**:
  - Khi chạy Local: `http://localhost:3001/api/docs`
  - Trên Production Cloud: [https://brewlite-a2-api-ked5.onrender.com/api/docs](https://brewlite-a2-api-ked5.onrender.com/api/docs)

#### Cách lấy JWT Token để xác thực trên Swagger:
Hệ thống hỗ trợ 2 vai trò: Khách hàng (`CUSTOMER`) và Quản trị viên (`ADMIN`).
1. **Lấy Token Khách hàng**:
   - Trong Swagger UI, tìm nhóm **Auth** → mở endpoint `POST /auth/register` (hoặc `POST /auth/login`).
   - Nhập body JSON (ví dụ email: `customer_test@example.com`, password: `Password123!`) → bấm **Execute**.
   - Copy chuỗi `access_token` trong JSON phản hồi (Status `200` hoặc `201`).
2. **Lấy Token Quản trị viên (Admin)**:
   - Mở endpoint `POST /auth/login`.
   - Nhập thông tin tài khoản admin mặc định:
     ```json
     {
       "email": "admin@brewlite.vn",
       "password": "admin123"
     }
     ```
     *(Lưu ý: Nếu mật khẩu đã đổi theo cấu hình A1, dùng `admin123`).*
   - Bấm **Execute** và copy chuỗi `access_token`.
3. **Kích hoạt xác thực (Authorize)**:
   - Kéo lên đầu trang Swagger, bấm nút **Authorize** có biểu tượng ổ khóa [🔒].
   - Tại ô **Value**, dán token vừa copy vào (Swagger đã cấu hình Bearer Auth).
   - Bấm **Authorize** → bấm **Close**.
   - Biểu tượng ổ khóa sẽ chuyển sang trạng thái đã khóa [🔒]. Từ đây, mọi request gửi từ Swagger sẽ tự động đính kèm header `Authorization: Bearer <token>`.

---

### 3. Kiểm thử tự động bằng Postman Collection
Bộ sưu tập Postman Collection hoàn chỉnh đã được xây dựng và đóng gói sẵn tại:
👉 [`docs/api/brewlite.postman_collection.json`](docs/api/brewlite.postman_collection.json)

#### Các bước thiết lập trong Postman:
1. **Import Collection**:
   - Mở phần mềm Postman (hoặc Postman for Web).
   - Bấm nút **Import** ở góc trên bên trái → chọn file `docs/api/brewlite.postman_collection.json`.
   - Collection mang tên **"BrewLite A2 - Complete API Collection"** với 9 thư mục nghiệp vụ sẽ xuất hiện.
2. **Cấu hình biến môi trường (Variables)**:
   - Bấm chọn vào tên Collection **BrewLite A2 - Complete API Collection** → chọn tab **Variables**:
     | Biến | Giá trị mặc định (Local) | Giá trị Production | Ghi chú |
     |---|---|---|---|
     | `baseUrl` | `http://localhost:3001` | `https://brewlite-a2-api-ked5.onrender.com` | Địa chỉ API server |
     | `token` | *(Tự động gán)* | *(Tự động gán)* | JWT của khách hàng |
     | `adminToken` | *(Tự động gán)* | *(Tự động gán)* | JWT của quản trị viên |
     | `orderId` | *(Tự động gán)* | *(Tự động gán)* | ID đơn hàng vừa tạo |
     | `paymentId` | *(Tự động gán)* | *(Tự động gán)* | ID phiên thanh toán |
     | `voucherCode`| `THU5K` | `THU5K` | Mã voucher mẫu |
   - *(Bộ test script đã được viết sẵn trong collection để tự động lưu `token`, `adminToken`, `orderId`, `paymentId` vào biến sau mỗi request thành công).*

#### Kịch bản kiểm thử luồng nghiệp vụ mẫu từ A đến Z (Happy Path):
Để kiểm tra toàn bộ luồng hoạt động của hệ thống từ lúc khách đặt món đến lúc nhân viên đối soát, thực hiện theo thứ tự sau:
1. **Thư mục 01. Health Check**: Chạy `GET /health` → đảm bảo status: ok, database: up.
2. **Thư mục 02. Auth**:
   - Chạy `POST /auth/register` (hoặc `POST /auth/login`) → biến `token` tự động được gán.
   - Chạy `POST /auth/login (Admin)` → biến `adminToken` tự động được gán.
   - Chạy `GET /auth/me` → xem thông tin người dùng và điểm tích lũy.
3. **Thư mục 03. Products & Availability**:
   - Chạy `GET /products` → xem 6 món cà phê A2.
   - Chạy `GET /products/1/availability?size=L&toppingIds=cream,pearls` → xem số ly còn làm được.
4. **Thư mục 04. Vouchers**:
   - Chạy `GET /vouchers` → xem danh sách voucher kích hoạt (`THU5K`, `BREW10`, `NHOM15K`).
   - Chạy `POST /vouchers/quote` (có mã `THU5K`) → xem giảm giá 5.000đ.
5. **Thư mục 05. Orders**:
   - Chạy `POST /orders` (với `Idempotency-Key` ngẫu nhiên sinh tự động) → đơn tạo ở trạng thái `PENDING`, hạn 15 phút, kho bị trừ nguyên liệu, biến `orderId` tự động được lưu.
   - Chạy `GET /orders/me` → xem đơn hàng trong danh sách của khách.
6. **Thư mục 06. Payments**:
   - Chạy `POST /payments` (phương thức `WALLET`) → tạo phiên thanh toán ví, biến `paymentId` tự động được lưu.
7. **Thư mục 07. Mock Bank (Khách chuyển tiền)**:
   - Chạy `GET /mock-bank/payments/:id` (công khai không cần token) → lấy số tiền và thông tin tài khoản ngân hàng.
   - Chạy `POST /mock-bank/payments/:id/transfer` → mô phỏng chuyển tiền, phiên thanh toán chuyển sang `TRANSFER_RECEIVED` (ghi nhận sao kê `IN`), đơn hàng vẫn giữ nguyên `PENDING` chờ đối soát.
8. **Thư mục 08. Admin Payments (Nhân viên đối soát & xác nhận)**:
   - Chạy `GET /admin/payments` (dùng `{{adminToken}}`) → xem danh sách phiên có tiền chờ duyệt.
   - Chạy `POST /admin/payments/:id/confirm` → nhân viên bấm xác nhận: phiên chuyển `SUCCESS`, đơn hàng chuyển `PAID`, điểm thưởng thành viên được cộng.
9. **Kiểm tra phân quyền bảo mật (RBAC)**:
   - Chạy `GET /admin/payments (Test 403)` (dùng `{{token}}` của khách thường) → hệ thống lập tức từ chối với mã **HTTP 403 Forbidden**.

---

## Quy trình Phát hành & Gắn thẻ phiên bản (Release & Version Tagging)

Sau khi hoàn tất nghiệm thu toàn bộ Sprint 2 và các tiêu chuẩn kiểm thử CI/CD, phiên bản chính thức **v1.0.0** được phát hành theo quy trình sau:

1. **Kiểm tra trạng thái nhánh `main`**: Đảm bảo tất cả Pull Requests thuộc Task 5 đã được merge vào `main` và các luồng CI/CD đều đạt trạng thái xanh (Passed).
2. **Tạo và đẩy Git Release Tag**:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "Release v1.0.0: Hoàn tất toàn bộ yêu cầu đồ án BrewLite A2 (Sprint 1 + Sprint 2, CI/CD, Production Deployment)"
   git push origin v1.0.0
   ```
3. **Kích hoạt tự động CD Release**:
   Khi tag `v1.0.0` được đẩy lên GitHub, workflow `.github/workflows/cd.yml` sẽ tự động kích hoạt:
   - Đóng gói Docker images gắn nhãn `v1.0.0` và `latest`.
   - Đẩy images lên GitHub Container Registry (`ghcr.io`).
   - Kích hoạt triển khai lên Render Production.
   - Chạy Smoke Test kiểm tra nghiệm thu.
4. **Tạo Release Notes trên GitHub**:
   - Truy cập: `https://github.com/nhom6cnpm/brewlite-a2/releases/new`
   - Chọn tag: `v1.0.0`
   - Tiêu đề Release: `BrewLite A2 - Version 1.0.0 Official Release`
   - Nội dung đính kèm danh sách tính năng hoàn thành, liên kết tài liệu SRS, sơ đồ thiết kế, ma trận truy vết, hướng dẫn triển khai và các bài kiểm thử nghiệm thu.
