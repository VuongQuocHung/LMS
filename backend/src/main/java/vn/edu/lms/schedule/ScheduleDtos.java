package vn.edu.lms.schedule;

import java.time.Instant;
import java.util.List;
import vn.edu.lms.assignment.AssignmentType;
import vn.edu.lms.assignment.SubmissionStatus;

public final class ScheduleDtos {
    private ScheduleDtos() {}

    public record ScheduleItem(
            Long assignmentId,
            Long courseId,
            String courseTitle,
            String title,
            AssignmentType type,
            Instant openAt,
            Instant dueAt,
            Double maxScore,
            Boolean submitted,
            Double score,
            SubmissionStatus status
    ) {}

    public record ScheduleView(
            List<ScheduleItem> upcoming,
            List<ScheduleItem> past
    ) {}
}
