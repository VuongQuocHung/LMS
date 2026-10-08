# LMS — bộ khung phát triển

Base cho kế hoạch [LMS_PLAN.md](../LMS_PLAN.md), ưu tiên code dễ đọc và chú thích tiếng Việt. Đây là **nền để phát triển**, chưa phải toàn bộ LMS trong kế hoạch 21 ngày.

## Đã có

- Next.js App Router + TypeScript, giao diện responsive, trạng thái tải/lỗi/rỗng.
- Giao diện cổng học tập theo ảnh tham khảo: đầu trang cam, menu ngang màu tối, lưới khóa học 5 cột trên desktop; có tìm kiếm, lọc trạng thái, sắp xếp và đổi dạng thẻ/danh sách.
- Spring Boot + Java 17, controller/service/repository, DTO và validation.
- Session HttpOnly, CSRF, đăng nhập/đăng xuất và hồ sơ ba vai trò.
- Admin xem danh sách, khóa/mở tài khoản; session cũ bị chặn ở request tiếp theo.
- Giảng viên xem khóa mình phụ trách, xem bài nháp và tạo khóa nháp.
- Sinh viên chỉ thấy khóa đã ghi danh/công bố và bài học đã công bố.
- PostgreSQL, Flyway V1, Hibernate validate, seed demo khi bật profile dev.
- Integration test dùng login/session/CSRF thật qua MockMvc; H2 chỉ trong test.

## Chưa có

CRUD đầy đủ cho tài khoản/bài học/ghi danh, publish/archive khóa qua API, soạn đề, lượt thi, lưu ACK/retry/receipt/revision, submit/scheduler, kết quả, baseline và thực nghiệm. Không có endpoint giả trả thành công cho các chức năng này. Quy tắc archive khi đang thi sẽ triển khai cùng module quiz theo plan.

## Chạy local trên Windows

Cần Node.js >= 20.9, JDK 17+ và PostgreSQL. Docker Desktop chỉ cần nếu chọn chạy database bằng Docker Compose. Maven Wrapper tải Maven lần đầu nên cần mạng. Có thể dùng Maven 3.9+ đã cài thay wrapper.

### 1. Database — terminal ở thư mục lms

```powershell
Copy-Item .env.example .env
docker compose up -d database
docker compose ps
```

PostgreSQL trong Docker mặc định ở localhost:5432, database/user là lms, mật khẩu local là lms_local_password. Nếu cổng đã dùng, đổi POSTGRES_PORT trong .env và đặt DB_URL tương ứng trong backend/.env. Nếu đã cài PostgreSQL trực tiếp và tạo database bằng pgAdmin, bỏ qua bước Docker và dùng thông tin kết nối của database đó.

### 2. Backend — terminal ở lms/backend

File `backend/.env` chứa thông tin kết nối riêng của máy bạn và được Git bỏ qua. Trên máy hiện tại file đã có thông tin chuyển từ application.yml. Khi lấy source trên máy mới, chỉ tạo file nếu chưa có:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Điền `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` trong file `.env`, rồi chạy backend:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

API ở http://localhost:8080/api/v1/health. Lần đầu Flyway tạo bảng, sau đó seed nếu bảng users trống. Có thể thay .\mvnw.cmd bằng mvn.cmd.

`application.yml` nạp `backend/.env` qua `spring.config.import` và tham chiếu ba giá trị kết nối; không chứa mật khẩu database thật. File dùng định dạng Properties: `KEY=value`, không đặt dấu nháy quanh giá trị; dấu gạch chéo ngược trong giá trị cần viết thành `\\`. Biến môi trường cùng tên được ưu tiên hơn nội dung file. Khi chạy từ IDE, đặt Working directory là thư mục `lms/backend`. File `.env` ở thư mục gốc `lms` chỉ dành cho Docker Compose, độc lập với `backend/.env`; `frontend/.env.local` chỉ cấu hình frontend. Khi chạy profile `dev`, mật khẩu tài khoản demo mặc định là `Demo@12345`; có thể đổi trong `application-dev.yml`. Đổi mật khẩu này không đổi tài khoản đã seed trước đó.

**Xem thử khi chưa có Docker/PostgreSQL:** thay lệnh chạy backend bằng `.\mvnw.cmd spring-boot:test-run`. Lệnh này dùng TestLmsApplication và H2 trong RAM với tài khoản demo, không thay cấu hình PostgreSQL chính. Dữ liệu mất khi dừng; chỉ dùng xem thử giao diện/auth, không dùng đánh giá khóa đồng thời hoặc thực nghiệm của bài thi. Không chạy đồng thời hai backend trên cổng 8080.

### 3. Frontend — terminal ở lms/frontend

```powershell
Copy-Item .env.local.example .env.local
npm.cmd ci
npm.cmd run dev
```

Mở **http://localhost:3000**. Dùng cùng hostname nhất quán khi đăng nhập. Trình duyệt gọi /api/v1 trên cổng 3000, Next.js chuyển tiếp tới backend; không gọi trực tiếp cổng 8080 trong code frontend.

### Tài khoản demo

Chỉ được tạo khi dùng profile dev và database trống. Mật khẩu chung mặc định: **Demo@12345**.

| Email | Vai trò | Dữ liệu |
| --- | --- | --- |
| admin@lms.local | ADMIN | Quản lý tài khoản |
| teacher@lms.local | TEACHER | Sở hữu khóa Lập trình mạng |
| teacher2@lms.local | TEACHER | Chưa sở hữu khóa; dùng kiểm tra quyền |
| student@lms.local | STUDENT | Đã ghi danh khóa mẫu |
| student2@lms.local | STUDENT | Chưa ghi danh; dùng kiểm tra quyền |

Các tài khoản này chỉ dùng demo local. Khi dùng HTTPS, đặt COOKIE_SECURE=true. Profile mặc định không seed tài khoản; không dùng profile dev và mật khẩu demo cho môi trường thật.

### Dừng / reset

```powershell
# Dừng database nhưng giữ dữ liệu trong volume.
docker compose down
```

Muốn **xóa toàn bộ dữ liệu demo** và seed lại: dừng backend, chạy docker compose down -v rồi docker compose up -d database và khởi động lại backend với profile dev. Lệnh -v xóa volume, chỉ dùng với dữ liệu có thể bỏ.

## Kiểm tra

Trong backend:

```powershell
.\mvnw.cmd test
.\mvnw.cmd package
```

Test không cần Docker: H2 chế độ PostgreSQL chạy migration V1, seed và kiểm tra auth/quyền. H2 không thay thế kiểm thử PostgreSQL thật, đặc biệt khóa/transaction của module thi sau này.

Trong frontend:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd start
```

Kết quả kiểm tra và giới hạn môi trường được ghi trong [docs/verification.md](docs/verification.md).

## Đọc code theo thứ tự nào?

1. [docs/code-guide.md](docs/code-guide.md): đường đi của request và ý nghĩa từng tầng.
2. [backend/.../SecurityConfig.java](backend/src/main/java/vn/edu/lms/auth/SecurityConfig.java): session, CSRF, login/logout.
3. [frontend/src/lib/api.ts](frontend/src/lib/api.ts): fetch, timeout, CSRF và lỗi.
4. [CourseController.java](backend/src/main/java/vn/edu/lms/course/CourseController.java) → [CourseService.java](backend/src/main/java/vn/edu/lms/course/CourseService.java) → [CourseRepository.java](backend/src/main/java/vn/edu/lms/course/CourseRepository.java).
5. [CourseWorkspace.tsx](frontend/src/components/CourseWorkspace.tsx): gọi API và hiển thị dữ liệu.
6. [BaseIntegrationTest.java](backend/src/test/java/vn/edu/lms/BaseIntegrationTest.java): các ví dụ kiểm tra quyền với session thật.

## Cấu trúc

```text
lms/
  backend/
    src/main/java/vn/edu/lms/
      auth/          # Session, CSRF, người dùng hiện tại, kiểm tra tài khoản khóa
      user/          # Tài khoản, vai trò và API quản trị tối thiểu
      course/        # Khóa học, bài học, kiểm tra quyền sở hữu/ghi danh
      enrollment/    # Liên kết sinh viên và khóa
      common/        # Lỗi API, health, seed demo
    src/main/resources/db/migration/
    src/test/        # Test riêng, không chạy vào database thật
  frontend/src/
    app/            # Trang, layout và CSS
    components/     # Form và các vùng giao diện
    lib/            # API client, kiểu dữ liệu chung
  docs/
  compose.yaml      # PostgreSQL local
```

Không dùng Lombok, generic CRUD base class, Redux hoặc abstraction nhiều tầng ở giai đoạn này. Chỉ tách phần dùng chung khi có nhu cầu thực tế.

## Tài liệu kỹ thuật

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/reference/index.html)
- [Spring Security session](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html)
- [API hiện có](docs/api-contract.md), [ERD](docs/erd.md), [demo](docs/demo.md).
