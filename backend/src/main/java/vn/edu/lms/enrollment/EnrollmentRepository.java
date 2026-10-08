package vn.edu.lms.enrollment;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    /** Kiểm tra quyền học một khóa, kể cả khi người dùng tự sửa ID trên URL. */
    boolean existsByCourseIdAndStudentId(Long courseId, Long studentId);
}
