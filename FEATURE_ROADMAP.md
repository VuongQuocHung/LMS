# FEATURE ROADMAP — LỘ TRÌNH PHÁT TRIỂN CHỨC NĂNG HỌC TẬP CỐT LÕI LMS

**Dự án:** FIT LMS (Tham chiếu https://lms.fit.hanu.vn/)  
**Ngày cập nhật:** 13/10/2026  
**Công nghệ:** Next.js 16.4.0 (Turbopack, TypeScript), Spring Boot 3.5.16, PostgreSQL 17 / H2 in-memory, Flyway, Spring Security (Session HttpOnly + CSRF).

---

## 1. Mục tiêu và Nguyên tắc

Mục tiêu của đợt phát triển này là biến hệ thống từ nền tảng quản lý khóa học/bài học cơ bản thành một LMS học tập hoàn chỉnh, phục vụ giảng dạy và học tập thực tế:
- **Giảng viên**: Giao bài tập (trắc nghiệm và bài viết), thiết lập câu hỏi và đáp án, chấm bài tự luận, gửi phản hồi, đăng thông báo, quản lý diễn đàn thảo luận, theo dõi tiến độ và xem sổ điểm.
- **Sinh viên**: Làm bài tập trắc nghiệm và nhận điểm tự động, nộp bài viết tự luận, xem điểm và nhận xét của giảng viên, đánh dấu hoàn thành bài học, đọc thông báo, tham gia thảo luận và xem hạn nộp.

---

## 2. Danh mục tính năng & Thứ tự triển khai

### Giai đoạn 1: Khảo sát & Thiết kế kiến trúc dữ liệu (Database Migration V2)
- Tạo Flyway migration `V2__add_assignments_and_learning_features.sql`:
  - `assignments`: Quản lý bài tập chung (Loại `QUIZ` | `ESSAY`, `open_at`, `due_at`, `max_score`, `status`).
  - `quiz_questions` & `quiz_options`: Câu hỏi và phương án trắc nghiệm, cờ `is_correct`.
  - `assignment_submissions`: Bài nộp của sinh viên, nội dung tự luận, điểm số, phản hồi, trạng thái (`SUBMITTED`, `GRADED`, `LATE`).
  - `quiz_answers`: Câu trả lời trắc nghiệm của sinh viên.
  - `course_announcements`: Thông báo trong khóa học.
  - `discussion_topics` & `discussion_posts`: Diễn đàn trao đổi thảo luận.
  - `lesson_progress`: Đánh dấu và theo dõi tiến độ hoàn thành bài học.

### Giai đoạn 2: Quản lý Bài tập Trắc nghiệm (Multiple-Choice Quiz)
- Backend:
  - API tạo/sửa/công bố bài tập trắc nghiệm (`POST /api/v1/courses/{cId}/assignments`).
  - API soạn câu hỏi và các phương án trả lời (`POST/PUT/DELETE /api/v1/assignments/{aId}/questions`).
  - API lấy bài làm cho sinh viên (tuyệt đối ẩn đáp án đúng `is_correct` khi sinh viên chưa nộp bài).
  - API nộp bài trắc nghiệm (`POST /api/v1/assignments/{aId}/submit-quiz`): Tự động so sánh đáp án và chấm điểm trên server.
- Frontend:
  - Form tạo bài tập trắc nghiệm với thời gian mở, hạn nộp, điểm tối đa.
  - Trình soạn câu hỏi trực quan: nhập nội dung câu hỏi, điểm, các phương án A/B/C/D, chọn đáp án đúng.
  - Giao diện làm bài cho sinh viên: danh sách câu hỏi dạng trắc nghiệm radio, đếm câu đã làm, xác nhận nộp bài và hiển thị kết quả chấm ngay sau khi nộp.

### Giai đoạn 3: Quản lý Bài tập Bài viết (Essay Assignment)
- Backend:
  - API tạo/sửa bài tập tự luận (`POST /api/v1/courses/{cId}/assignments` với type `ESSAY`).
  - API nộp bài viết cho sinh viên (`POST /api/v1/assignments/{aId}/submit-essay`).
  - API chấm bài và nhận xét dành cho giảng viên (`PUT /api/v1/assignments/{aId}/submissions/{sId}/grade`).
- Frontend:
  - Form soạn bài tự luận cho giảng viên (tiêu đề, đề bài, thang điểm, hạn nộp).
  - Vùng soạn và nộp bài viết cho sinh viên kèm kiểm tra hạn nộp.
  - Giao diện chấm bài của giảng viên: xem nội dung bài viết, nhập điểm (xác thực <= điểm tối đa), nhập nhận xét phản hồi và lưu kết quả.
  - Sinh viên xem điểm và nhận xét của giảng viên sau khi đã chấm.

### Giai đoạn 4: Quản lý Bài nộp Thống nhất & Sổ điểm (Gradebook)
- Backend:
  - API lấy danh sách bài nộp của bài tập (`GET /api/v1/assignments/{aId}/submissions`).
  - API sổ điểm tổng hợp của khóa học (`GET /api/v1/courses/{cId}/gradebook`):
    - Giảng viên xem ma trận toàn bộ sinh viên x tất cả bài tập.
    - Sinh viên xem bảng điểm cá nhân của mình trong khóa.
- Frontend:
  - Tab "Sổ điểm" trong không gian khóa học: hiển thị danh sách bài tập, điểm số, trạng thái chưa nộp / chờ chấm / đã chấm.

### Giai đoạn 5: Thông báo Khóa học (Announcements) & Thảo luận (Discussions)
- Backend:
  - API CRUD Thông báo (`/api/v1/courses/{cId}/announcements`).
  - API Diễn đàn Thảo luận (`/api/v1/courses/{cId}/discussions`, `/api/v1/discussions/{tId}/posts`).
- Frontend:
  - Tab "Thông báo" trong khóa học: Giảng viên đăng thông báo, sinh viên xem thông báo mới nhất.
  - Tab "Thảo luận": Giảng viên và sinh viên tạo chủ đề trao đổi, trả lời bình luận theo luồng.

### Giai đoạn 6: Lịch học, Hạn nộp & Theo dõi Tiến độ (Schedule & Progress Tracking)
- Backend:
  - API lịch hạn nộp tổng hợp (`GET /api/v1/schedule`).
  - API đánh dấu hoàn thành bài học (`POST /api/v1/lessons/{lId}/progress`).
  - API lấy tiến độ học tập (`GET /api/v1/courses/{cId}/progress`).
- Frontend:
  - Thanh tiến độ học tập (% hoàn thành bài học) hiển thị trực quan trên giao diện khóa học.
  - Nút checkbox đánh dấu hoàn thành từng bài học cho sinh viên.
  - Khu vực hiển thị sự kiện / hạn nộp sắp tới (Upcoming Deadlines).

### Giai đoạn 7: Kiểm thử Toàn diện & Xác thực
- Bổ sung Integration tests trong `BaseIntegrationTest.java` (MockMvc + Spring Security + H2).
- Chạy `npm run typecheck`, `npm run lint`, `npm run build` và `mvnw test`.
- Cập nhật tài liệu: `README.md`, `docs/api-contract.md`, `docs/erd.md`, `docs/verification.md`.
