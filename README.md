# ☕ BrewLite – Assignment 2

[![CI](https://github.com/nhom6cnpm/brewlite-a2/actions/workflows/ci.yml/badge.svg)](https://github.com/nhom6cnpm/brewlite-a2/actions/workflows/ci.yml)

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

## Chạy bằng Docker

Dùng một lệnh ở thư mục gốc repository để khởi chạy đồng thời cả 3 dịch vụ (**PostgreSQL**, **NestJS API**, **Next.js Web**):

1. (Tuỳ chọn) Tạo file `.env` từ mẫu nếu muốn tuỳ chỉnh biến môi trường:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Build và khởi chạy toàn bộ hệ thống:
   ```bash
   docker compose up --build
   ```
   - `postgres`: chạy PostgreSQL 16 (port `5432`), lưu dữ liệu vào volume `pgdata`.
   - `api`: chờ `postgres` healthy rồi khởi động ở port `3001`, tự động chạy TypeORM migration để tạo bảng và seed dữ liệu mẫu khi khởi động.
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


