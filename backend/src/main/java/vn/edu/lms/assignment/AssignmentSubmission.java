package vn.edu.lms.assignment;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "assignment_submissions")
public class AssignmentSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(columnDefinition = "TEXT")
    private String content;

    private Double score;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubmissionStatus status;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt = Instant.now();

    @Column(name = "graded_at")
    private Instant gradedAt;

    @Column(name = "graded_by")
    private Long gradedBy;

    protected AssignmentSubmission() {}

    public AssignmentSubmission(Long assignmentId, Long studentId, String content, SubmissionStatus status) {
        this.assignmentId = assignmentId;
        this.studentId = studentId;
        this.content = content;
        this.status = status;
        this.submittedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getAssignmentId() { return assignmentId; }
    public Long getStudentId() { return studentId; }
    public String getContent() { return content; }
    public Double getScore() { return score; }
    public String getFeedback() { return feedback; }
    public SubmissionStatus getStatus() { return status; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getGradedAt() { return gradedAt; }
    public Long getGradedBy() { return gradedBy; }

    public void setContent(String content) { this.content = content; }
    public void setScore(Double score) { this.score = score; }
    public void setFeedback(String feedback) { this.feedback = feedback; }
    public void setStatus(SubmissionStatus status) { this.status = status; }
    public void setGradedAt(Instant gradedAt) { this.gradedAt = gradedAt; }
    public void setGradedBy(Long gradedBy) { this.gradedBy = gradedBy; }
}
