# ☕ BrewLite – Assignment 2

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
| 3 | Thiết kế kiến trúc | ⏳ Đang làm (#14, #15) |
| 4 | Triển khai Sprint 1 | ⏳ Đang làm ([milestone Sprint 1](https://github.com/nhom6cnpm/brewlite-a2/milestone/1)) |
| 5 | Triển khai Sprint 2, CI/CD và Delivery | ⬜ |

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
