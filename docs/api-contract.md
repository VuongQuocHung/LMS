# API đã triển khai trong LMS

Prefix `/api/v1`. Dữ liệu tài khoản không cache; tất cả API ngoài `/health`, `/auth/csrf` và `/auth/login` yêu cầu session xác thực.

## File đính kèm và bài tự luận nháp (V3)

Mọi mutation cần CSRF; upload dùng `multipart/form-data` với một trường `file` mỗi request.

| Method | URL | Kết quả / Quyền |
| --- | --- | --- |
| GET | `/files/limits` | `{maxBytes,maxCount}`; đã đăng nhập |
| GET/POST | `/lessons/{id}/files` | Danh sách/upload tài liệu; chỉ chủ khóa được upload |
| GET/POST | `/assignments/{id}/files` | Danh sách/upload đề bài; chỉ chủ khóa được upload |
| GET/POST | `/drafts/{assignmentId}/files` | File bản nháp của sinh viên đang đăng nhập; không nhận studentId từ client |
| GET | `/submissions/{id}/files` | File bài đã nộp; chủ bài hoặc giảng viên sở hữu khóa |
| GET | `/files/{id}/download` | Dữ liệu file, Content-Disposition attachment, private/no-store |
| DELETE | `/files/{id}` | 204; chủ khóa xóa tài liệu/đề bài, sinh viên xóa file nháp của mình |
| GET | `/assignments/{id}/draft` | `{content,files}`; trả bản nháp rỗng nếu chưa có |
| PUT | `/assignments/{id}/draft` | Body `{content}`; lưu bản nháp, chưa tính là nộp bài |
| POST | `/assignments/{id}/submit-essay` | Chốt bài cùng file; body `{content}` hoặc `{}` để dùng nội dung đã lưu |

File DTO: `{id,originalName,contentType,sizeBytes,createdAt}`. Upload thành công trả 201.
ID là BIGINT tự tăng; storage_key không được trả qua API.

- Mặc định 5 file/mục, 20 MiB/file; PDF, DOCX, PPTX, XLSX, TXT UTF-8, ZIP. Kiểm tra tên và nội dung, không tin MIME client gửi.
- Sinh viên phải được ghi danh, khóa và bài học/bài tập phải được công bố. Admin không có quyền đọc file mặc định.
- Bài nháp tự luận không vào số bài đã nộp, lịch trạng thái nộp hay sổ điểm. Giảng viên không đọc được file nháp.
- Chặn sửa/upload/nộp trước `openAt`; cho nộp sau `dueAt` với trạng thái `LATE`, theo nghiệp vụ hiện tại.
- Bài tự luận cần nội dung không rỗng hoặc ít nhất một file. Chốt thành công chuyển file từ nháp sang bài nộp trong cùng giao dịch; không cho sửa/xóa file đã nộp.
- Khóa hàng khóa học để tuần tự hóa upload/xóa/chốt, chặn vượt số file và thay file đồng thời với nộp bài.
- Lỗi: 400 `INVALID_FILE`/`FILE_SIZE`/`EMPTY_SUBMISSION`, 413 khi vượt multipart limit; 403 sai quyền/chưa mở; 404 không tồn tại; 409 `FILE_LIMIT`/`ALREADY_SUBMITTED`.
- File chỉ tải qua endpoint có xác thực; không được phục vụ từ thư mục static/public.

## Danh mục Endpoint

### 1. Xác thực & Quản lý phiên (Authentication)
| Method | URL | Quyền | Kết quả | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/health` | Công khai | 200: `{"status":"UP"}` | Kiểm tra trạng thái hoạt động của API |
| **GET** | `/auth/csrf` | Công khai | 200: `{"headerName":"...","token":"..."}` | Lấy CSRF token cho session hiện tại |
| **POST** | `/auth/login` | CSRF (form-urlencoded) | 204 No Content | Đăng nhập tài khoản, cấp cookie session HttpOnly |
| **POST** | `/auth/logout` | CSRF | 204 No Content | Đăng xuất, hủy session phía server |
| **GET** | `/auth/me` | Đã đăng nhập | 200: `UserView` | Lấy thông tin tài khoản người dùng hiện tại |

### 2. Quản trị tài khoản (User Management - Admin)
| Method | URL | Quyền | Kết quả | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/users` | ADMIN | 200: `List<UserView>` | Danh sách tài khoản hệ thống |
| **GET** | `/users/{id}` | ADMIN | 200: `UserView` | Xem chi tiết thông tin một tài khoản |
| **POST** | `/users` | ADMIN + CSRF | 201: `UserView` | Tạo tài khoản mới (hỗ trợ ADMIN, TEACHER, STUDENT) |
| **PUT** | `/users/{id}` | ADMIN + CSRF | 200: `UserView` | Cập nhật thông tin tài khoản |
| **PATCH** | `/users/{id}` | ADMIN + CSRF | 200: `UserView` | Khóa hoặc mở khóa tài khoản người dùng |

### 3. Quản lý Khóa học & Bài học (Course & Lesson Management)
| Method | URL | Quyền | Kết quả | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/courses` | TEACHER / STUDENT | 200: `List<CourseView>` | Danh sách khóa học được phép xem theo vai trò |
| **GET** | `/courses/{id}` | Chủ khóa / SV ghi danh | 200: `CourseDetail` | Xem chi tiết khóa học và bài học được phép đọc |
| **POST** | `/courses` | TEACHER + CSRF | 201: `CourseView` | Tạo khóa học nháp mới |
| **PUT** | `/courses/{id}` | Chủ khóa + CSRF | 200: `CourseView` | Cập nhật tiêu đề và mô tả khóa học |
| **PATCH** | `/courses/{id}/status` | Chủ khóa + CSRF | 200: `CourseView` | Thay đổi trạng thái khóa học (`DRAFT`, `PUBLISHED`, `ARCHIVED`) |
| **DELETE** | `/courses/{id}` | Chủ khóa + CSRF | 204 No Content | Xóa khóa học cùng toàn bộ bài học, bài tập và ghi danh |
| **GET** | `/courses/{id}/lessons/{lessonId}` | Chủ khóa / SV ghi danh | 200: `LessonView` | Đọc chi tiết bài học |
| **POST** | `/courses/{id}/lessons` | Chủ khóa + CSRF | 201: `LessonView` | Thêm bài học mới vào khóa học |
| **PUT** | `/courses/{id}/lessons/{lessonId}` | Chủ khóa + CSRF | 200: `LessonView` | Chỉnh sửa tiêu đề, nội dung, thứ tự, trạng thái công bố |
| **DELETE** | `/courses/{id}/lessons/{lessonId}` | Chủ khóa + CSRF | 204 No Content | Xóa bài học khỏi khóa |

### 4. Thành viên & Ghi danh (Enrollments)
| Method | URL | Quyền | Kết quả | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/courses/{id}/enrollments` | Chủ khóa / ADMIN | 200: `List<EnrollmentView>` | Xem danh sách sinh viên ghi danh trong khóa |
| **POST** | `/courses/{id}/enrollments` | Chủ khóa / ADMIN + CSRF | 201: `EnrollmentView` | Ghi danh sinh viên vào khóa học |
| **DELETE** | `/courses/{id}/enrollments/{studentId}` | Chủ khóa / ADMIN + CSRF | 204 No Content | Hủy ghi danh sinh viên khỏi khóa học |

### 5. Quản lý Bài tập (Assignments - Quiz & Essay)
| Method | URL | Quyền | Kết quả | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/courses/{courseId}/assignments` | Chủ khóa / SV ghi danh | 200: `List<AssignmentView>` | Danh sách bài tập trong khóa học |
| **POST** | `/courses/{courseId}/assignments` | Chủ khóa + CSRF | 201: `AssignmentView` | Tạo bài tập mới (loại `QUIZ` hoặc `ESSAY`) |
| **GET** | `/assignments/{assignmentId}` | Chủ khóa / SV ghi danh | 200: `AssignmentView` | Xem chi tiết bài tập |
| **PUT** | `/assignments/{assignmentId}` | Chủ khóa + CSRF | 200: `AssignmentView` | Cập nhật thông tin bài tập |
| **DELETE** | `/assignments/{assignmentId}` | Chủ khóa + CSRF | 204 No Content | Xóa bài tập cùng toàn bộ câu hỏi và bài nộp |
| **GET** | `/assignments/{assignmentId}/questions` | Chủ khóa / SV ghi danh | 200: `List<QuizQuestionView>` | Danh sách câu hỏi trắc nghiệm (ẩn đáp án đúng nếu SV chưa nộp) |
| **POST** | `/assignments/{assignmentId}/questions` | Chủ khóa + CSRF | 201: `QuizQuestionView` | Thêm câu hỏi và phương án vào bài trắc nghiệm |
| **DELETE** | `/questions/{questionId}` | Chủ khóa + CSRF | 204 No Content | Xóa câu hỏi khỏi bài trắc nghiệm |
| **POST** | `/assignments/{assignmentId}/submit-quiz` | SV ghi danh + CSRF | 200: `SubmissionView` | Sinh viên nộp bài trắc nghiệm; hệ thống tự động chấm điểm |
| **POST** | `/assignments/{assignmentId}/submit-essay` | SV ghi danh + CSRF | 200: `SubmissionView` | Sinh viên nộp bài viết tự luận |
| **GET** | `/assignments/{assignmentId}/my-submission` | SV ghi danh | 200: `SubmissionView` | Sinh viên xem lại bài làm, điểm số và nhận xét của mình |
| **GET** | `/assignments/{assignmentId}/submissions` | Chủ khóa | 200: `List<SubmissionView>` | Giảng viên xem danh sách bài nộp của cả lớp |
| **PUT** | `/submissions/{submissionId}/grade` | Chủ khóa + CSRF | 200: `SubmissionView` | Giảng viên chấm điểm và nhập nhận xét bài viết tự luận |
| **GET** | `/courses/{courseId}/gradebook` | Chủ khóa / SV ghi danh | 200: `GradebookView` | Sổ điểm tổng hợp của khóa học |

### 6. Thông báo Khóa học (Announcements)
| Method | URL | Quyền | Kết quả | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/courses/{courseId}/announcements` | Chủ khóa / SV ghi danh | 200: `List<AnnouncementView>` | Danh sách thông báo trong khóa học |
| **POST** | `/courses/{courseId}/announcements` | Chủ khóa + CSRF | 201: `AnnouncementView` | Đăng thông báo mới |
| **DELETE** | `/announcements/{announcementId}` | Chủ khóa + CSRF | 204 No Content | Xóa thông báo |

### 7. Diễn đàn Thảo luận (Discussions)
| Method | URL | Quyền | Kết quả | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/courses/{courseId}/discussions` | Chủ khóa / SV ghi danh | 200: `List<TopicView>` | Danh sách chủ đề thảo luận |
| **POST** | `/courses/{courseId}/discussions` | Chủ khóa / SV ghi danh + CSRF | 201: `TopicView` | Tạo chủ đề thảo luận mới |
| **GET** | `/discussions/{topicId}` | Chủ khóa / SV ghi danh | 200: `TopicDetailView` | Xem chi tiết chủ đề và các phản hồi |
| **POST** | `/discussions/{topicId}/posts` | Chủ khóa / SV ghi danh + CSRF | 201: `PostView` | Gửi phản hồi vào chủ đề thảo luận |
| **DELETE** | `/discussions/{topicId}` | Tác giả / Chủ khóa + CSRF | 204 No Content | Xóa chủ đề thảo luận |
| **DELETE** | `/posts/{postId}` | Tác giả / Chủ khóa + CSRF | 204 No Content | Xóa phản hồi thảo luận |

### 8. Lịch học & Tiến độ bài học (Schedule & Progress)
| Method | URL | Quyền | Kết quả | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/schedule` | Đã đăng nhập | 200: `ScheduleView` | Danh sách bài tập sắp đến hạn và đã qua hạn của người dùng |
| **GET** | `/courses/{courseId}/progress` | Chủ khóa / SV ghi danh | 200: `CourseProgressView` | Tỷ lệ và danh sách bài học đã hoàn thành của sinh viên |
| **POST** | `/lessons/{lessonId}/progress` | SV ghi danh + CSRF | 200: `LessonProgressView` | Đánh dấu hoặc hủy đánh dấu hoàn thành bài học |
