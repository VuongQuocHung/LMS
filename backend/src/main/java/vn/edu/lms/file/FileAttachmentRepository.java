package vn.edu.lms.file;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {
    List<FileAttachment> findByLessonIdOrderByIdAsc(Long id);
    List<FileAttachment> findByAssignmentIdOrderByIdAsc(Long id);
    List<FileAttachment> findByDraftIdOrderByIdAsc(Long id);
    List<FileAttachment> findBySubmissionIdOrderByIdAsc(Long id);
    boolean existsByStorageKey(String key);
}
