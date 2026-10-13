package vn.edu.lms.course;

import jakarta.persistence.*;

@Entity
@Table(name = "courses")
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Lưu ID thay vì quan hệ entity lồng nhau để tránh tải ngầm và JSON vòng lặp.
    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CourseStatus status;

    /** Constructor dành cho JPA. */
    protected Course() {}

    /** Tạo khóa với chủ sở hữu lấy từ session, không lấy từ dữ liệu frontend. */
    public Course(Long teacherId, String title, String description, CourseStatus status) {
        this.teacherId = teacherId;
        this.title = title;
        this.description = description;
        this.status = status;
    }

    /** Lấy ID khóa học. */
    public Long getId() { return id; }
    /** Lấy giảng viên sở hữu để kiểm tra quyền trên bản ghi. */
    public Long getTeacherId() { return teacherId; }
    /** Lấy tiêu đề hiển thị. */
    public String getTitle() { return title; }
    /** Lấy mô tả ngắn của khóa. */
    public String getDescription() { return description; }
    /** Lấy trạng thái để quyết định sinh viên có thể xem hay không. */
    public CourseStatus getStatus() { return status; }
    /** Cập nhật tiêu đề khóa học. */
    public void setTitle(String title) { this.title = title; }
    /** Cập nhật mô tả khóa học. */
    public void setDescription(String description) { this.description = description; }
    /** Cập nhật trạng thái khóa học (DRAFT, PUBLISHED, ARCHIVED). */
    public void setStatus(CourseStatus status) { this.status = status; }
}
