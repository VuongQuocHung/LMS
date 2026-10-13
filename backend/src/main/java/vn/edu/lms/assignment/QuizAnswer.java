package vn.edu.lms.assignment;

import jakarta.persistence.*;

@Entity
@Table(name = "quiz_answers")
public class QuizAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "selected_option_id")
    private Long selectedOptionId;

    protected QuizAnswer() {}

    public QuizAnswer(Long submissionId, Long questionId, Long selectedOptionId) {
        this.submissionId = submissionId;
        this.questionId = questionId;
        this.selectedOptionId = selectedOptionId;
    }

    public Long getId() { return id; }
    public Long getSubmissionId() { return submissionId; }
    public Long getQuestionId() { return questionId; }
    public Long getSelectedOptionId() { return selectedOptionId; }

    public void setSelectedOptionId(Long selectedOptionId) { this.selectedOptionId = selectedOptionId; }
}
