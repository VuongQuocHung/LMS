package vn.edu.lms.assignment;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "assignments")
public class Assignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssignmentType type;

    @Column(name = "open_at")
    private Instant openAt;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "max_score", nullable = false)
    private Double maxScore = 10.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssignmentStatus status = AssignmentStatus.DRAFT;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Assignment() {}

    public Assignment(Long courseId, String title, String description, AssignmentType type,
                      Instant openAt, Instant dueAt, Double maxScore, AssignmentStatus status) {
        this.courseId = courseId;
        this.title = title;
        this.description = description;
        this.type = type;
        this.openAt = openAt;
        this.dueAt = dueAt;
        this.maxScore = maxScore != null ? maxScore : 10.0;
        this.status = status != null ? status : AssignmentStatus.DRAFT;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getCourseId() { return courseId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public AssignmentType getType() { return type; }
    public Instant getOpenAt() { return openAt; }
    public Instant getDueAt() { return dueAt; }
    public Double getMaxScore() { return maxScore; }
    public AssignmentStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }

    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setType(AssignmentType type) { this.type = type; }
    public void setOpenAt(Instant openAt) { this.openAt = openAt; }
    public void setDueAt(Instant dueAt) { this.dueAt = dueAt; }
    public void setMaxScore(Double maxScore) { this.maxScore = maxScore; }
    public void setStatus(AssignmentStatus status) { this.status = status; }
}
