package vn.edu.lms.file;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface EssayDraftRepository extends JpaRepository<EssayDraft, Long> {
    Optional<EssayDraft> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);
}
