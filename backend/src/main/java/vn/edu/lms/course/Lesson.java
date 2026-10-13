package vn.edu.lms.course;

import jakarta.persistence.*;

@Entity
@Table(name = "lessons")
public class Lesson {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;
    @Column(nullable = false, length = 150)
    private String title;
    // Base dùng văn bản thuần; frontend không render HTML tùy ý.
    @Column(nullable = false, columnDefinition = "text")
    private String content;
    @Column(nullable = false)
    private int position;
    @Column(nullable = false)
    private boolean published;

    /** Constructor dành cho JPA. */
    protected Lesson() {}

    /** Tạo bài học demo hoặc bài học mới thuộc một khóa. */
    public Lesson(Long courseId, String title, String content, int position, boolean published) {
        this.courseId = courseId;
        this.title = title;
        this.content = content;
        this.position = position;
        this.published = published;
    }

    /** Lấy ID bài học. */
    public Long getId() { return id; }
    /** Lấy tên bài học. */
    public String getTitle() { return title; }
    /** Lấy nội dung văn bản. */
    public String getContent() { return content; }
    /** Lấy thứ tự trong khóa. */
    public int getPosition() { return position; }
    /** Lấy ID khóa học chứa bài này. */
    public Long getCourseId() { return courseId; }
    /** Phân biệt bài nháp với bài đã công bố. */
    public boolean isPublished() { return published; }
    /** Cập nhật tiêu đề bài học. */
    public void setTitle(String title) { this.title = title; }
    /** Cập nhật nội dung bài học. */
    public void setContent(String content) { this.content = content; }
    /** Cập nhật thứ tự hiển thị. */
    public void setPosition(int position) { this.position = position; }
    /** Cập nhật trạng thái công bố bài học. */
    public void setPublished(boolean published) { this.published = published; }
}
