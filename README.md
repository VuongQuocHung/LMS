# FIT LMS — Hệ thống Quản lý Học tập Trực tuyến

## File đính kèm (V3)

Đã có upload/download tài liệu bài học, đề bài và bài nộp tự luận; bản nháp tự luận được lưu riêng và chốt file khi nộp.
Sau khi cập nhật code, khởi động lại backend (Flyway tự thêm hai bảng V3) và frontend.
Xem kịch bản sử dụng tại `docs/demo.md`.

Backend lưu file ở `backend/uploads` khi chạy từ thư mục `backend`; có thể đổi `UPLOAD_DIR` trong `backend/.env`.
Mặc định 5 file/mục, 20 MiB/file. Các biến cấu hình được liệt kê trong `backend/.env.example`.
Nếu tăng dung lượng, tăng cả multipart request limit và `proxyClientMaxBodySize` trong `frontend/next.config.ts`.
Không commit thư mục upload; sao lưu thư mục này cùng database.

Hệ thống Learning Management System (LMS) hoàn chỉnh được phát triển dựa trên phong cách giao diện và trải nghiệm người dùng của cổng học tập FIT LMS (https://lms.fit.hanu.vn/).

Dự án ưu tiên mã nguồn dễ đọc, chú thích tiếng Việt, phân tách tầng rõ ràng, kiểm soát phân quyền chặt chẽ và lưu trữ toàn vẹn dữ liệu.

---

## 1. Công nghệ & Kiến trúc

- **Frontend**: Next.js 16.4.0 (App Router, Turbopack), React 19.3.0, TypeScript 5, CSS thuần theo nhận diện cổng học tập (cam `#e66f23`, thanh điều hướng ngang tối `#30363e`, lưới khóa học 5 cột responsive).
- **Backend**: Spring Boot 3.5.16, Java 17/21, Spring Data JPA, Hibernate 6.6.
- **Xác thực & Bảo mật**: Spring Security với Cookie Session HttpOnly + CSRF Protection (`X-CSRF-TOKEN`), kiểm tra quyền truy cập bản ghi tại tầng Service.
- **Cơ sở dữ liệu**: PostgreSQL 17 / H2 in-memory test mode, quản lý tiến trình di chuyển lược đồ tự động bằng Flyway (`V1__create_learning_tables.sql`, `V2__add_assignments_and_learning_features.sql`).
- **Giao tiếp API**: RESTful API chuẩn hóa dưới prefix `/api/v1`, được Next.js reverse-proxy cùng origin trên cổng 3000.

---

## 2. Các phân hệ chức năng đã hoàn thiện

### 2.1. Quản trị Tài khoản & Phân quyền (`UserManagement.tsx`)
- Quản lý danh sách tài khoản cho Quản trị viên (`ADMIN`).
- Tìm kiếm theo từ khóa (họ tên, email, mã sinh viên), lọc theo vai trò (`ADMIN`, `TEACHER`, `STUDENT`) và trạng thái (`ACTIVE`, `DISABLED`).
- Tạo tài khoản mới, chỉnh sửa thông tin, đặt lại mật khẩu và khóa/mở khóa tài khoản tức thì.

### 2.2. Quản lý Khóa học & Đọc Bài học (`/courses/[courseId]`, `/courses/[courseId]/lessons/[lessonId]`)
- Giảng viên tạo khóa học mới (mặc định `DRAFT`), sửa thông tin khóa, chuyển trạng thái (`PUBLISHED`, `DRAFT`, `ARCHIVED`) hoặc xóa khóa học.
- Quản lý bài học: Thêm bài học mới, sửa nội dung, thứ tự hiển thị, bật/tắt công bố.
- **Trang đọc bài học độc lập (`/courses/[courseId]/lessons/[lessonId]`)**: Thiết kế trải nghiệm đọc tập trung (Focused Reading), mục lục toàn khóa ở thanh bên (Sidebar TOC), điều hướng bài trước/sau, đánh dấu hoàn thành bài học đồng bộ tức thì với backend.
- Sinh viên chỉ thấy khóa học đã công bố mà mình được ghi danh và các bài học đã công bố.
- Theo dõi tiến độ: Sinh viên đánh dấu hoàn thành bài học, thanh tiến độ hiển thị trực quan tỷ lệ % hoàn thành khóa học.

### 2.3. Quản lý Thành viên Lớp học (`Enrollments`)
- Giảng viên ghi danh sinh viên bằng mã sinh viên hoặc email.
- Tìm kiếm sinh viên trong lớp học, hủy ghi danh sinh viên an toàn kèm hộp thoại xác nhận.

### 2.4. Module Bài tập & Chấm điểm Redesign (Moodle / Canvas LMS / Google Classroom Style)
- **Kiến trúc trang riêng biệt (Dedicated URL)**: Toàn bộ trải nghiệm tạo bài, làm bài, xem kết quả và chấm điểm được tách biệt thành các trang độc lập, loại bỏ hoàn toàn modal/accordion chật chội.
- **Trình tạo bài tập theo từng bước (`/courses/[courseId]/assignments/new`)**:
  - Wizard 4 bước: 1. Thông tin cơ bản -> 2. Soạn nội dung / câu hỏi trắc nghiệm A/B/C/D trực quan -> 3. Thiết lập thời gian & Thang điểm -> 4. Xem trước & Công bố hoặc Lưu nháp.
  - Tự động lưu toàn bộ ngân hàng câu hỏi vào cơ sở dữ liệu.
- **Trang chi tiết & Làm bài độc lập (`/courses/[courseId]/assignments/[assignmentId]`)**:
  - Bố cục 2 cột (cột nội dung làm bài + cột thông tin/hạn nộp).
  - Trắc nghiệm: thẻ câu hỏi trực quan, bộ đếm số câu đã làm, xác nhận trước khi nộp, tự động chấm điểm tức thì trên server và hiển thị phân tích câu đúng/sai kèm đáp án chuẩn.
  - Tự luận: khung soạn thảo bài làm có bộ đếm từ/ký tự, hiển thị hạn nộp, cảnh báo nộp trễ, và hiển thị phản hồi/điểm số khi giảng viên đã chấm.
- **Bàn chấm điểm bài nộp SpeedGrader (`/courses/[courseId]/assignments/[assignmentId]/submissions`)**:
  - Phân chia 2 cột: Cột trái đọc bài nộp của sinh viên (bài viết hoặc phân tích trắc nghiệm); cột phải nhập điểm, viết nhận xét phản hồi.
  - Thanh chuyển đổi sinh viên trước/sau và bộ lọc trạng thái (Tất cả / Chờ chấm / Đã chấm) giúp chấm liên tục năng suất cao.
- **Sổ điểm (Gradebook)**:
  - Giảng viên theo dõi ma trận điểm của toàn bộ sinh viên trong lớp qua các bài tập.
  - Sinh viên xem bảng tổng hợp kết quả học tập cá nhân.

### 2.5. Tiện ích Học tập Bổ sung
- **Thông báo khóa học (Announcements)**: Giảng viên đăng thông báo, sinh viên cập nhật tin tức và thông báo mới nhất.
- **Diễn đàn Thảo luận (Discussions)**: Tạo chủ đề trao đổi, đặt câu hỏi và phản hồi bình luận theo luồng.
- **Lịch học & Hạn nộp (Schedule)**: Màn hình tổng hợp các bài tập sắp đến hạn và đã qua hạn trên tất cả các khóa học của người dùng.

---

## 3. Hướng dẫn chạy dự án trên Windows

### 3.1. Khởi động Cơ sở dữ liệu (PostgreSQL)
Chạy bằng Docker Compose (hoặc dùng PostgreSQL cài trực tiếp trên máy):
```powershell
docker compose up -d database
```
*(Database `lms` mặc định tại cổng 5432, user `lms`, password `lms_local_password`)*

### 3.2. Khởi động Backend (Spring Boot)
Tại thư mục `d:\LMS\backend`:
```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```
*(Backend khởi động tại `http://localhost:8080`, Flyway tự động chạy các migration V1 và V2)*

### 3.3. Khởi động Frontend (Next.js)
Tại thư mục `d:\LMS\frontend`:
```powershell
npm.cmd run dev
```
*(Mở trình duyệt truy cập `http://localhost:3000`)*

---

## 4. Tài khoản dùng thử (Profile dev)

Mật khẩu chung cho tất cả tài khoản demo: **`Demo@12345`**

| Email | Vai trò | Chức năng chính |
| :--- | :--- | :--- |
| `admin@lms.local` | Quản trị viên | Quản lý người dùng, phân quyền, khóa tài khoản |
| `teacher@lms.local` | Giảng viên | Sở hữu khóa "Lập trình mạng", giao bài tập trắc nghiệm & tự luận, chấm bài, đăng thông báo |
| `teacher2@lms.local` | Giảng viên | Giảng viên khác, dùng kiểm thử phân quyền liên khóa học |
| `student@lms.local` | Sinh viên | Đã ghi danh khóa mẫu, làm bài trắc nghiệm, nộp bài viết, đánh dấu tiến độ |
| `student2@lms.local` | Sinh viên | Sinh viên chưa ghi danh, dùng kiểm thử bảo mật bài học & bài thi |

*(Giao diện đăng nhập đã tích hợp sẵn các nút bấm điền nhanh các tài khoản demo này)*

---

## 5. Kiểm thử & Đảm bảo chất lượng

- **Backend Integration Tests**:
  ```powershell
  cd d:\LMS\backend
  .\mvnw.cmd test
  ```
  *(15 integration tests sử dụng MockMvc, Spring Security và H2 in-memory DB: 0 failures, 0 errors)*

- **Frontend Typecheck, Lint & Production Build**:
  ```powershell
  cd d:\LMS\frontend
  npm.cmd run typecheck   # TypeScript check: 0 errors
  npm.cmd run lint        # ESLint: 0 errors
  npm.cmd run build       # Next.js Turbopack build thành công
  ```
