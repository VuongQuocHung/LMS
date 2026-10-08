# Database của base

```mermaid
erDiagram
    USERS ||--o{ COURSES : owns
    USERS ||--o{ ENROLLMENTS : enrolls
    COURSES ||--o{ ENROLLMENTS : contains
    COURSES ||--o{ LESSONS : contains
    USERS {
        bigint id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar student_code UK
        varchar role
        boolean enabled
    }
    COURSES {
        bigint id PK
        bigint teacher_id FK
        varchar title
        varchar description
        varchar status
    }
    LESSONS {
        bigint id PK
        bigint course_id FK
        varchar title
        text content
        integer position
        boolean published
    }
    ENROLLMENTS {
        bigint id PK
        bigint course_id FK
        bigint student_id FK
    }
```

Unique (course_id, student_id) ngăn ghi danh trùng. Quan hệ lưu dưới dạng ID trong entity để code đơn giản và không có lazy-loading ngoài ý muốn. Foreign key vẫn được database kiểm tra.

Chỉ triển khai bốn bảng phục vụ lát cắt hiện tại. Quiz/attempt/answer/receipt và timestamp audit sẽ có migration riêng khi triển khai phần tương ứng trong plan.
