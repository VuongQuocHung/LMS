package vn.edu.lms.assignment;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {
    List<AssignmentSubmission> findByAssignmentIdOrderBySubmittedAtDesc(Long assignmentId);
    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);
    List<AssignmentSubmission> findByAssignmentIdInAndStudentId(Collection<Long> assignmentIds, Long studentId);
    List<AssignmentSubmission> findByAssignmentIdIn(Collection<Long> assignmentIds);
    boolean existsByAssignmentIdAndStudentId(Long assignmentId, Long studentId);
    void deleteByAssignmentId(Long assignmentId);
}
