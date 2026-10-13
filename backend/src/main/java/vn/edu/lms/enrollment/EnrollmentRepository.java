package vn.edu.lms.enrollment;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    /** Kiểm tra quyền học một khóa, kể cả khi người dùng tự sửa ID trên URL. */
    boolean existsByCourseIdAndStudentId(Long courseId, Long studentId);

    /** Lấy danh sách ghi danh của một khóa học. */
    java.util.List<Enrollment> findByCourseId(Long courseId);
    java.util.List<Enrollment> findByCourseIdOrderByIdDesc(Long courseId);

    /** Tìm bản ghi ghi danh của sinh viên trong khóa. */
    java.util.Optional<Enrollment> findByCourseIdAndStudentId(Long courseId, Long studentId);

    /** Xóa toàn bộ ghi danh khi xóa khóa học. */
    void deleteByCourseId(Long courseId);

    /** Hủy ghi danh một sinh viên khỏi khóa học. */
    void deleteByCourseIdAndStudentId(Long courseId, Long studentId);
}
