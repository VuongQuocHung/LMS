# PROJECT AUDIT — BÁO CÁO KIỂM TOÁN VÀ TIẾN ĐỘ HOÀN THIỆN HỆ THỐNG LMS

**Thời điểm cập nhật:** 13/10/2026  
**Môi trường:** Windows, Java 21 (tương thích Java 17+), Node v24.13.0, Next.js 16.4.0, React 19.3.0, Spring Boot 3.5.16, PostgreSQL 17 / H2 test mode.

---

## 1. Khảo sát tài liệu và đặc tả dự án

- **`README.md`**: Đã đối chiếu và cập nhật thông số kết nối, tài liệu và cấu hình TimeZone `Asia/Ho_Chi_Minh` trên Windows.
- **`LMS_PLAN.md`**: Đã rà soát toàn bộ repository và các thư mục liên quan. File `LMS_PLAN.md` **không tồn tại** trong repository.
  - *Chỉ thị áp dụng*: "Nếu không tìm thấy LMS_PLAN.md, không được tự khẳng định đã đọc kế hoạch hoặc tự bịa các yêu cầu chi tiết của module thi. Hãy triển khai các phần đã được tài liệu hiện có xác nhận, ghi rõ phần bị chặn vì thiếu đặc tả và tiếp tục các công việc độc lập có thể hoàn thành."
  - *Trạng thái*: Module thi (Quiz, Attempt, Snapshot, Receipt, Scheduler, Baseline) được đánh dấu **BỊ CHẶN (BLOCKED)** do thiếu đặc tả gốc.
  - *Kết quả hoàn thiện*: 100% các phân hệ nghiệp vụ cốt lõi đã được tài liệu hiện có xác nhận (Quản lý tài khoản, Quản lý khóa học, Quản lý bài học, Quản lý ghi danh) đã được triển khai hoàn chỉnh cả Backend, Database, Frontend và Integration Tests.

---

## 2. Bảng trạng thái chức năng chi tiết

| Chức năng | Trạng thái ban đầu | Trạng thái hiện tại | Bằng chứng trong code & kiểm thử | Phần còn thiếu |
| :--- | :--- | :--- | :--- | :--- |
| **Xác thực & Phiên làm việc (Auth)** | Hoàn thiện | **HOÀN THÀNH** | `AuthController.java`, `SecurityConfig.java`, `ActiveAccountFilter.java`, `api.ts`, 12 tests pass | Không |
| **Quản lý tài khoản (Account CRUD)** | Một phần (Chỉ xem & khóa) | **HOÀN THÀNH** | • Backend: `UserController.java` hỗ trợ `GET /users`, `GET /users/{id}`, `POST /users`, `PUT /users/{id}`, `PATCH /users/{id}`.<br>• Frontend: `UserManagement.tsx` có form Thêm tài khoản mới, form Chỉnh sửa tài khoản, Khóa/Mở khóa.<br>• Test: `BaseIntegrationTest.adminCanCreateAndUpdateUser` kiểm tra tạo, sửa, trùng email (409), cấm sinh viên (403). | Không |
| **Quản lý khóa học (Course CRUD & Lifecycle)** | Một phần (Xem & tạo nháp) | **HOÀN THÀNH** | • Backend: `CourseController.java` & `CourseService.java` hỗ trợ `GET /courses`, `GET /courses/{id}`, `POST /courses`, `PUT /courses/{id}`, `PATCH /courses/{id}/status`, `DELETE /courses/{id}`.<br>• Frontend: `CourseWorkspace.tsx` có nút Sửa khóa, Đổi trạng thái (`DRAFT` / `PUBLISHED` / `ARCHIVED`), Xóa khóa học.<br>• Test: `BaseIntegrationTest.courseOwnerCanUpdateAndChangeStatus` kiểm tra quyền chủ khóa, cấm giảng viên khác (403), đổi trạng thái. | Không |
| **Quản lý bài học (Lesson CRUD)** | Sơ khai (Chỉ đọc bài) | **HOÀN THÀNH** | • Backend: `CourseController.java` & `CourseService.java` hỗ trợ `POST /courses/{id}/lessons`, `GET .../lessons/{lessonId}`, `PUT .../lessons/{lessonId}`, `DELETE .../lessons/{lessonId}`.<br>• Frontend: `CourseWorkspace.tsx` có form Thêm bài học, form Sửa bài học, nút Xóa bài học, hiển thị badge "Nháp".<br>• Test: `BaseIntegrationTest.lessonCrudAndPermissionChecks` kiểm tra tạo, sửa, sinh viên bị chặn đọc bài nháp (403), xem bài công bố (200), xóa bài. | Không |
| **Quản lý ghi danh (Enrollment Management)** | Sơ khai (Chỉ có seeder) | **HOÀN THÀNH** | • Backend: `EnrollmentController.java` & `EnrollmentService.java` hỗ trợ `GET /courses/{id}/enrollments`, `POST .../enrollments`, `DELETE .../enrollments/{studentId}`.<br>• Frontend: Tab "Thành viên lớp học" trong `CourseWorkspace.tsx` cho phép xem danh sách sinh viên ghi danh, thêm sinh viên theo mã/email, hủy ghi danh.<br>• Test: `BaseIntegrationTest.enrollmentManagementFlow` kiểm tra thêm sinh viên, chặn ghi danh trùng (409 CONFLICT), hủy ghi danh. | Không |
| **Module thi (Quiz, Attempt, Snapshot, Submit, Scheduler)** | Chưa có | **BỊ CHẶN (BLOCKED)** | Không tự ý tạo mã nguồn giả lập hoặc endpoint mock khi chưa có file đặc tả nghiệp vụ `LMS_PLAN.md` theo chỉ thị nguyên tắc. | Cần bổ sung tài liệu `LMS_PLAN.md` vào repository để triển khai chính xác theo yêu cầu. |

---

## 3. Tổng kết kết quả kiểm thử thực tế

1. **Backend Integration Tests**:
   - `mvnw.cmd test`: **12/12 test Passed**, 0 Failures, 0 Errors, 0 Skipped.
   - `mvnw.cmd package`: Build JAR thành công (`target/lms-backend-0.0.1-SNAPSHOT.jar`).
2. **Frontend Quality & Build**:
   - `npm.cmd run typecheck`: **Pass** (`tsc --noEmit` hoàn thành với 0 lỗi).
   - `npm.cmd run lint`: **Pass** (`eslint .` hoàn thành với 0 lỗi).
   - `npm.cmd run build`: **Pass** (Production build Next.js 16.4.0 với Turbopack biên dịch thành công).
3. **Giao diện & UI/UX**:
   - Bảo toàn 100% nhận diện cổng học tập FIT LMS: đầu trang cam, navbar tối, lưới 5 cột trên desktop, 8 họa tiết thẻ màu theo ID, tìm kiếm/lọc/sắp xếp/đổi dạng hiển thị.
