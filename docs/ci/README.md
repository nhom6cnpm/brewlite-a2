# Minh chứng Continuous Integration (CI) — Task 4.4

Thư mục này lưu trữ các minh chứng thực hiện theo yêu cầu của Assignment 2 (Task 4.4):
1. **Link 1 Pull Request có CI chạy thành công**.
2. **Ảnh và log 1 lần pipeline phát hiện lỗi** (thực hiện qua PR thử nghiệm cố ý làm hỏng test/lint, ghi nhận phát hiện lỗi và đóng PR).

---

## 1. Minh chứng CI chạy thành công
- **Pull Request**: Sẽ được cập nhật sau khi tạo PR cho Task 4.4.
- **Trạng thái**: Tất cả các bước trong job `web` (`Install` → `Lint` → `Unit Test` → `Build`) đều đạt trạng thái thành công (green checkmark).

---

## 2. Minh chứng CI phát hiện lỗi (Quality Gate chặn lỗi)
- **Mục đích**: Kiểm chứng cơ chế bảo vệ của pipeline CI: khi có lỗi trong mã nguồn (lint lỗi, test hỏng hoặc build thất bại), CI phải lập tức báo đỏ (failed) và chặn việc merge mã lỗi vào nhánh `main`.
- **Thực hiện**: Mở PR thử nghiệm cố ý làm hỏng test trong `apps/web`.
- **Kết quả**: Pipeline phát hiện lỗi ở bước `Run unit tests` và dừng lại ngay lập tức.
- **Chi tiết ảnh chụp và log**:
  - Log lỗi: [ci-failure-log.txt](./ci-failure-log.txt)
  - Ảnh minh chứng: [ci-failure.png](./ci-failure.png)
