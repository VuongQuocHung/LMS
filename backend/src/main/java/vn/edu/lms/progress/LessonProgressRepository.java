package vn.edu.lms.progress;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {
    Optional<LessonProgress> findByLessonIdAndStudentId(Long lessonId, Long studentId);
    List<LessonProgress> findByStudentIdAndLessonIdIn(Long studentId, Collection<Long> lessonIds);
    List<LessonProgress> findByLessonIdIn(Collection<Long> lessonIds);
    void deleteByLessonId(Long lessonId);
    void deleteByLessonIdIn(Collection<Long> lessonIds);
}
