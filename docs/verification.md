# Trạng thái kiểm tra

## Lần kiểm tra đợt 4 (13/10/2026) — Redesign LMS Assignment UX & Trải nghiệm học tập độc lập

Kiểm tra ngày 13/10/2026 trên Windows, Java 21.0.8, Node v24.13.0.  
Stack: Spring Boot 3.5.16, Next.js 16.4.0 (Turbopack), React 19.3.0, PostgreSQL 17 / H2 test mode (Flyway V1 & V2).

| Kiểm tra | Kết quả | Ghi chú |
| :--- | :--- | :--- |
| **Kiến trúc Route độc lập** | **5 dynamic routes biên dịch hoàn hảo** | Chuyển đổi toàn bộ thao tác học tập và chấm bài từ modal/accordion sang trang độc lập: `/courses/[courseId]`, `/courses/[courseId]/lessons/[lessonId]`, `/courses/[courseId]/assignments/new`, `/courses/[courseId]/assignments/[assignmentId]`, `/courses/[courseId]/assignments/[assignmentId]/submissions`. Hỗ trợ truy cập trực tiếp URL và reload F5 không mất dữ liệu hay phiên. |
| **Giao diện đọc bài học** | Hoàn thành | Đọc bài học tập trung (Focused Reading), mục lục khóa học (TOC) cố định bên cạnh, điều hướng bài trước/sau, đánh dấu hoàn thành bài học đồng bộ tức thì với API `/lessons/{id}/progress`. |
| **Trình tạo bài tập giảng viên** | Hoàn thành (Wizard 4 bước) | Wizard trực quan: 1. Thông tin cơ bản -> 2. Soạn câu hỏi trắc nghiệm A/B/C/D hoặc đề bài tự luận -> 3. Thời gian & Thang điểm -> 4. Xem trước & Công bố ngay hoặc Lưu nháp. Tự động lưu toàn bộ ngân hàng câu hỏi vào backend. |
| **Giao diện làm bài sinh viên** | Hoàn thành (Bố cục 2 cột) | Trắc nghiệm: thẻ câu hỏi trực quan, bộ đếm tiến độ (`Đã làm X/Y câu`), xác nhận nộp bài, xem lại câu đúng/sai kèm đáp án chuẩn ngay sau khi nộp. Tự luận: khung soạn thảo có đếm từ/ký tự, cảnh báo nộp trễ, xem lại bài viết và phản hồi của giảng viên. |
| **Bàn chấm điểm Giảng viên** | Hoàn thành (SpeedGrader 2 cột) | Cột trái đọc bài nộp của sinh viên (bài viết hoặc chi tiết trắc nghiệm); cột phải nhập điểm, viết nhận xét và nút "Lưu và sang sinh viên tiếp theo"; thanh chuyển sinh viên trước/sau và bộ lọc Tất cả / Chờ chấm / Đã chấm. |
| **Next.js build** | `npm run build` qua | Turbopack build thành công cả 5 dynamic route (0 lỗi build). |
| **TypeScript** | `npm run typecheck` qua | `tsc --noEmit` đạt 0 lỗi, types an toàn toàn diện. |
| **ESLint** | `npm run lint` qua | Đạt 0 error, 0 warning trên toàn bộ dự án. |
| **Maven test** | **15 test, 0 failure, 0 error, 0 skipped** | Toàn bộ 15 integration test backend tiếp tục chạy qua 100%. |

---

## Lần kiểm tra đợt 3 (13/10/2026) — Module Bài tập & Chức năng học tập cốt lõi

Kiểm tra ngày 13/10/2026 trên Windows, Java 21.0.8, Node v24.13.0.  
Stack: Spring Boot 3.5.16, Next.js 16.4.0 (Turbopack), React 19.3.0, PostgreSQL 17 / H2 test mode (Flyway V1 & V2).

| Kiểm tra | Kết quả | Ghi chú |
| :--- | :--- | :--- |
| **Maven test** | **15 test, 0 failure, 0 error, 0 skipped** | Mở rộng thêm 3 test integration quy mô lớn: kiểm tra luồng trắc nghiệm trọn vẹn (tạo bài, thêm câu hỏi, ẩn đáp án khi SV chưa làm, tự động tính điểm 4.0/10.0 khi nộp, chặn nộp trùng 409), bài viết tự luận (nộp bài, chấm điểm thủ công, bảo vệ quyền chấm bài 403), sổ điểm (Gradebook), lịch học (Schedule), thông báo (Announcements), thảo luận (Discussions) và tiến độ bài học (Progress). |
| **Maven package** | **Thành công** | Đã tạo executable JAR `target/lms-backend-0.0.1-SNAPSHOT.jar` (thời gian build 1.8s). |
| **TypeScript** | `npm run typecheck` qua | `tsc --noEmit` đạt 0 lỗi, types đồng bộ hoàn toàn giữa frontend và backend DTOs. |
| **ESLint** | `npm run lint` qua | Bộ quy tắc Next.js 16 + React 19 hoàn thành với 0 warning, 0 error. |
| **Next.js build** | `npm run build` qua | Production build hoàn tất thành công trong 317ms bằng Turbopack. |
| **Giao diện & UI/UX** | Đảm bảo nguyên vẹn phong cách FIT LMS | Giao diện thanh menu ngang nền tối `#30363e`, điểm nhấn cam `#e66f23`, đầy đủ các tab bài học, bài tập trắc nghiệm & tự luận, giao diện làm bài, thông báo, diễn đàn trao đổi, sổ điểm và modal lịch hạn nộp. |

---

## Lần kiểm tra đợt 2 (13/10/2026) — Hoàn thiện CRUD & Enrollment

Kiểm tra ngày 13/10/2026 trên Windows, Java 21.0.8, Node v24.13.0.  
Stack: Spring Boot 3.5.16, Next.js 16.4.0, React 19.3.0, PostgreSQL 17 / H2 test mode.

| Kiểm tra | Kết quả | Ghi chú |
| :--- | :--- | :--- |
| **Maven test** | **12 test, 0 failure, 0 error, 0 skipped** | Mở rộng thêm 4 test tích hợp kiểm tra toàn bộ luồng tạo/sửa user, đổi trạng thái khóa học, CRUD bài học và bảo mật bài nháp, ghi danh/chặn ghi danh trùng/hủy ghi danh. |
| **Maven package** | **Thành công** | Đã tạo executable JAR `target/lms-backend-0.0.1-SNAPSHOT.jar`. |
| **TypeScript** | `npm run typecheck` qua | `tsc --noEmit` đạt 0 lỗi. |
| **ESLint** | `npm run lint` qua | Bộ quy tắc Next.js 16 + React 19 hoàn thành với 0 warning, 0 error. |
| **Next.js build** | `npm run build` qua | Production build hoàn tất thành công trong 247ms bằng Turbopack. |

---

## Lần kiểm tra đợt 1 (08/10/2026) — Base ban đầu

Kiểm tra ngày 08/10/2026 trên Windows, Java 17.0.7, Node 22.23.2. Dependency đã chốt: Spring Boot 3.5.16, Next.js 16.4.0, React 19.3.0; npm có package-lock.json, Maven có Wrapper 3.9.11.

| Kiểm tra | Kết quả |
| :--- | :--- |
| Maven test | 8 test, 0 failure/error/skipped; dùng H2 PostgreSQL mode, Flyway V1 và Hibernate validate |
| Maven package | Đã tạo executable JAR |
| TypeScript | npm run typecheck qua |
| ESLint | npm run lint qua |
| Next.js production build | npm run build qua |
| Chrome headless qua http://localhost:3000 | Login/logout, cookie HttpOnly qua proxy, quyền bài nháp, tạo khóa nháp, sinh viên chưa ghi danh, khóa session đang tồn tại đều qua |
| Giao diện desktop/mobile | Đã xem ảnh 1440px/390px; mobile không tràn ngang |
