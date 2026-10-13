package vn.edu.lms.progress;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "lesson_progress")
public class LessonProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private boolean completed = true;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt = Instant.now();

    protected LessonProgress() {}

    public LessonProgress(Long lessonId, Long studentId, boolean completed) {
        this.lessonId = lessonId;
        this.studentId = studentId;
        this.completed = completed;
        this.completedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getLessonId() { return lessonId; }
    public Long getStudentId() { return studentId; }
    public boolean isCompleted() { return completed; }
    public Instant getCompletedAt() { return completedAt; }

    public void setCompleted(boolean completed) {
        this.completed = completed;
        this.completedAt = Instant.now();
    }
}
