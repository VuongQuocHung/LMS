package vn.edu.lms.course;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
    /** Lấy bài học theo thứ tự; service sẽ lọc bài nháp theo vai trò. */
    List<Lesson> findByCourseIdOrderByPositionAscIdAsc(Long courseId);
}
