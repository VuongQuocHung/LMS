package vn.edu.lms.file;

import jakarta.persistence.*;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Instant;
import java.util.List;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.lms.assignment.*;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.course.*;
import vn.edu.lms.enrollment.EnrollmentRepository;
import vn.edu.lms.user.*;

@Service
@Transactional(readOnly = true)
public class AttachmentService {
    private final EntityManager em;
    private final FileAttachmentRepository files;
    private final EssayDraftRepository drafts;
    private final AssignmentSubmissionRepository submissions;
    private final EnrollmentRepository enrollments;
    private final FileStorage storage;
    private final long maxBytes;
    private final int maxCount;
    public AttachmentService(EntityManager em, FileAttachmentRepository files, EssayDraftRepository drafts,
            AssignmentSubmissionRepository submissions, EnrollmentRepository enrollments, FileStorage storage,
            @Value("${app.files.max-bytes:20971520}") long maxBytes, @Value("${app.files.max-count:5}") int maxCount) {
        this.em = em; this.files = files; this.drafts = drafts; this.submissions = submissions;
        this.enrollments = enrollments; this.storage = storage; this.maxBytes = maxBytes; this.maxCount = maxCount;
    }
    public record DraftView(String content, List<FileAttachment.View> files) {}
    public record Download(FileAttachment.View file, FileSystemResource resource) {}
    public record Limits(long maxBytes, int maxCount) {}
    public Limits limits() { return new Limits(maxBytes, maxCount); }

    private <T> T require(Class<T> type, Long id) {
        T value = em.find(type, id);
        if (value == null) throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy dữ liệu.");
        return value;
    }
    private Course course(Long id, boolean lock) {
        Course c = lock ? em.find(Course.class, id, LockModeType.PESSIMISTIC_WRITE) : em.find(Course.class, id);
        if (c == null) throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy khóa học.");
        return c;
    }
    private boolean owner(Course c, UserAccount user) {
        return user.getRole() == Role.TEACHER && c.getTeacherId().equals(user.getId());
    }
    private void access(Course c, UserAccount user, boolean published, boolean write) {
        if (owner(c, user)) return;
        if (!write && published && c.getStatus() == CourseStatus.PUBLISHED && user.getRole() == Role.STUDENT
                && enrollments.existsByCourseIdAndStudentId(c.getId(), user.getId())) return;
        throw forbidden();
    }
    private ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền truy cập file này.");
    }

    /** Khóa hàng khóa học xuyên suốt upload/xóa/lưu/chốt để tránh vượt giới hạn hoặc sửa sau nộp. */
    private Assignment essay(Long id, UserAccount user, boolean write) {
        Assignment a = require(Assignment.class, id);
        Course c = course(a.getCourseId(), write);
        if (write) em.refresh(a);
        access(c, user, a.getStatus() == AssignmentStatus.PUBLISHED, false);
        if (user.getRole() != Role.STUDENT || a.getType() != AssignmentType.ESSAY) throw forbidden();
        if (write) {
            if (a.getOpenAt() != null && Instant.now().isBefore(a.getOpenAt()))
                throw new ApiException(HttpStatus.FORBIDDEN, "NOT_OPEN", "Chưa đến thời gian mở bài tập.");
            if (submissions.existsByAssignmentIdAndStudentId(id, user.getId()))
                throw new ApiException(HttpStatus.CONFLICT, "ALREADY_SUBMITTED", "Bài đã nộp, không thể thay đổi.");
        }
        return a;
    }
    public DraftView draft(Long assignmentId, UserAccount user) {
        essay(assignmentId, user, false);
        return drafts.findByAssignmentIdAndStudentId(assignmentId, user.getId())
                .map(d -> new DraftView(d.getContent(), views(files.findByDraftIdOrderByIdAsc(d.getId()))))
                .orElse(new DraftView("", List.of()));
    }
    @Transactional
    public DraftView saveDraft(Long assignmentId, String content, UserAccount user) {
        essay(assignmentId, user, true);
        EssayDraft d = getOrCreateDraft(assignmentId, user);
        d.setContent(content == null ? "" : content);
        return new DraftView(d.getContent(), views(files.findByDraftIdOrderByIdAsc(d.getId())));
    }
    private EssayDraft getOrCreateDraft(Long assignmentId, UserAccount user) {
        return drafts.findByAssignmentIdAndStudentId(assignmentId, user.getId())
                .orElseGet(() -> drafts.saveAndFlush(new EssayDraft(assignmentId, user.getId())));
    }
    @Transactional
    public AssignmentSubmission submitEssay(Long assignmentId, String content, UserAccount user) {
        Assignment a = essay(assignmentId, user, true);
        EssayDraft d = getOrCreateDraft(assignmentId, user);
        String finalContent = content == null ? d.getContent() : content.trim();
        List<FileAttachment> attached = files.findByDraftIdOrderByIdAsc(d.getId());
        if (finalContent.isBlank() && attached.isEmpty())
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_SUBMISSION", "Nhập nội dung hoặc đính kèm ít nhất một file.");
        SubmissionStatus status = a.getDueAt() != null && Instant.now().isAfter(a.getDueAt())
                ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;
        AssignmentSubmission s = submissions.saveAndFlush(new AssignmentSubmission(assignmentId, user.getId(), finalContent, status));
        attached.forEach(f -> f.submit(s.getId()));
        files.flush();
        drafts.delete(d);
        return s;
    }
    private List<FileAttachment.View> views(List<FileAttachment> list) { return list.stream().map(FileAttachment::view).toList(); }

    public List<FileAttachment.View> list(String kind, Long id, UserAccount user) {
        return views(target(kind, id, user, false));
    }
    private List<FileAttachment> target(String kind, Long id, UserAccount user, boolean write) {
        switch (kind) {
            case "lessons": {
                Lesson l = require(Lesson.class, id);
                Course c = course(l.getCourseId(), write);
                if (write) em.refresh(l);
                access(c, user, l.isPublished(), write);
                return files.findByLessonIdOrderByIdAsc(id);
            }
            case "assignments": {
                Assignment a = require(Assignment.class, id);
                Course c = course(a.getCourseId(), write);
                if (write) em.refresh(a);
                access(c, user, a.getStatus() == AssignmentStatus.PUBLISHED, write);
                return files.findByAssignmentIdOrderByIdAsc(id);
            }
            case "drafts": {
                // URL dùng assignmentId; không cho client chọn studentId hoặc draftId.
                essay(id, user, write);
                var d = drafts.findByAssignmentIdAndStudentId(id, user.getId());
                return d.map(value -> files.findByDraftIdOrderByIdAsc(value.getId())).orElse(List.of());
            }
            case "submissions": {
                AssignmentSubmission s = require(AssignmentSubmission.class, id);
                Assignment a = require(Assignment.class, s.getAssignmentId());
                Course c = course(a.getCourseId(), false);
                if (write) throw forbidden();
                access(c, user, a.getStatus() == AssignmentStatus.PUBLISHED, false);
                if (!owner(c, user) && !s.getStudentId().equals(user.getId())) throw forbidden();
                return files.findBySubmissionIdOrderByIdAsc(id);
            }
            default: throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy mục đính kèm.");
        }
    }
    @Transactional
    public FileAttachment.View upload(String kind, Long id, MultipartFile upload, UserAccount user) {
        List<FileAttachment> existing = target(kind, id, user, true);
        if (existing.size() >= maxCount)
            throw new ApiException(HttpStatus.CONFLICT, "FILE_LIMIT", "Đã đạt giới hạn " + maxCount + " file.");
        if (upload.isEmpty() || upload.getSize() > maxBytes)
            throw new ApiException(HttpStatus.BAD_REQUEST, "FILE_SIZE", "File rỗng hoặc vượt giới hạn dung lượng.");
        String name = FileValidation.name(upload.getOriginalFilename());
        try {
            byte[] bytes = upload.getBytes();
            String type = FileValidation.type(name, bytes);
            Long draftId = kind.equals("drafts") ? getOrCreateDraft(id, user).getId() : null;
            String key = storage.write(bytes);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) { if (status != STATUS_COMMITTED) removeFile(key); }
            });
            return files.saveAndFlush(new FileAttachment(name, key, type, bytes.length, user.getId(),
                    kind.equals("lessons") ? id : null, kind.equals("assignments") ? id : null, draftId)).view();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_STORAGE_ERROR", "Không thể lưu file. Hãy thử lại.");
        }
    }
    private FileAttachment authorized(Long id, UserAccount user, boolean write) {
        FileAttachment f = require(FileAttachment.class, id);
        String kind; Long targetId;
        if (f.getLessonId() != null) { kind = "lessons"; targetId = f.getLessonId(); }
        else if (f.getAssignmentId() != null) { kind = "assignments"; targetId = f.getAssignmentId(); }
        else if (f.getDraftId() != null) {
            EssayDraft d = require(EssayDraft.class, f.getDraftId());
            if (!d.getStudentId().equals(user.getId())) throw forbidden();
            kind = "drafts"; targetId = d.getAssignmentId();
        } else { kind = "submissions"; targetId = f.getSubmissionId(); }
        if (target(kind, targetId, user, write).stream().noneMatch(item -> item.getId().equals(id))) throw forbidden();
        return f;
    }
    public Download download(Long id, UserAccount user) {
        FileAttachment f = authorized(id, user, false);
        var path = storage.path(f.getStorageKey());
        if (!Files.isRegularFile(path)) throw new ApiException(HttpStatus.NOT_FOUND, "FILE_MISSING", "File không còn trên máy chủ.");
        return new Download(f.view(), new FileSystemResource(path));
    }
    @Transactional
    public void delete(Long id, UserAccount user) {
        FileAttachment f = authorized(id, user, true);
        files.delete(f);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { removeFile(f.getStorageKey()); }
        });
    }
    private void removeFile(String key) {
        try { storage.delete(key); }
        catch (IOException e) { LoggerFactory.getLogger(getClass()).warn("Xóa file thất bại; bộ dọn định kỳ sẽ thử lại", e); }
    }
}
