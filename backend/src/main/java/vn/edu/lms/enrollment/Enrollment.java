package vn.edu.lms.enrollment;

import jakarta.persistence.*;

@Entity
@Table(name = "enrollments")
public class Enrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "course_id", nullable = false)
    private Long courseId;
    @Column(name = "student_id", nullable = false)
    private Long studentId;

    /** Constructor dành cho JPA. */
    protected Enrollment() {}

    /** Liên kết sinh viên với khóa; database chặn ghi danh trùng. */
    public Enrollment(Long courseId, Long studentId) {
        this.courseId = courseId;
        this.studentId = studentId;
    }
}
