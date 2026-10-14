# Kịch bản Demo LMS

## Upload tài liệu và nộp bài bằng file (V3)

1. Khởi động lại backend để Flyway áp dụng V3; khởi động lại frontend để nhận giới hạn proxy mới.
2. Đăng nhập `teacher@lms.local` / `Demo@12345`. Mở một bài học, dùng mục **Tài liệu bài học** để thêm PDF/TXT/slide.
3. Tạo bài tự luận, lưu nháp nếu cần. Tại trang chi tiết bài tập, thêm file ở **Đề bài và tài liệu đính kèm**, rồi công bố bài khi đã sẵn sàng.
4. Đăng nhập sinh viên đã ghi danh. Tải file từ bài học và đề bài; kiểm tra sinh viên ngoài lớp không truy cập được file.
5. Trong bài tự luận, nhập nội dung và bấm **Lưu bản nháp**; thêm file ở **File bài làm (bản nháp)**. Tải lại trang để thấy nội dung/file được giữ.
6. Có thể xóa/thay file nháp. Bấm **Xác nhận nộp bài tự luận** để chốt. Có thể chỉ nộp file mà không nhập văn bản. File đã nộp không còn nút xóa/upload.
7. Giảng viên mở trang chấm bài: tải file ở **File bài làm của sinh viên**, nhập điểm và nhận xét như trước.

Mặc định tối đa 5 file/mục, 20 MiB/file. File upload được lưu ngay; nội dung văn bản chỉ lưu khi bấm lưu nháp hoặc nộp bài.
Với bài học/bài tập mới, lưu đối tượng trước rồi mở trang chi tiết để thêm file.

## Kịch bản 1: Luồng Cơ bản (5 phút)

1. Chạy PostgreSQL (hoặc Docker Compose), backend profile `dev`, frontend theo `README.md`.
2. Login `student@lms.local` (pass: `Demo@12345`): thấy một khóa học "Lập trình mạng" và 2 bài học đã công bố.
3. Logout, login `student2@lms.local`: danh sách khóa học rỗng vì chưa được ghi danh.
4. Login `teacher@lms.local`: thấy bài học nháp của khóa "Lập trình mạng", tạo khóa học nháp mới thành công.
5. Dùng trình duyệt thường đăng nhập `student@lms.local` và cửa sổ ẩn danh đăng nhập `admin@lms.local` (hai session riêng biệt).
6. Admin khóa tài khoản student; student bấm Tải lại -> request bị chặn với mã `ACCOUNT_DISABLED` và giao diện quay về trang đăng nhập.
7. Admin mở khóa; student đăng nhập lại bình thường.

---

## Kịch bản 2: Quản lý Khóa học & Bài học (Giảng viên)

1. Login `teacher@lms.local`.
2. Bấm vào khóa học "Lập trình mạng".
3. **Chỉnh sửa khóa học**: Bấm "Sửa khóa học", cập nhật tên/mô tả -> Bấm "Lưu thay đổi".
4. **Quản lý trạng thái khóa học**:
   - Chuyển trạng thái giữa `PUBLISHED`, `DRAFT`, `ARCHIVED`.
   - Lưu ý: Sinh viên chỉ nhìn thấy khóa học khi trạng thái là `PUBLISHED`.
5. **Thêm bài học mới**:
   - Bấm "+ Thêm bài học", nhập tiêu đề, nội dung, thứ tự và chọn/bỏ chọn "Công bố ngay".
   - Bài học nháp sẽ có huy hiệu `Nháp` và sinh viên không thể đọc được.
6. **Sửa / Xóa bài học**:
   - Bấm nút "Sửa" trên tiêu đề bài học để cập nhật nội dung.
   - Bấm nút "Xóa" để loại bỏ bài học khỏi khóa.

---

## Kịch bản 3: Quản lý Ghi danh Thành viên lớp học

1. Login `teacher@lms.local`.
2. Mở khóa học "Lập trình mạng", chuyển sang tab **"Thành viên lớp học"**.
3. Xem danh sách sinh viên hiện tại (đã có `student@lms.local`).
4. Nhập `student2@lms.local` hoặc mã `SV002` vào ô "Mã sinh viên hoặc Email" -> Bấm **"+ Ghi danh"**.
   - Sinh viên `student2` được thêm vào danh sách ngay lập tức.
   - Thử ghi danh lại cùng mã `SV002`: hệ thống chặn lại với thông báo sinh viên đã được ghi danh (`409 CONFLICT`).
5. Mở cửa sổ ẩn danh, đăng nhập `student2@lms.local`: bây giờ sinh viên đã nhìn thấy khóa học và các bài học đã công bố!
6. Quay lại màn hình giảng viên, bấm **"Hủy ghi danh"** cho `student2`: sinh viên bị xóa khỏi danh sách, bên tài khoản `student2` không còn truy cập được khóa nữa.

---

## Kịch bản 4: Quản lý Tài khoản (Quản trị viên)

1. Login `admin@lms.local`.
2. Chuyển vào màn hình "Quản lý tài khoản".
3. **Tạo tài khoản mới**:
   - Bấm "+ Thêm tài khoản".
   - Điền Email, Mật khẩu, Họ tên, chọn Vai trò (ví dụ: `STUDENT`), Mã SV -> Bấm "Tạo tài khoản".
   - Thử đăng nhập bằng tài khoản vừa tạo trên tab khác.
4. **Chỉnh sửa thông tin tài khoản**:
   - Bấm nút "Sửa" trên một tài khoản.
   - Cập nhật họ tên, mã sinh viên, vai trò hoặc đổi mật khẩu mới.
   - Bấm "Lưu thay đổi".
