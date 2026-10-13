package vn.edu.lms.assignment;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAnswerRepository extends JpaRepository<QuizAnswer, Long> {
    List<QuizAnswer> findBySubmissionId(Long submissionId);
    List<QuizAnswer> findBySubmissionIdIn(Collection<Long> submissionIds);
    void deleteBySubmissionId(Long submissionId);
}
