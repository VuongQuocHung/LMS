# Kiến trúc cơ sở dữ liệu LMS (Flyway V1–V3)

V3 bổ sung `essay_drafts` (bản nháp tự luận riêng, unique assignment_id + student_id)
và `file_attachments` (metadata file). Tất cả khóa chính tiếp tục dùng BIGINT IDENTITY.
Nội dung file nằm trên ổ đĩa, không phải BLOB trong PostgreSQL.
`file_attachments` có bốn FK nullable: lesson_id, assignment_id, draft_id, submission_id;
CHECK bắt buộc đúng một FK có giá trị. Các FK này ON DELETE CASCADE.
Khi nộp bài, draft_id chuyển thành submission_id rồi bản nháp được xóa trong cùng giao dịch.

```mermaid
erDiagram
    ASSIGNMENTS ||--o{ ESSAY_DRAFTS : "bản nháp"
    USERS ||--o{ ESSAY_DRAFTS : "soạn bài"
    USERS ||--o{ FILE_ATTACHMENTS : "upload"
    LESSONS |o--o{ FILE_ATTACHMENTS : "tài liệu"
    ASSIGNMENTS |o--o{ FILE_ATTACHMENTS : "đề bài"
    ESSAY_DRAFTS |o--o{ FILE_ATTACHMENTS : "file nháp"
    ASSIGNMENT_SUBMISSIONS |o--o{ FILE_ATTACHMENTS : "file đã chốt"
    ESSAY_DRAFTS {
        bigint id PK
        bigint assignment_id FK
        bigint student_id FK
        text content
    }
    FILE_ATTACHMENTS {
        bigint id PK
        varchar original_name
        varchar storage_key UK
        varchar content_type
        bigint size_bytes
        bigint uploaded_by FK
        timestamp created_at
        bigint lesson_id FK
        bigint assignment_id FK
        bigint draft_id FK
        bigint submission_id FK
    }
    USERS ||--o{ COURSES : "giảng dạy"
    USERS ||--o{ ENROLLMENTS : "ghi danh"
    COURSES ||--o{ ENROLLMENTS : "chứa"
    COURSES ||--o{ LESSONS : "chứa"
    COURSES ||--o{ ASSIGNMENTS : "giao bài tập"
    COURSES ||--o{ COURSE_ANNOUNCEMENTS : "thông báo"
    COURSES ||--o{ DISCUSSION_TOPICS : "thảo luận"

    ASSIGNMENTS ||--o{ QUIZ_QUESTIONS : "gồm các câu hỏi"
    QUIZ_QUESTIONS ||--o{ QUIZ_OPTIONS : "gồm các phương án"

    ASSIGNMENTS ||--o{ ASSIGNMENT_SUBMISSIONS : "nhận bài nộp"
    USERS ||--o{ ASSIGNMENT_SUBMISSIONS : "nộp bài"
    ASSIGNMENT_SUBMISSIONS ||--o{ QUIZ_ANSWERS : "chứa câu trả lời"
    QUIZ_QUESTIONS ||--o{ QUIZ_ANSWERS : "được trả lời"

    DISCUSSION_TOPICS ||--o{ DISCUSSION_POSTS : "gồm các phản hồi"
    LESSONS ||--o{ LESSON_PROGRESS : "theo dõi tiến độ"
    USERS ||--o{ LESSON_PROGRESS : "hoàn thành"

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
    ASSIGNMENTS {
        bigint id PK
        bigint course_id FK
        varchar title
        text description
        varchar type
        timestamp open_at
        timestamp due_at
        double max_score
        varchar status
        timestamp created_at
    }
    QUIZ_QUESTIONS {
        bigint id PK
        bigint assignment_id FK
        text question_text
        double points
        integer position
    }
    QUIZ_OPTIONS {
        bigint id PK
        bigint question_id FK
        text option_text
        boolean is_correct
        integer position
    }
    ASSIGNMENT_SUBMISSIONS {
        bigint id PK
        bigint assignment_id FK
        bigint student_id FK
        text content
        double score
        text feedback
        varchar status
        timestamp submitted_at
        timestamp graded_at
        bigint graded_by FK
    }
    QUIZ_ANSWERS {
        bigint id PK
        bigint submission_id FK
        bigint question_id FK
        bigint selected_option_id FK
    }
    COURSE_ANNOUNCEMENTS {
        bigint id PK
        bigint course_id FK
        bigint author_id FK
        varchar title
        text content
        timestamp created_at
    }
    DISCUSSION_TOPICS {
        bigint id PK
        bigint course_id FK
        bigint author_id FK
        varchar title
        text content
        timestamp created_at
    }
    DISCUSSION_POSTS {
        bigint id PK
        bigint topic_id FK
        bigint author_id FK
        text content
        timestamp created_at
    }
    LESSON_PROGRESS {
        bigint id PK
        bigint lesson_id FK
        bigint student_id FK
        boolean completed
        timestamp completed_at
    }
```

## Các ràng buộc và tối ưu:
- `uq_enrollment`: Unique `(course_id, student_id)` ngăn ghi danh trùng lặp.
- `uq_assignment_student`: Unique `(assignment_id, student_id)` ngăn một sinh viên nộp trùng nhiều bài nộp trong cùng bài tập.
- `uq_submission_question`: Unique `(submission_id, question_id)` ngăn sinh viên gửi trùng câu trả lời cho cùng câu hỏi.
- `uq_lesson_student`: Unique `(lesson_id, student_id)` lưu trạng thái hoàn thành bài học của sinh viên.
- Các bảng sử dụng ID tham chiếu độc lập, đảm bảo query JPA nhanh chóng, không bị N+1 hay lazy load ngoài ý muốn. Foreign key được database PostgreSQL và H2 kiểm tra toàn vẹn ở tầng lưu trữ.
