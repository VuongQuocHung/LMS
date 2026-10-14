# Hướng dẫn đọc và mở rộng base

## Upload/download và bản nháp tự luận

- `file/AttachmentController`: API multipart, tải xuống và bản nháp.
- `file/AttachmentService`: phân quyền theo khóa/bài, giới hạn file, khóa hàng khóa học và giao dịch chốt bài.
- `file/FileStorage` / `LocalFileStorage`: lưu byte với tên UUID, thư mục cấu hình `UPLOAD_DIR`. Có thể thay adapter khi chuyển sang object storage.
- `file/FileValidation`: kiểm tra phần mở rộng, tên file và chữ ký/nội dung; chỉ đọc ZIP có giới hạn, không giải nén ra ổ đĩa. Không phải bộ quét virus.
- `essay_drafts` tách khỏi `assignment_submissions`, nên các truy vấn sổ điểm/số bài nộp hiện tại không tính nháp.
- `AttachmentPanel.tsx`: UI dùng chung cho tài liệu/đề bài/bài nháp/bài nộp; `api.ts` tự bỏ Content-Type JSON khi gửi FormData và giữ CSRF.
- Upload rollback sẽ xóa byte đã ghi; xóa file trực tiếp chỉ xóa byte sau commit. Xóa đối tượng cha cascade metadata; tác vụ chạy mỗi giờ dọn file UUID không còn metadata và cũ hơn 24 giờ. Điều này cũng retry khi xóa byte thất bại hoặc tiến trình bị ngắt.
- Sao lưu/khôi phục database và thư mục upload cùng nhau. Giữ nguyên `UPLOAD_DIR` qua các lần khởi động. Chỉ một deployment sở hữu thư mục này; không dùng chung thư mục cho các database độc lập.

Kiểm thử file: `AttachmentIntegrationTest`. Mặc định H2 và thư mục tạm riêng. Để kiểm tra trên PostgreSQL local:
`mvn "-Dtest=AttachmentIntegrationTest" "-Dlms.test.postgres=true" test` từ `backend`.
Test đọc `backend/.env`, tạo schema `lms_files_test_<random>` riêng, tự dọn schema sau test; không dùng bảng trong schema ứng dụng.

## Một request đi qua những đâu?

```text
Người dùng bấm nút
  → React component
  → lib/api.ts
  → /api/v1 trên Next.js (rewrite)
  → Spring Security (session, CSRF, enabled)
  → Controller (đọc HTTP, validate)
  → Service (quyền sở hữu, nghiệp vụ)
  → Repository (SQL/JPA)
  → PostgreSQL
  → DTO JSON
  → React cập nhật giao diện
```

Controller không trả entity trực tiếp. Ví dụ UserAccount có passwordHash nhưng UserView chỉ chứa thông tin được phép đọc.

## Các component giao diện

- `PortalBrand.tsx`: logo chữ và tên đơn vị dùng chung ở trang đăng nhập/khóa học.
- `Dashboard.tsx`: đầu trang, menu ngang, hồ sơ tài khoản và nội dung theo vai trò.
- `CourseWorkspace.tsx`: tải khóa học, tìm kiếm/lọc/sắp xếp, tạo khóa nháp và tải chi tiết bài học.
- `CourseCard.tsx`: một khóa học; ID chọn một trong tám họa tiết CSS để màu bìa không đổi khi sắp xếp.
- `globals.css`: bảng màu, bố cục, họa tiết bìa và các mốc responsive; mỗi nhóm có chú thích tiếng Việt.

Tìm kiếm và bộ lọc chỉ xử lý danh sách backend đã cho phép xem. Giao diện không tự tạo thêm khóa học hay học kỳ để lấp đầy lưới. `search`, `statusFilter`, `sortOrder`, `viewMode` chỉ là trạng thái hiển thị; `detailReloadKey` cho phép thử lại khi tải chi tiết lỗi. Khi API có phân trang, cần chuyển tìm kiếm/lọc/sắp xếp lên backend để bao phủ toàn bộ kết quả.

## Các biến quan trọng trong base

| Biến / trường | Mục đích |
| --- | --- |
| enabled | Khóa tài khoản; ActiveAccountFilter đọc lại DB ở request tiếp theo |
| teacherId | Chủ khóa, dùng kiểm tra quyền bản ghi |
| courseId + studentId | Xác định ghi danh; database có unique constraint |
| published | Ngăn sinh viên đọc bài nháp |
| csrf.headerName / csrf.token | Header cần gửi khi POST/PATCH/DELETE |
| busy / saving / busyId | Ngăn thao tác lặp trong lúc request đang chạy |
| active | Bỏ qua response khi effect đã bị hủy hoặc lựa chọn đã đổi |
| selectedId | Khóa đang chọn; dữ liệu chi tiết được tải riêng |
| REQUEST_TIMEOUT_MS | Giới hạn chờ phía trình duyệt; không có nghĩa server đã hủy xử lý |

## Session và CSRF

1. GET /auth/csrf tạo/lấy token trong session và trả tên header.
2. POST /auth/login gửi email/password dạng form-urlencoded và token.
3. Spring đổi session ID để chống session fixation, lưu authentication; cookie HttpOnly do server cấp.
4. GET /auth/me trả user. Mỗi mutation lấy CSRF token hiện tại trước khi gửi.
5. POST /auth/logout hủy session. Không lưu JWT hoặc mật khẩu vào localStorage.

Đăng nhập là ngoại lệ dùng form-urlencoded để tận dụng filter Spring có sẵn. Các API nghiệp vụ dùng JSON. Không tắt CSRF để xử lý lỗi 403; kiểm tra token/session và gọi API qua cùng origin.

## Cách thêm chức năng

Ví dụ thêm chỉnh sửa khóa học:

1. Tạo DTO chứa các trường được phép sửa, thêm @Valid và giới hạn độ dài.
2. Controller nhận ID từ URL và user từ CurrentUserService.
3. Service tìm khóa, kiểm tra teacherId đúng người gọi, sau đó cập nhật trong @Transactional.
4. Trả DTO, không trả entity.
5. Viết test: chủ khóa sửa được, giảng viên khác bị chặn, sinh viên bị chặn, dữ liệu sai trả 400.
6. Frontend gọi api với method PATCH và JSON; hiển thị loading/error/success.
7. Cập nhật api-contract.md.

Không nhận teacherId/studentId từ frontend để quyết định người đang thao tác. Bổ sung migration V2 khi đổi schema; không sửa V1 sau khi nhóm đã dùng chung.

## Module thi sẽ bổ sung sau

Tạo package quiz khi bắt đầu lát cắt thi. Bám mục 5 của LMS_PLAN.md: start/GET lượt → save snapshot/revision/receipt → submit → scheduler. Chỉ bổ sung schema của phần được triển khai; không tạo hàng loạt class rỗng hoặc endpoint trả dữ liệu giả.

Base hiện chưa có retry lưu bài tự động. Hàm api cố ý không retry mutation: timeout có thể xảy ra sau khi server đã commit. Cơ chế requestId/receipt phải hoàn thành trước khi thêm retry tự động cho bài thi.

## Quy ước chú thích

- Javadoc trên class/record và hàm để giải thích trách nhiệm.
- Chú thích biến quan trọng khi liên quan quyền, session, trạng thái bất đồng bộ.
- Viết “vì sao” cho quyết định dễ hiểu nhầm; tránh chú thích chỉ lặp lại từng câu lệnh.
- Không log password, cookie, CSRF token.
