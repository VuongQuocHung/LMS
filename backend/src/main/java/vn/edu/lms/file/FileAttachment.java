package vn.edu.lms.file;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "file_attachments")
public class FileAttachment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "original_name", nullable = false)
    private String originalName;
    @Column(name = "storage_key", nullable = false, length = 50)
    private String storageKey;
    @Column(name = "content_type", nullable = false, length = 150)
    private String contentType;
    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;
    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
    @Column(name = "lesson_id") private Long lessonId;
    @Column(name = "assignment_id") private Long assignmentId;
    @Column(name = "draft_id") private Long draftId;
    @Column(name = "submission_id") private Long submissionId;
    protected FileAttachment() {}
    public FileAttachment(String name, String key, String type, long size, Long uploader,
                          Long lesson, Long assignment, Long draft) {
        originalName = name; storageKey = key; contentType = type; sizeBytes = size;
        uploadedBy = uploader; lessonId = lesson; assignmentId = assignment; draftId = draft;
    }
    public Long getId() { return id; }
    public String getStorageKey() { return storageKey; }
    public String getOriginalName() { return originalName; }
    public String getContentType() { return contentType; }
    public long getSizeBytes() { return sizeBytes; }
    public Long getLessonId() { return lessonId; }
    public Long getAssignmentId() { return assignmentId; }
    public Long getDraftId() { return draftId; }
    public Long getSubmissionId() { return submissionId; }
    public void submit(Long id) { draftId = null; submissionId = id; }
    public View view() { return new View(id, originalName, contentType, sizeBytes, createdAt); }
    public record View(Long id, String originalName, String contentType, long sizeBytes, Instant createdAt) {}
}
