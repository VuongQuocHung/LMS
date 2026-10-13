package vn.edu.lms.course;

import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CourseRepository extends JpaRepository<Course, Long> {
    /** Giảng viên chỉ được liệt kê khóa mình sở hữu. */
    List<Course> findByTeacherIdOrderByIdDesc(Long teacherId);

    /** Sinh viên chỉ thấy khóa đã công bố và có ghi danh của chính mình. */
    @Query("""
            select c from Course c
            where c.status = vn.edu.lms.course.CourseStatus.PUBLISHED
              and c.id in (select e.courseId from Enrollment e where e.studentId = :studentId)
            order by c.id desc
            """)
    List<Course> findVisibleToStudent(@Param("studentId") Long studentId);
    /** Tìm khóa theo tiêu đề phục vụ kiểm thử và tra cứu. */
    java.util.Optional<Course> findFirstByTitle(String title);
}
