package vn.edu.lms.assignment;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizOptionRepository extends JpaRepository<QuizOption, Long> {
    List<QuizOption> findByQuestionIdOrderByPositionAscIdAsc(Long questionId);
    List<QuizOption> findByQuestionIdInOrderByPositionAscIdAsc(Collection<Long> questionIds);
    void deleteByQuestionId(Long questionId);
    void deleteByQuestionIdIn(Collection<Long> questionIds);
}
