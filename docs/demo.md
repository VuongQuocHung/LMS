# Demo base 5 phút

1. Chạy PostgreSQL, backend profile dev, frontend theo README.
2. Login student@lms.local: thấy một khóa và hai bài đã công bố.
3. Logout, login student2@lms.local: danh sách rỗng vì chưa ghi danh.
4. Login teacher@lms.local: thấy ba bài gồm một bài nháp; tạo một khóa DRAFT.
5. Dùng trình duyệt thường đăng nhập student và cửa sổ ẩn danh đăng nhập admin (hai session riêng).
6. Admin khóa student; student bấm Tải lại. Request bị chặn và giao diện quay về login.
7. Admin mở khóa; student đăng nhập lại được.

Không dùng hai tab thường để demo hai người khác nhau vì chúng chia sẻ cookie session.

Kiểm tra thêm trên điện thoại hoặc cửa sổ hẹp: form, thẻ khóa và bảng tài khoản vẫn dùng được. Kiểm tra lỗi bằng cách dừng backend rồi bấm Tải lại; giao diện phải báo lỗi kết nối.

Các bước demo PostgreSQL/browser cần chạy trên máy có Docker đang hoạt động; xem verification.md để biết phần đã được kiểm tra tự động trong phiên xây dựng.
