package vn.edu.lms.assignment;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    List<QuizQuestion> findByAssignmentIdOrderByPositionAscIdAsc(Long assignmentId);
    void deleteByAssignmentId(Long assignmentId);
}
