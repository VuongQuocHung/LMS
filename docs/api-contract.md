# API đã triển khai trong base

Prefix /api/v1. Dữ liệu tài khoản không cache; tất cả API ngoài health, csrf và login cần session.

| Method | URL | Quyền | Kết quả |
| --- | --- | --- | --- |
| GET | /health | Công khai | 200: status UP; chỉ kiểm tra API |
| GET | /auth/csrf | Công khai | 200: headerName, token |
| POST | /auth/login | CSRF | 204 và cookie session; sai thông tin trả 401 |
| POST | /auth/logout | CSRF | 204, hủy session |
| GET | /auth/me | Đã đăng nhập | 200: UserView |
| GET | /users | ADMIN | 200: danh sách UserView |
| PATCH | /users/{id} | ADMIN + CSRF | 200: tài khoản sau khóa/mở |
| GET | /courses | TEACHER / STUDENT | 200: khóa sở hữu hoặc đã ghi danh/công bố |
| GET | /courses/{id} | Chủ khóa / sinh viên được học | 200: course, lessons |
| POST | /courses | TEACHER + CSRF | 201: khóa DRAFT |

## Login

Content-Type: application/x-www-form-urlencoded

```text
email=student%40lms.local&password=...
```

Lấy header từ GET /auth/csrf, gửi token với cookie cùng session. Sau login/logout token có thể đổi; frontend lấy token hiện tại trước mutation.

## Tạo khóa

```json
{"title":"Lập trình mạng","description":"Mô tả khóa học"}
```

title bắt buộc, tối đa 150 ký tự; description không null, tối đa 2000 ký tự. teacherId được lấy từ session. Bản base chưa có publish/update/delete.

## Khóa / mở tài khoản

```json
{"enabled":false}
```

enabled bắt buộc. Không cho tự thay trạng thái tài khoản hiện tại (409 SELF_LOCK_NOT_ALLOWED). Request của tài khoản bị khóa trả 403 ACCOUNT_DISABLED và hủy session đó; request đã qua kiểm tra trước commit khóa có thể hoàn tất.

## Lỗi

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Vui lòng kiểm tra dữ liệu.",
  "fieldErrors": {"title": "Tên khóa học không được trống."}
}
```

400: dữ liệu sai; 401: chưa đăng nhập/login thất bại; 403: quyền/CSRF/tài khoản khóa; 404: khóa/tài khoản không tồn tại; 409: xung đột; 500: lỗi nội bộ đã che chi tiết.

Danh sách chưa phân trang trong base, chỉ dùng dataset demo nhỏ. Các endpoint thi trong LMS_PLAN.md là thiết kế tương lai, chưa triển khai.
