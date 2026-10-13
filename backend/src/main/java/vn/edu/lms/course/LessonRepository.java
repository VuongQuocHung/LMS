package vn.edu.lms.course;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
    /** Lấy bài học theo thứ tự; service sẽ lọc bài nháp theo vai trò. */
    List<Lesson> findByCourseIdOrderByPositionAscIdAsc(Long courseId);

    /** Tìm bài học theo ID và ID khóa học. */
    java.util.Optional<Lesson> findByIdAndCourseId(Long id, Long courseId);

    /** Xóa toàn bộ bài học thuộc về một khóa học khi xóa khóa. */
    void deleteByCourseId(Long courseId);
}
