# Trạng thái kiểm tra

Kiểm tra ngày 08/10/2026 trên Windows, Java 17.0.7, Node 22.23.2. Dependency đã chốt: Spring Boot 3.5.16, Next.js 16.4.0, React 19.3.0; npm có package-lock.json, Maven có Wrapper 3.9.11.

| Kiểm tra | Kết quả |
| --- | --- |
| Maven test | 8 test, 0 failure/error/skipped; dùng H2 PostgreSQL mode, Flyway V1 và Hibernate validate |
| Maven package | Đã tạo executable JAR; bước package bỏ chạy lại test vì test đã chạy riêng |
| TypeScript | npm run typecheck qua |
| ESLint | npm run lint qua |
| Next.js production build | npm run build qua |
| Chrome headless qua http://localhost:3000 | Login/logout, cookie HttpOnly qua proxy, quyền bài nháp, tạo khóa nháp, sinh viên chưa ghi danh, khóa session đang tồn tại đều qua |
| Giao diện desktop/mobile | Đã xem ảnh 1440px/390px; mobile không tràn ngang; không có pageerror trong kịch bản smoke |
| PostgreSQL thật / Docker Compose | Chưa chạy được vì Docker engine chưa hoạt động; không coi test H2 là đã xác nhận PostgreSQL |
| LAN nhiều máy | Chưa kiểm tra |

Smoke trình duyệt dùng Next.js production server và backend TestLmsApplication với H2 trong RAM, không mock API. Công cụ/ảnh tạm nằm trong .tools/browser và không đưa vào Git. Các bước tái hiện thủ công ở demo.md; integration test có trong source.

## Dependency audit

npm audit --omit=dev: 0 cảnh báo tại thời điểm kiểm tra. Audit đầy đủ có 5 mục mức high thuộc cùng chuỗi công cụ lint: eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces (GHSA-vfj7-8cjw-p6xm). Chưa có bản vá được resolver hiện tại đưa ra trong cùng nhánh; không chạy audit fix --force vì đề xuất hạ eslint-config-next về 14 không khớp Next.js 16. Theo dõi cập nhật công cụ lint; cảnh báo này không nằm trong dependency production. npm cũng báo ESLint 9 đã hết hỗ trợ; cần kiểm tra khả năng tương thích trước khi nâng major của bộ lint.

## Lần chỉnh giao diện theo ảnh tham khảo

- TypeScript, ESLint và Next.js production build đều qua sau khi đổi giao diện.
- Chrome headless: kiểm tra lưới 5 cột desktop, tìm kiếm, trạng thái, sắp xếp, đổi dạng danh sách, tạo khóa nháp, mở hồ sơ và đăng xuất.
- Kiểm tra tải chi tiết lỗi rồi thử lại và hai lần chọn khóa liên tiếp: response cũ không ghi đè khóa mới.
- Đã xem ảnh desktop 1440px và login mobile; kiểm tra không tràn ngang ở 390px cho màn hình khóa học, login và admin.
- Lần này dùng dữ liệu API giả lập trong trình duyệt riêng để kiểm tra UI; không thêm/sửa khóa hoặc tài khoản trong PostgreSQL. Script và ảnh kiểm tra tạm ở `.tools/browser/ui-refresh.cjs`.

## Giới hạn chức năng còn lại

Chưa triển khai hoặc kiểm thử module thi, ACK/retry/receipt, scheduler, archive/start race hay thực nghiệm tải. README và API contract chỉ đánh dấu các chức năng đã có trong base; checklist của LMS_PLAN.md vẫn là kế hoạch toàn dự án.
