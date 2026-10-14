package vn.edu.lms.file;

import jakarta.persistence.*;

@Entity
@Table(name = "essay_drafts")
public class EssayDraft {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;
    @Column(name = "student_id", nullable = false)
    private Long studentId;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content = "";
    protected EssayDraft() {}
    public EssayDraft(Long assignmentId, Long studentId) {
        this.assignmentId = assignmentId;
        this.studentId = studentId;
    }
    public Long getId() { return id; }
    public Long getAssignmentId() { return assignmentId; }
    public Long getStudentId() { return studentId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
