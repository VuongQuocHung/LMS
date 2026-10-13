# FRONTEND AUDIT — KIỂM TOÁN VÀ ĐÁNH GIÁ TÍCH HỢP GIAO DIỆN LMS

**Thời điểm kiểm toán:** 13/10/2026  
**Công nghệ:** Next.js 16.4.0 (App Router), React 19.3.0, TypeScript 5, CSS thuần theo phong cách FIT LMS.

---

## 1. Bảng đối chiếu Endpoint Backend và Giao diện Frontend

| Phân hệ | Endpoint Backend | Quyền | Trạng thái tích hợp Frontend | Ghi chú & Cần hoàn thiện |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `GET /api/v1/health` | Công khai | **Đã tích hợp** | Kiểm tra kết nối ban đầu |
| | `GET /api/v1/auth/csrf` | Công khai | **Đã tích hợp** | Lấy CSRF token trước mỗi mutation trong `api.ts` |
| | `POST /api/v1/auth/login` | Form-urlencoded | **Đã tích hợp** | `LoginForm.tsx` xử lý đăng nhập, cấp session |
| | `POST /api/v1/auth/logout` | Session + CSRF | **Đã tích hợp** | `Dashboard.tsx` hủy session phía server |
| | `GET /api/v1/auth/me` | Đã đăng nhập | **Đã tích hợp** | Khôi phục session khi refresh trang tại `page.tsx` |
| **Tài khoản** | `GET /api/v1/users` | ADMIN | **Đã tích hợp** | Bảng danh sách tài khoản trong `UserManagement.tsx` |
| | `GET /api/v1/users/{id}` | ADMIN | **Đã tích hợp** | Xem chi tiết thông tin người dùng |
| | `POST /api/v1/users` | ADMIN + CSRF | **Đã tích hợp** | Form thêm tài khoản mới; cần bổ sung bộ lọc vai trò & tìm kiếm tài khoản trên giao diện |
| | `PUT /api/v1/users/{id}` | ADMIN + CSRF | **Đã tích hợp** | Form sửa tài khoản (tên, mã SV, vai trò, trạng thái, mật khẩu mới) |
| | `PATCH /api/v1/users/{id}` | ADMIN + CSRF | **Đã tích hợp** | Nút khóa / mở khóa tài khoản |
| **Khóa học** | `GET /api/v1/courses` | TEACHER/STUDENT | **Đã tích hợp** | Lưới 5 cột & danh sách thẻ khóa học trong `CourseWorkspace.tsx` |
| | `GET /api/v1/courses/{id}` | Chủ khóa / SV | **Đã tích hợp** | Tải chi tiết khóa học và danh sách bài học |
| | `POST /api/v1/courses` | TEACHER + CSRF | **Đã tích hợp** | Form tạo khóa học nháp |
| | `PUT /api/v1/courses/{id}` | Chủ khóa + CSRF | **Đã tích hợp** | Form sửa tên và mô tả khóa học |
| | `PATCH /api/v1/courses/{id}/status` | Chủ khóa + CSRF | **Đã tích hợp** | Các nút đổi trạng thái `PUBLISHED`, `DRAFT`, `ARCHIVED` |
| | `DELETE /api/v1/courses/{id}` | Chủ khóa + CSRF | **Đã tích hợp** | Nút xóa khóa học có xác nhận |
| **Bài học** | `POST /api/v1/courses/{id}/lessons` | Chủ khóa + CSRF | **Đã tích hợp** | Form tạo bài học mới (tiêu đề, nội dung, thứ tự, công bố) |
| | `GET /courses/{id}/lessons/{id}` | Chủ khóa / SV | **Đã tích hợp** | Xem nội dung chi tiết bài học (SV chỉ đọc bài công bố) |
| | `PUT /courses/{id}/lessons/{id}` | Chủ khóa + CSRF | **Đã tích hợp** | Form cập nhật nội dung, vị trí, trạng thái công bố |
| | `DELETE /courses/{id}/lessons/{id}`| Chủ khóa + CSRF | **Đã tích hợp** | Nút xóa bài học khỏi khóa |
| **Ghi danh** | `GET /courses/{id}/enrollments` | Chủ khóa / ADMIN | **Đã tích hợp** | Tab "Thành viên lớp học" hiển thị danh sách SV |
| | `POST /courses/{id}/enrollments` | Chủ khóa / ADMIN | **Đã tích hợp** | Form ghi danh sinh viên theo mã SV hoặc email |
| | `DELETE /courses/{id}/enrollments/{sId}`| Chủ khóa / ADMIN | **Đã tích hợp** | Nút hủy ghi danh sinh viên |
| **Module thi** | Các endpoint thi | Chưa có ở backend | **Chưa triển khai** | Bị chặn (BLOCKED) do backend chưa có endpoint vì thiếu đặc tả `LMS_PLAN.md`. Không tự làm mock giả |

---

## 2. Kết quả hoàn thiện và nâng cấp trải nghiệm người dùng trên Frontend

1. **Điều hướng và luồng hiển thị (Navigation & Breadcrumbs UX)**:
   - ✅ Khi chọn một khóa học, breadcrumb trên `Dashboard` cập nhật động: `Trang chủ › Các khóa học của tôi › [Tên khóa học]`.
   - ✅ Nhấp vào "Các khóa học của tôi" hoặc "Trang chủ" trên breadcrumb sẽ đóng chi tiết và đưa người dùng trở lại danh sách khóa học.
   - ✅ Bổ sung nút bấm trực quan `← Quay lại danh sách khóa học` tại thanh tiêu đề chi tiết khóa học, giúp chuyển đổi mượt mà giữa "Tổng quan danh sách" và "Không gian khóa học cụ thể".
2. **Quản trị người dùng (`UserManagement.tsx`)**:
   - ✅ Thanh tìm kiếm tài khoản theo từ khóa (họ tên, email, mã sinh viên).
   - ✅ Bộ lọc tài khoản theo vai trò (`TẤT CẢ`, `ADMIN`, `TEACHER`, `STUDENT`) và trạng thái (`Hoạt động`, `Đã khóa`).
   - ✅ Hiển thị tổng số lượng tài khoản theo bộ lọc: `Hiển thị X / Y tài khoản`.
   - ✅ Form tạo tài khoản, form chỉnh sửa thông tin, đổi vai trò, đổi mật khẩu và nút bật/tắt khóa tài khoản.
3. **Thành viên lớp học (`CourseWorkspace.tsx`)**:
   - ✅ Thêm ô tìm kiếm sinh viên trong danh sách ghi danh của khóa học theo tên, email, mã sinh viên.
   - ✅ Hiển thị bộ đếm số lượng sinh viên ghi danh: `Hiển thị X / Y sinh viên`.
   - ✅ Thông báo trống rõ ràng kèm nút "Xóa tìm kiếm" khi không có kết quả phù hợp.
   - ✅ Form ghi danh sinh viên bằng mã sinh viên hoặc email (`POST /api/v1/courses/{cId}/enrollments`) và hủy ghi danh (`DELETE`).
4. **Hỗ trợ đăng nhập kiểm thử (`LoginForm.tsx`)**:
   - ✅ Thêm các nút điền nhanh tài khoản demo (`Admin`, `Giảng viên 1`, `Giảng viên 2`, `Sinh viên 1`, `Sinh viên 2`) kèm mật khẩu chuẩn `Demo@12345` để dễ dàng kiểm thử các kịch bản phân quyền.
5. **Nội dung và biên tập khóa học / bài học**:
   - ✅ Giảng viên có đầy đủ thao tác: tạo khóa học nháp, sửa thông tin khóa, chuyển trạng thái (`PUBLISHED`, `DRAFT`, `ARCHIVED`), xóa khóa học.
   - ✅ Thêm bài học mới, chỉnh sửa bài học, đổi thứ tự hiển thị, bật/tắt cờ công bố và xóa bài học.
   - ✅ Sinh viên chỉ xem được các khóa học đã công bố và các bài học đã công bố.
