package vn.edu.lms.progress;

import java.time.Instant;
import java.util.List;

public final class ProgressDtos {
    private ProgressDtos() {}

    public record LessonProgressView(
            Long lessonId,
            boolean completed,
            Instant completedAt
    ) {}

    public record CourseProgressView(
            Long courseId,
            int totalLessons,
            int completedLessons,
            double percentage,
            List<LessonProgressView> lessonProgress
    ) {}

    public record ToggleProgressRequest(
            boolean completed
    ) {}
}
