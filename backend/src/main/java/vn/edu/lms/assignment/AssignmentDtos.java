package vn.edu.lms.assignment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class AssignmentDtos {
    private AssignmentDtos() {}

    public record AssignmentView(
            Long id,
            Long courseId,
            String title,
            String description,
            AssignmentType type,
            Instant openAt,
            Instant dueAt,
            Double maxScore,
            AssignmentStatus status,
            Instant createdAt,
            Integer submissionCount,
            Boolean mySubmitted,
            Double myScore,
            SubmissionStatus mySubmissionStatus
    ) {
        public static AssignmentView from(Assignment a, Integer submissionCount,
                                          Boolean mySubmitted, Double myScore, SubmissionStatus mySubmissionStatus) {
            return new AssignmentView(
                    a.getId(),
                    a.getCourseId(),
                    a.getTitle(),
                    a.getDescription(),
                    a.getType(),
                    a.getOpenAt(),
                    a.getDueAt(),
                    a.getMaxScore(),
                    a.getStatus(),
                    a.getCreatedAt(),
                    submissionCount,
                    mySubmitted,
                    myScore,
                    mySubmissionStatus
            );
        }
    }

    public record CreateAssignment(
            @NotBlank(message = "Tiêu đề không được để trống.")
            @Size(max = 200, message = "Tiêu đề không quá 200 ký tự.")
            String title,

            @NotBlank(message = "Mô tả bài tập không được để trống.")
            String description,

            @NotNull(message = "Loại bài tập không được để trống.")
            AssignmentType type,

            Instant openAt,
            Instant dueAt,
            Double maxScore,
            AssignmentStatus status
    ) {}

    public record UpdateAssignment(
            @NotBlank(message = "Tiêu đề không được để trống.")
            @Size(max = 200, message = "Tiêu đề không quá 200 ký tự.")
            String title,

            @NotBlank(message = "Mô tả bài tập không được để trống.")
            String description,

            Instant openAt,
            Instant dueAt,
            Double maxScore,
            AssignmentStatus status
    ) {}

    public record QuizOptionView(
            Long id,
            Long questionId,
            String optionText,
            Boolean isCorrect,
            Integer position
    ) {
        public static QuizOptionView from(QuizOption o, boolean revealAnswer) {
            return new QuizOptionView(
                    o.getId(),
                    o.getQuestionId(),
                    o.getOptionText(),
                    revealAnswer ? o.isCorrect() : null,
                    o.getPosition()
            );
        }
    }

    public record QuizQuestionView(
            Long id,
            Long assignmentId,
            String questionText,
            Double points,
            Integer position,
            List<QuizOptionView> options
    ) {
        public static QuizQuestionView from(QuizQuestion q, List<QuizOption> options, boolean revealAnswer) {
            List<QuizOptionView> optionViews = options.stream()
                    .map(o -> QuizOptionView.from(o, revealAnswer))
                    .toList();
            return new QuizQuestionView(
                    q.getId(),
                    q.getAssignmentId(),
                    q.getQuestionText(),
                    q.getPoints(),
                    q.getPosition(),
                    optionViews
            );
        }
    }

    public record CreateQuizOption(
            @NotBlank(message = "Nội dung phương án không được để trống.")
            String optionText,
            boolean isCorrect,
            Integer position
    ) {}

    public record CreateQuizQuestion(
            @NotBlank(message = "Nội dung câu hỏi không được để trống.")
            String questionText,
            Double points,
            Integer position,
            @NotNull List<CreateQuizOption> options
    ) {}

    public record SubmitQuizRequest(
            @NotNull Map<Long, Long> answers
    ) {}

    public record SubmitEssayRequest(
            @NotBlank(message = "Nội dung bài làm không được để trống.")
            String content
    ) {}

    public record GradeSubmissionRequest(
            @NotNull(message = "Điểm số không được để trống.")
            Double score,
            String feedback
    ) {}

    public record QuizAnswerDetailView(
            Long questionId,
            String questionText,
            Double points,
            Long selectedOptionId,
            String selectedOptionText,
            Long correctOptionId,
            String correctOptionText,
            Boolean isCorrect
    ) {}

    public record SubmissionView(
            Long id,
            Long assignmentId,
            Long studentId,
            String studentName,
            String studentEmail,
            String studentCode,
            String content,
            Double score,
            Double maxScore,
            String feedback,
            SubmissionStatus status,
            Instant submittedAt,
            Instant gradedAt,
            List<QuizAnswerDetailView> quizAnswers
    ) {}

    public record GradebookEntry(
            Long studentId,
            String studentName,
            String studentEmail,
            String studentCode,
            Map<Long, SubmissionScoreView> scores
    ) {}

    public record SubmissionScoreView(
            Long submissionId,
            Double score,
            Double maxScore,
            SubmissionStatus status,
            Instant submittedAt
    ) {}

    public record GradebookView(
            Long courseId,
            List<AssignmentView> assignments,
            List<GradebookEntry> entries
    ) {}
}
